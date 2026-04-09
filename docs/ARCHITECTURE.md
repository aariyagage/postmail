# Postmail Architecture

Postmail is a personalized intellectual daily digest that curates articles from the web and generates original long-form essays tailored to each user's interests. It runs on two tracks: **dispatches** (curated article summaries) and **essays** (AI-generated long-form writing backed by real sources).

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  Vercel  ·  Supabase Auth  ·  SSE streaming  ·  Tailwind│
└──────────────────────┬──────────────────────────────────┘
                       │  /api/* proxy (rewrites)
                       │  + direct SSE connection
┌──────────────────────▼──────────────────────────────────┐
│                   Backend (FastAPI)                       │
│  Render  ·  LangGraph agent  ·  Groq LLM  ·  APScheduler│
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
    PostgreSQL    Hugging Face     Groq API
    + pgvector    Inference API    (Llama 3.3 70B)
    (Supabase)    (embeddings)     (generation)
```

## Frontend

**Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase Auth (`@supabase/ssr`)

**Design:** Vintage zine/postage-stamp aesthetic — anti-grid layouts, monospace + serif type, parenthetical labels, muted earth tones. Not a conventional SaaS look.

### Pages

| Route | Purpose |
|---|---|
| `/landing` | Public marketing page |
| `/onboarding` | Multi-step signup: auth (email or Google) then interest selection (3-7 topics) |
| `/login` | Email/password and Google OAuth sign-in |
| `/` | Home feed — today's digest with essays and article sparks |
| `/pressroom` | Real-time digest generation with SSE progress streaming |
| `/library` | Archive of all past digests |
| `/saved` | Bookmarked essays and articles |
| `/search` | Semantic search across all content |
| `/profile` | User settings and interest management |
| `/essay/[id]` | Full essay reader with feedback and recommendations |
| `/article/[id]` | Full article reader |
| `/auth/callback` | Supabase OAuth/email-confirmation redirect handler |

### API Communication

- **Most calls** go through `/api/*` which Next.js rewrites to the backend (server-side proxy, no CORS needed).
- **SSE streaming** connects directly to the backend URL because Next.js rewrites buffer responses, which breaks Server-Sent Events.
- **Server-side metadata** (article/essay `<head>` tags) fetches directly from the backend URL.

All client-side API calls go through `src/lib/api.ts`, which auto-injects the Supabase Bearer token.

## Backend

**Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, LangGraph, Groq, Hugging Face Inference API, APScheduler, SSE-Starlette

### Routers

| Endpoint | Purpose |
|---|---|
| `POST /api/users` | Create user + embed interests during onboarding |
| `GET /api/users/me` | Get current authenticated user |
| `GET /api/digests` | List user's digests |
| `GET /api/digests/{id}` | Get digest with articles and essays |
| `POST /api/digests/generate` | Trigger async digest build |
| `GET /api/essays/{id}` | Get essay with sources |
| `GET /api/essays/{id}/related` | Get related essays (embedding similarity + topic fallback) |
| `GET /api/articles/{id}` | Get article |
| `GET/POST/DELETE /api/bookmarks` | Manage saved content |
| `POST /api/reading/mark-read` | Track reading progress (0-100%) |
| `GET /api/reading/stats` | Reading streaks, counts, time |
| `POST /api/reading/feedback` | "More like this" / "different" signals |
| `GET /api/search?q=...` | Semantic search across essays + articles |
| `GET /api/stream/digest` | SSE endpoint for real-time generation progress |
| `GET /health` | Health check |

### Authentication

JWT-based via Supabase. Two verification modes:

1. **JWKS (ES256)** — Fetches public keys from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Preferred.
2. **HS256 shared secret** — Legacy fallback using `POSTMAIL_SUPABASE_JWT_SECRET`.
3. **Dev mode** — When neither is configured, accepts `X-Dev-User-Id` header.

User lookup: tries `supabase_id` first, falls back to `email` for legacy records, backfills `supabase_id` on match.

## Database

PostgreSQL with pgvector extension. All embeddings are 384-dimensional vectors (from `all-MiniLM-L6-v2`).

### Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | id, supabase_id, email, name, onboarding_complete | User accounts |
| `interests` | user_id, topic, description, embedding | User's selected topics with vector embeddings |
| `digests` | user_id, edition_date, status, headline, big_question | Daily digest container |
| `articles` | digest_id, source_url, title, summary, embedding | Curated article "sparks" |
| `essays` | digest_id, title, body_markdown, thesis, topic, length_tier, embedding | AI-generated long-form essays |
| `research_sources` | essay_id, source_type, title, author, url, excerpt | Sources cited in essays |
| `bookmarks` | user_id, content_type, content_id | Saved essays/articles |
| `read_history` | user_id, content_type, content_id, reading_progress | Reading tracking |
| `topic_history` | user_id, topic, domain, sub_domain, angle | Dedup log for essay diversity |
| `essay_feedback` | user_id, essay_id, signal | "More" / "different" feedback |

### Migrations

Managed by Alembic. Run automatically on backend startup via `start.sh`:
```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Digest Generation Pipeline

The core of Postmail is a **LangGraph agent DAG** that builds each digest. Triggered by user request or daily cron (06:00 UTC).

### Pipeline Flow

```
fetcher ──→ extractor ──→ quality_filter ──→ relevance_matcher
                                                    │
                                    ┌───────────────┴───────────────┐
                                    ▼                               ▼
                          composer_dispatch                  research_agent
                          (Track 1: Sparks)              (Track 2: Essays)
                                    │                               │
                                    │                      composer_essays
                                    │                               │
                                    └───────────────┬───────────────┘
                                                    ▼
                                            diversity_checker
                                                    │
                                            digest_assembler
                                                    │
                                                   END
```

### Node Details

**1. Fetcher** — Scrapes Hacker News (top/best/new stories, ~50 total). Output: raw URLs + titles.

**2. Extractor** — Concurrently scrapes full article text via `newspaper4k`, then batch-summarizes with LLM. Output: title, summary, category per article.

**3. Quality Filter** — LLM scores each article 0-1 on intellectual depth and novelty. Drops anything below 0.4.

**4. Relevance Matcher** — Cosine similarity between article embeddings and user interest embeddings. Guarantees top 3, samples remaining 7 weighted by score.

**5. Composer Dispatch (Track 1)** — Converts matched articles into 2-sentence "sparks" using LLM. Rotates 4 templates: fact-led, contrast-led, person-led, implication-led.

**6. Research Agent (Track 2, Phase 1)** — LLM selects 7-10 essay topics with sub-domain rotation to avoid repeating angles. 7 angle types: historical origin, modern research, counterintuitive, cross-cultural, practical, critique, niche. Bans pop-science cliches.

**7. Research Agent (Phase 2)** — Concurrent source gathering from free APIs: Stanford Encyclopedia of Philosophy, Wikipedia, YouTube transcripts, arXiv, Open Library, Project Gutenberg, web search.

**8. Composer Essays** — LLM writes long-form essays (~1500-1800 words). 5 rotating voice personas: narrative journalist, public intellectual, case-study essayist, friendly-letter writer, cultural critic. Banned opening patterns ("Imagine...", "What if...", etc).

**9. Diversity Checker** — Ensures no duplicate topics across essays in this digest and no repeated angles within 7 days (checks `topic_history`).

**10. Digest Assembler** — Validates both tracks produced output, saves everything to DB, marks digest "complete".

### Real-Time Progress (SSE)

Each node publishes events via an in-memory event bus:
```python
event_bus.publish(user_id, "status", {"stage": "extractor", "progress": 45, "message": "extracting articles..."})
```

The frontend's `/pressroom` page connects via `EventSource` to `/api/stream/digest` and displays live progress.

## Embeddings

All text-to-vector conversion uses the `all-MiniLM-L6-v2` model (384 dimensions) via the Hugging Face Inference API.

Used for:
- **Semantic search** — Query embedding compared against essay/article embeddings via pgvector cosine distance
- **Relevance matching** — User interest embeddings compared against article embeddings during digest building
- **Source scoring** — Research source relevance to essay topic during source gathering
- **Content indexing** — Every essay and article gets an embedding stored for future search

See [CHANGELOG.md](./CHANGELOG.md) for why this is an API call rather than a local model.

## Scheduled Jobs

APScheduler runs inside the FastAPI process:
- **Daily digest cron** — `run_daily_digest()` at `DIGEST_CRON_HOUR:DIGEST_CRON_MINUTE` UTC (default 06:00)
- Generates a digest for every user with `onboarding_complete = true`
- Misfire grace time: 1 hour (catches up if server was down)
