# Postmail Setup Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development outside Docker)
- Python 3.11+ (for backend development outside Docker)
- A Supabase project (free tier works)
- A Groq API key (free tier works)

## Local Development (Docker)

The simplest way to run everything:

```bash
# Clone and enter the project
cd postmail

# Create backend .env file
cp backend/.env.example backend/.env
# Edit backend/.env with your keys (see Environment Variables below)

# Create frontend .env.local
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your Supabase keys

# Start everything
docker-compose up --build
```

This starts:
- **PostgreSQL + pgvector** on port 5433
- **FastAPI backend** on port 8000
- **Next.js frontend** on port 3000

The backend automatically runs database migrations on startup.

## Local Development (Manual)

### Database

```bash
# Start just the database
docker-compose up db

# Or use any PostgreSQL 16+ instance with pgvector enabled
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[test]"

# Create .env with your config (see Environment Variables)
cp .env.example .env

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local with your Supabase keys
cp .env.example .env.local

npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTMAIL_DATABASE_URL` | Yes | `postgresql+asyncpg://postmail:postmail@localhost:5432/postmail` | Async PostgreSQL connection string |
| `POSTMAIL_GROQ_API_KEY` | Yes | — | Groq API key for LLM generation |
| `POSTMAIL_GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model to use |
| `POSTMAIL_SUPABASE_URL` | Prod | — | Supabase project URL (enables JWKS auth) |
| `POSTMAIL_SUPABASE_JWT_SECRET` | No | — | HS256 JWT secret (legacy, use JWKS instead) |
| `POSTMAIL_YOUTUBE_API_KEY` | No | — | YouTube Data API key for transcript fetching |
| `POSTMAIL_CORS_ORIGINS` | Prod | `["http://localhost:3000"]` | JSON array of allowed frontend origins |
| `POSTMAIL_EMBEDDING_MODEL` | No | `all-MiniLM-L6-v2` | Hugging Face model for embeddings |
| `POSTMAIL_DIGEST_CRON_HOUR` | No | `6` | Daily digest hour (UTC) |
| `POSTMAIL_DIGEST_CRON_MINUTE` | No | `0` | Daily digest minute (UTC) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous/public key |
| `NEXT_PUBLIC_API_URL` | Prod | `http://localhost:8000` | Backend API URL |

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL` and `POSTMAIL_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Go to **Auth > URL Configuration**:
   - Set **Site URL** to your production frontend URL
   - Add to **Redirect URLs**: `https://your-domain.com/auth/callback`
   - For local dev, also add: `http://localhost:3000/auth/callback`
4. (Optional) Enable Google OAuth under **Auth > Providers > Google**

## Database Migrations

Migrations are managed by Alembic and run automatically on backend startup. To run manually:

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "description of changes"

# Check current migration state
alembic current
```

The database requires the `pgvector` extension. The startup script (`start.sh`) enables it automatically:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
