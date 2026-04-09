"""Phase 2 source fetchers — zero LLM calls, all free APIs."""

import asyncio
import logging
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

FETCH_TIMEOUT = 15.0


class Source(BaseModel):
    title: str
    author: str | None = None
    year: str | None = None
    source_type: str
    url: str
    excerpt: str
    relevance_note: str | None = None
    relevance_score: float = 0.0  # set by score_sources()


# ---------------------------------------------------------------------------
# A) Stanford Encyclopedia of Philosophy
# ---------------------------------------------------------------------------

async def fetch_sep(query: str) -> Source | None:
    """Search SEP and extract the preamble from the first entry."""
    try:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(
                "https://plato.stanford.edu/search/searcher.py",
                params={"query": query},
            )
            resp.raise_for_status()

            # Find the first /entries/ link
            soup = BeautifulSoup(resp.text, "html.parser")
            link = None
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"]
                if "/entries/" in href:
                    # Normalize to full URL
                    if href.startswith("http"):
                        link = href
                    elif href.startswith("/"):
                        link = f"https://plato.stanford.edu{href}"
                    else:
                        link = f"https://plato.stanford.edu/{href}"
                    break

            if not link:
                return None

            entry_resp = await client.get(link)
            entry_resp.raise_for_status()

            entry_soup = BeautifulSoup(entry_resp.text, "html.parser")
            preamble = entry_soup.find("div", id="preamble")
            if not preamble:
                preamble = entry_soup.find("div", id="aueditable")
            if not preamble:
                # Try main-text as last resort
                preamble = entry_soup.find("div", id="main-text")
            if not preamble:
                return None

            text = preamble.get_text(separator=" ", strip=True)
            if len(text) < 100:
                return None

            title_tag = entry_soup.find("h1")
            title = title_tag.get_text(strip=True) if title_tag else query.title()

            return Source(
                title=title,
                source_type="encyclopedia",
                url=str(entry_resp.url),
                excerpt=text[:1200],
            )
    except Exception as e:
        logger.warning("SEP fetch failed for %r: %s", query, e)
        return None


# ---------------------------------------------------------------------------
# B) Semantic Scholar
# ---------------------------------------------------------------------------

async def fetch_semantic_scholar(query: str) -> list[Source]:
    """Search Semantic Scholar for academic papers with retry on 429."""
    sources: list[Source] = []
    try:
        async with httpx.AsyncClient(
            timeout=FETCH_TIMEOUT,
            headers={"User-Agent": "Postmail/0.1"},
        ) as client:
            resp = None
            for attempt in range(3):
                resp = await client.get(
                    "https://api.semanticscholar.org/graph/v1/paper/search",
                    params={
                        "query": query,
                        "limit": 5,
                        "fields": "title,authors,year,abstract,url",
                    },
                )
                if resp.status_code == 429:
                    wait = 3 + 2 ** attempt * 3
                    logger.debug("Semantic Scholar 429, waiting %ds", wait)
                    await asyncio.sleep(wait)
                    continue
                break

            if resp is None:
                return sources
            resp.raise_for_status()
            data = resp.json()

            for paper in data.get("data", []):
                abstract = paper.get("abstract") or ""
                if len(abstract) < 100:
                    continue

                authors = paper.get("authors") or []
                author_str = authors[0].get("name") if authors else None

                sources.append(Source(
                    title=paper.get("title", "Untitled"),
                    author=author_str,
                    year=str(paper["year"]) if paper.get("year") else None,
                    source_type="paper",
                    url=paper.get("url", ""),
                    excerpt=abstract[:1000],
                ))
    except Exception as e:
        logger.warning("Semantic Scholar fetch failed for %r: %s", query, e)

    return sources


# ---------------------------------------------------------------------------
# C) YouTube Transcript
# ---------------------------------------------------------------------------

async def fetch_youtube_transcript(query: str) -> Source | None:
    """Search YouTube for a lecture and fetch its transcript."""
    api_key = settings.youtube_api_key
    if not api_key:
        logger.debug("No YouTube API key configured, skipping")
        return None

    try:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "q": f"{query} lecture",
                    "type": "video",
                    "videoDuration": "long",
                    "maxResults": 5,
                    "key": api_key,
                    "relevanceLanguage": "en",
                    "part": "snippet",
                },
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])

        from youtube_transcript_api import YouTubeTranscriptApi

        for item in items:
            video_id = item["id"]["videoId"]
            title = item["snippet"]["title"]
            channel = item["snippet"]["channelTitle"]

            try:
                transcript_parts = YouTubeTranscriptApi.get_transcript(video_id)
                full_text = " ".join(p["text"] for p in transcript_parts)

                if len(full_text) < 200:
                    continue

                # Skip intros — start at 20% mark
                start = len(full_text) // 5
                excerpt = full_text[start:start + 1500]

                return Source(
                    title=title,
                    author=channel,
                    source_type="lecture",
                    url=f"https://www.youtube.com/watch?v={video_id}",
                    excerpt=excerpt,
                )
            except Exception:
                continue

    except Exception as e:
        logger.warning("YouTube transcript fetch failed for %r: %s", query, e)

    return None


