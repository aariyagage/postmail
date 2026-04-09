# Postmail

A personalized intellectual daily digest. Postmail curates articles from the web and generates original long-form essays tailored to your interests — delivered as a daily edition with a zine-inspired reading experience.

**Not a news app.** Postmail is an intellectual library. Essays are the core product — researched, sourced, and written in rotating literary voices. Article "sparks" are the supporting cast: 2-sentence hooks that surface what's worth knowing today.

## How It Works

1. **You pick 3-7 interests** during onboarding (philosophy, AI, urban design, etc.)
2. **Each day, the pipeline runs:**
   - Scrapes ~50 articles from Hacker News
   - Filters by quality and relevance to your interests
   - Generates 7-10 article "sparks" (concise summaries)
   - Researches and writes 2-3 original essays with real sources
3. **You read your edition** with reading progress tracking, bookmarks, and feedback signals

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0 (async) |
| Database | PostgreSQL + pgvector (hosted on Supabase) |
| Auth | Supabase Auth (Google OAuth + email/password) |
| LLM | Groq API (Llama 3.3 70B) |
| Embeddings | Hugging Face Inference API (all-MiniLM-L6-v2) |
| Agent Framework | LangGraph (DAG-based pipeline) |
| Deployment | Vercel (frontend) + Render (backend) |

## Quick Start

```bash
# Start everything with Docker
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# Database: localhost:5433
```

See [docs/SETUP.md](docs/SETUP.md) for full setup instructions and environment variables.

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, components, database schema, auth flow |
| [Pipeline](docs/PIPELINE.md) | How the digest generation agent works, step by step |
| [API Reference](docs/API.md) | All backend endpoints with request/response formats |
| [Setup Guide](docs/SETUP.md) | Local development, environment variables, Supabase config |
| [Deployment](docs/DEPLOYMENT.md) | Vercel + Render + Supabase production deployment |
| [Changelog](docs/CHANGELOG.md) | Significant changes with problem/solution/reasoning |

## Project Structure

```
postmail/
├── frontend/                 # Next.js app
│   ├── src/
│   │   ├── app/              # Pages and routes
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React context providers (bookmarks)
│   │   └── lib/              # API client, auth hook, SSE, Supabase clients
│   ├── public/               # Static assets
│   └── next.config.mjs       # API rewrite proxy config
│
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── agents/           # LangGraph digest pipeline
│   │   │   ├── graph.py      # DAG definition
│   │   │   ├── state.py      # Pipeline state schema
│   │   │   ├── sources.py    # Research source gathering
│   │   │   └── nodes/        # Individual pipeline nodes
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # FastAPI route handlers
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic (embeddings, digest builder)
│   │   ├── jobs/             # Cron job definitions
│   │   ├── auth.py           # JWT verification (Supabase JWKS)
│   │   ├── config.py         # Environment variable settings
│   │   ├── database.py       # Async SQLAlchemy session
│   │   └── main.py           # FastAPI app with middleware and lifespan
│   ├── alembic/              # Database migrations
│   ├── Dockerfile
│   └── start.sh              # Entrypoint: migrations + server
│
├── docker-compose.yml        # Local dev: DB + backend + frontend
├── render.yaml               # Render deployment config
└── docs/                     # Project documentation
```
