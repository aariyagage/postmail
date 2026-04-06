"""Extractor node — scrapes real article text before LLM summarization."""

import asyncio
import logging

from app.agents.state import DigestState
from app.schemas.items import ExtractedItem
from app.services import embeddings, llm
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)

BATCH_SIZE = 10


async def _scrape_article(url: str) -> tuple[str, bool]:
    """Try to scrape full article text. Returns (text, paywall)."""
    loop = asyncio.get_running_loop()
    try:
        from newspaper import Article

        article = Article(url)
        await loop.run_in_executor(None, article.download)
        await loop.run_in_executor(None, article.parse)
        text = article.text or ""
        if len(text) > 200:
            return text[:3000], False
    except Exception as e:
        logger.debug("newspaper4k failed for %s: %s", url, e)

    return "", True


async def _scrape_all(raw_items: list) -> list[tuple[str, bool]]:
    """Scrape all articles concurrently."""
    return await asyncio.gather(*[_scrape_article(item.url) for item in raw_items])


async def _extract_batch(batch: list, texts: list[tuple[str, bool]], batch_offset: int) -> list[dict]:
    """Summarize a batch using real article text when available."""
    items_text = ""
    for i, item in enumerate(batch):
        full_text, is_paywall = texts[batch_offset + i]
        if full_text:
            content = full_text[:500]
        elif item.raw_content:
            content = item.raw_content[:500]
        else:
            content = "(title only — no full text available)"

        items_text += f"- [{i+1}] Title: {item.title} | Source: {item.source_name} | Content: {content}\n"

    try:
        result = await llm.complete_json(
            f"Summarize each article in 2-3 sentences and assign a category "
            f"(Technology, Science, Business, Culture, Politics, Other).\n\n{items_text}",
            system="You are a news editor. Return a JSON object with key \"articles\": an array of objects with keys: "
                   "\"index\" (1-based), \"summary\", \"category\"."
        )
        return result if isinstance(result, list) else result.get("articles", result.get("items", []))
    except Exception as e:
        logger.warning("LLM extraction batch failed: %s", e)
        return [{"index": i + 1, "summary": item.title, "category": "Other"} for i, item in enumerate(batch)]


async def extractor(state: DigestState) -> dict:
    """Extract summaries and categories from raw items using real text + LLM, then embed."""
    await event_bus.publish(state["user_id"], "status", {"stage": "extractor", "progress": 0, "message": "Scraping articles..."})

    raw_items = state.get("raw_items", [])
    if not raw_items:
        return {"extracted_items": []}

    # Step 1: scrape all articles concurrently
    scraped = await _scrape_all(raw_items)

    await event_bus.publish(state["user_id"], "status", {"stage": "extractor", "progress": 40, "message": "Summarizing articles..."})

    # Step 2: LLM summarization with real text
    batches = [raw_items[i:i + BATCH_SIZE] for i in range(0, len(raw_items), BATCH_SIZE)]
    batch_offsets = [i * BATCH_SIZE for i in range(len(batches))]
    batch_results = await asyncio.gather(
        *[_extract_batch(b, scraped, offset) for b, offset in zip(batches, batch_offsets)]
    )

    extracted: list[ExtractedItem] = []
    for batch_idx, (batch, summaries) in enumerate(zip(batches, batch_results)):
        for item_data in summaries:
            idx = item_data.get("index", 0) - 1
            if 0 <= idx < len(batch):
                raw = batch[idx]
                extracted.append(ExtractedItem(
                    url=raw.url,
                    title=raw.title,
                    source_name=raw.source_name,
                    published_at=raw.published_at,
                    summary=item_data.get("summary", raw.title),
                    category=item_data.get("category", "Other"),
                ))

    await event_bus.publish(state["user_id"], "status", {"stage": "extractor", "progress": 80, "message": f"Summarized {len(extracted)} articles, embedding..."})

    # Step 3: embed
    try:
        texts = [f"{item.title}. {item.summary}" for item in extracted]
        vecs = await embeddings.embed_batch(texts)
        for item, vec in zip(extracted, vecs):
            item.embedding = vec
    except Exception as e:
        logger.warning("Embedding failed: %s", e)

    await event_bus.publish(state["user_id"], "status", {"stage": "extractor", "progress": 100, "message": f"Extracted {len(extracted)} articles"})
    return {"extracted_items": extracted}