# ---------------------------------------------------------------------------
# D) Wikipedia
# ---------------------------------------------------------------------------

async def fetch_wikipedia(query: str) -> Source | None:
    """Fetch Wikipedia summary — always search first, then get summary."""
    ua = "Postmail/0.1 (https://github.com/postmail; aariyagage@gmail.com) python-httpx"
    try:
        async with httpx.AsyncClient(
            timeout=FETCH_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": ua, "Api-User-Agent": ua},
        ) as client:
            # Always use search API to find the right page title
            search_resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": query,
                    "srlimit": 1,
                    "format": "json",
                },
            )
            search_resp.raise_for_status()
            results = search_resp.json().get("query", {}).get("search", [])
            if not results:
                return None

            page_title = results[0]["title"]

            # Use the page title (properly encoded) for the summary endpoint
            resp = await client.get(
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(page_title, safe='')}",
            )
            resp.raise_for_status()
            data = resp.json()

            extract = data.get("extract", "")
            if len(extract) < 100:
                return None

            return Source(
                title=data.get("title", query.title()),
                source_type="wiki",
                url=data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                excerpt=extract[:1200],
            )
    except Exception as e:
        logger.warning("Wikipedia fetch failed for %r: %s", query, e)
        return None


# ---------------------------------------------------------------------------
# E) Open Library — book excerpts and descriptions
# ---------------------------------------------------------------------------

async def fetch_open_library(query: str) -> list[Source]:
    """Search Open Library for relevant books and extract descriptions."""
    sources: list[Source] = []
    try:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(
                "https://openlibrary.org/search.json",
                params={"q": query, "limit": 5, "fields": "key,title,author_name,first_publish_year,subject,first_sentence,edition_key"},
            )
            resp.raise_for_status()
            docs = resp.json().get("docs", [])

            for doc in docs[:5]:
                title = doc.get("title", "")
                author = doc.get("author_name", [None])[0]
                year = doc.get("first_publish_year")

                # Try to get a description from the work page
                work_key = doc.get("key", "")
                excerpt = ""
                if work_key:
                    work_resp = await client.get(f"https://openlibrary.org{work_key}.json")
                    if work_resp.status_code == 200:
                        work_data = work_resp.json()
                        desc = work_data.get("description", "")
                        if isinstance(desc, dict):
                            desc = desc.get("value", "")
                        excerpt = str(desc)[:1200] if desc else ""

                # Fall back to first_sentence
                if not excerpt:
                    first_sentence = doc.get("first_sentence", [])
                    if first_sentence:
                        excerpt = first_sentence[0] if isinstance(first_sentence, list) else str(first_sentence)

                if len(excerpt) < 50:
                    continue

                sources.append(Source(
                    title=title,
                    author=author,
                    year=str(year) if year else None,
                    source_type="book",
                    url=f"https://openlibrary.org{work_key}",
                    excerpt=excerpt,
                ))
                if len(sources) >= 3:
                    break
    except Exception as e:
        logger.warning("Open Library fetch failed for %r: %s", query, e)
    return sources


# ---------------------------------------------------------------------------
# F) Project Gutenberg — classic texts
# ---------------------------------------------------------------------------

