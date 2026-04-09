# Digest Generation Pipeline

This document explains how Postmail builds a daily digest, from scraping the web to delivering essays and article summaries to the user.

## Overview

Each digest is built by a **LangGraph agent** — a directed acyclic graph (DAG) where each node is a processing step. The pipeline has two parallel tracks:

- **Track 1 (Dispatches):** Curate and summarize 7-10 web articles into 2-sentence "sparks"
- **Track 2 (Essays):** Research topics, gather sources, and generate 2-3 original long-form essays

Both tracks start from the same pool of scored articles and converge at the end.

## Trigger

Digests are triggered two ways:
1. **User request** — `POST /api/digests/generate` with optional `intent` parameter
2. **Daily cron** — APScheduler runs `run_daily_digest()` at 06:00 UTC for all onboarded users

Generation intents:
- `balanced` — Default mix of interests
- `go_deeper` — Weight toward topics the user has read most
- `surprise_me` — Introduce unfamiliar topics
- `new_territory` — Actively avoid recently covered topics

## Pipeline Steps

### Step 1: Fetcher

**What it does:** Scrapes Hacker News for raw story URLs and titles.

**Sources:** Top stories, best stories, and new stories feeds (~50 stories total).

**Output:** `raw_items` — list of URLs and titles to process.

**Why Hacker News:** It's a free, high-quality, API-accessible feed of intellectual content spanning tech, science, philosophy, and culture. No API key needed.

### Step 2: Extractor

**What it does:** Scrapes full article text from each URL, then batch-summarizes with the LLM.

**How:**
1. Concurrent HTTP fetches using `httpx` (with timeout/retry)
2. `newspaper4k` extracts article body text from HTML
3. LLM generates a structured summary: title, 2-sentence summary, category

**Output:** `extracted_items` — articles with full text, summaries, and categories.

**Failure handling:** If a URL fails to scrape (paywall, timeout, 404), it's silently dropped. The pipeline continues with whatever succeeded.

### Step 3: Quality Filter

**What it does:** LLM scores each article 0-1 on intellectual depth, novelty, and substance.

**Threshold:** Articles scoring below 0.4 are dropped. This removes clickbait, shallow listicles, and press releases.

**Output:** `scored_items` — articles that passed the quality bar, sorted by score.

### Step 4: Relevance Matcher

**What it does:** Matches articles to the user's interests using embedding similarity.

**How:**
1. Each article has an embedding (from the extractor step)
2. Each user interest has an embedding (from onboarding)
3. Cosine similarity between every article and every interest
4. Top 3 articles are guaranteed (highest match scores)
5. Remaining 7 are sampled with probability weighted by relevance score

**Why sampling:** Pure top-N selection would always return the same types of articles. Weighted sampling introduces serendipity while still favoring relevant content.

**Output:** `matched_articles` — 10 articles matched to the user's interests.

### Step 5: Composer Dispatch (Track 1)

**What it does:** Converts each matched article into a 2-sentence "spark" — a concise summary designed to hook the reader.

**Spark templates** (rotated for variety):
1. **Fact-led** — Opens with the most surprising fact
2. **Contrast-led** — Opens with a tension or paradox
3. **Person-led** — Opens with a person and their action
4. **Implication-led** — Opens with what this means for the reader

**Output:** `dispatch_articles` — the final article sparks that appear in the digest.

### Step 6: Research Agent (Track 2, Phase 1)

**What it does:** Selects essay topics and plans research.

**Topic selection:**
- LLM picks 7-10 topics based on user interests and generation intent
- Sub-domain rotation prevents repeating the same angle within 7 days
- 7 angle types: historical origin, modern research, counterintuitive finding, cross-cultural comparison, practical application, established critique, niche deep-dive
- Banned topics: pop-science cliches (trolley problem as intro, "quantum explains consciousness", etc.)

**Output:** `research_topics` — topics with angles and exclusion rules.

### Step 7: Research Agent (Phase 2)

**What it does:** Gathers real sources for each essay topic from free APIs.

**Sources (all free, no API keys except YouTube):**
- Stanford Encyclopedia of Philosophy (SEP)
- Wikipedia (via REST API)
- YouTube transcripts (via `youtube-transcript-api`)
- arXiv (academic papers)
- Open Library (book metadata)
- Project Gutenberg (public domain texts)
- Web search fallback

**Relevance scoring:** After gathering, each source is embedded and scored against the topic. Sources below a 0.35 cosine similarity threshold are dropped (but at least 2 are kept).

**Output:** `research_bundles` — topics paired with vetted sources.

### Step 8: Composer Essays

**What it does:** LLM writes full essays using the research bundles.

**Two LLM calls per essay:**
1. **Outline call** — Generates structure, thesis, section headings
2. **Full body call** — Writes the complete essay in Markdown

**Voice personas** (rotated per essay):
1. Narrative journalist — story-driven, scene-setting
2. Public intellectual — argument-driven, citation-heavy
3. Case-study essayist — one example examined deeply
4. Friendly-letter writer — conversational, first-person
5. Cultural critic — analytical, pattern-finding

**Constraints:**
- 1500-1800 words (~7-8 min read)
- Must include thesis statement
- Must embed 3-5 sources naturally (not as a bibliography dump)
- Banned openings: "Imagine...", "What if...", "In today's...", "Picture this..."
- Length tier: `deep_dive` (default) or `quick_read` (~750 words)

**Output:** `raw_essays` — complete essays with metadata.

### Step 9: Diversity Checker

**What it does:** Ensures the digest has variety.

**Checks:**
- No two essays in the same digest cover the same topic
- No topic+angle combination repeated within the last 7 days (checked against `topic_history` table)
- If duplicates found, the lower-quality one is dropped

**Output:** `essays` — deduplicated essay list.

### Step 10: Digest Assembler

**What it does:** Saves everything to the database and marks the digest complete.

**Actions:**
1. Validates that both tracks produced output
2. Saves articles with embeddings to `articles` table
3. Saves essays with embeddings and sources to `essays` and `research_sources` tables
4. Records topics to `topic_history` for future dedup
5. Updates digest status: `building` → `complete`
6. Publishes final SSE event

**Failure handling:** If either track produced zero results, the digest is marked `failed` with an error message.

## Real-Time Progress (SSE)

Throughout the pipeline, each node publishes status events:

```python
event_bus.publish(user_id, "status", {
    "stage": "extractor",
    "progress": 45,
    "message": "extracting articles (23/50)..."
})
```

The frontend's Pressroom page connects via `EventSource` to `/api/stream/digest` and renders a live progress bar with stage labels.

## State Management

The pipeline uses LangGraph's `DigestState` (a TypedDict with `operator.add` reducers) to pass data between nodes. Each node reads from and appends to shared state keys. Parallel branches (Track 1 and Track 2) write to different keys so there's no conflict.

## Error Recovery

- **Stale digests:** On server startup, any digests stuck in `building` status are marked `failed` (they were interrupted by a crash/restart).
- **Node failures:** Individual nodes catch exceptions and either skip the failed item or abort the pipeline with a `failed` status.
- **LLM failures:** Groq API errors are retried once, then the item is skipped.
- **Scraping failures:** URLs that fail to scrape are silently dropped; the pipeline continues with whatever succeeded.