async def fetch_gutenberg(query: str) -> list[Source]:
    """Search Project Gutenberg for classic/public-domain texts."""
    sources: list[Source] = []
    try:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(
                "https://gutendex.com/books/",
                params={"search": query, "languages": "en"},
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])

            for book in results[:5]:
                title = book.get("title", "")
                authors = book.get("authors", [])
                author = authors[0].get("name") if authors else None
                book_id = book.get("id")

                if not book_id:
                    continue

                # Fetch the first ~1200 chars of the actual text
                text_url = f"https://www.gutenberg.org/files/{book_id}/{book_id}-0.txt"
                try:
                    text_resp = await client.get(text_url)
                    if text_resp.status_code != 200:
                        # Try alternate URL format
                        text_resp = await client.get(
                            f"https://www.gutenberg.org/cache/epub/{book_id}/pg{book_id}.txt"
                        )
                    if text_resp.status_code != 200:
                        continue

                    full_text = text_resp.text
                    # Skip the Gutenberg header (usually ends with ***)
                    start_marker = full_text.find("***")
                    if start_marker != -1:
                        second_marker = full_text.find("***", start_marker + 3)
                        if second_marker != -1:
                            full_text = full_text[second_marker + 3:]

                    # Get a meaningful excerpt (skip blank lines at start)
                    full_text = full_text.strip()
                    if len(full_text) < 200:
                        continue

                    excerpt = full_text[:1200]

                    sources.append(Source(
                        title=title,
                        author=author,
                        source_type="book",
                        url=f"https://www.gutenberg.org/ebooks/{book_id}",
                        excerpt=excerpt,
                    ))
                    if len(sources) >= 2:
                        break
                except Exception:
                    continue
    except Exception as e:
        logger.warning("Gutenberg fetch failed for %r: %s", query, e)
    return sources


# ---------------------------------------------------------------------------
# G) DuckDuckGo Web Search — free, no API key, real web content
# ---------------------------------------------------------------------------

async def fetch_web_search(query: str) -> list[Source]:
    """Search DuckDuckGo HTML and extract snippets from top results."""
    sources: list[Source] = []
    try:
        async with httpx.AsyncClient(
            timeout=FETCH_TIMEOUT,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
        ) as client:
            resp = await client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
            )
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")
            results = soup.find_all("div", class_="result__body")

            for result in results[:5]:
                title_tag = result.find("a", class_="result__a")
                snippet_tag = result.find("a", class_="result__snippet")

                if not title_tag or not snippet_tag:
                    continue

                title = title_tag.get_text(strip=True)
                snippet = snippet_tag.get_text(strip=True)
                href = title_tag.get("href", "")

                if len(snippet) < 50:
                    continue

                # Skip wikipedia/SEP since we already fetch those directly
                if "wikipedia.org" in href or "plato.stanford.edu" in href:
                    continue

                sources.append(Source(
                    title=title,
                    source_type="web",
                    url=href,
                    excerpt=snippet[:1200],
                ))
                if len(sources) >= 3:
                    break
    except Exception as e:
        logger.warning("DuckDuckGo search failed for %r: %s", query, e)
    return sources


# ---------------------------------------------------------------------------
# Source relevance scoring — embedding-based filtering
# ---------------------------------------------------------------------------

RELEVANCE_THRESHOLD = 0.35  # sources below this are dropped


async def score_sources(
    sources: list[Source],
    topic: str,
    thesis: str,
) -> list[Source]:
    """Score each source's relevance to the topic+thesis using cosine similarity.

    Returns sources sorted by relevance, with low-relevance ones removed.
    """
    if not sources:
        return []

    from app.services.embeddings import embed_batch

    # Build the reference text from topic + thesis
    reference = f"{topic}. {thesis}"

    # Build texts: reference first, then each source's title + excerpt
    texts = [reference]
    for s in sources:
        # Use title + first 300 chars of excerpt for scoring
        source_text = f"{s.title}. {(s.excerpt or '')[:300]}"
        texts.append(source_text)

    try:
        embeddings = await embed_batch(texts)
    except Exception as e:
        logger.warning("Source relevance scoring failed: %s", e)
        # Can't score — return all sources unfiltered
        return sources

    import math

    ref_vec = embeddings[0]
    ref_norm = math.sqrt(sum(x * x for x in ref_vec))
    if ref_norm == 0:
        return sources

    scored: list[Source] = []
    for i, source in enumerate(sources):
        src_vec = embeddings[i + 1]
        src_norm = math.sqrt(sum(x * x for x in src_vec))
        if src_norm == 0:
            continue
        dot = sum(a * b for a, b in zip(ref_vec, src_vec))
        similarity = dot / (ref_norm * src_norm)
        source.relevance_score = similarity
        scored.append(source)

    # Sort by relevance (highest first) and filter
    scored.sort(key=lambda s: s.relevance_score, reverse=True)
    kept = [s for s in scored if s.relevance_score >= RELEVANCE_THRESHOLD]

    if kept:
        dropped = len(scored) - len(kept)
        if dropped:
            logger.info(
                "Dropped %d/%d sources below %.2f relevance for '%s'",
                dropped, len(scored), RELEVANCE_THRESHOLD, topic,
            )
    else:
        # If nothing passes threshold, keep top 2 anyway so we don't lose everything
        kept = scored[:2]
        logger.warning(
            "No sources above %.2f for '%s', keeping top %d",
            RELEVANCE_THRESHOLD, topic, len(kept),
        )

    return kept
