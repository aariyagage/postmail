# Postmail Deployment

Postmail is deployed as two services:
- **Frontend** on Vercel (Next.js optimized hosting)
- **Backend** on Render (Docker container)
- **Database** on Supabase (managed PostgreSQL with pgvector)

## Why Two Platforms?

The backend cannot run on Vercel because:
- **APScheduler** needs a persistent long-running process (Vercel functions are stateless/ephemeral)
- **SSE streaming** needs persistent connections
- **Alembic migrations** need a startup script
- Vercel serverless functions have a 250MB size limit

The frontend cannot run on Render's free tier efficiently because Vercel is purpose-built for Next.js with edge caching, automatic ISR, and zero-config deployments.

## Vercel (Frontend)

### Setup

1. Import the repo on [vercel.com](https://vercel.com)
2. Set the **Root Directory** to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://postmail-api-xxxx.onrender.com`)
4. Deploy

**Important:** `NEXT_PUBLIC_*` variables are baked in at build time. If you change them, you must redeploy.

### How the Proxy Works

`next.config.mjs` rewrites `/api/*` requests to the backend:
```js
{
  source: "/api/:path*",
  destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
}
```

This means most API calls from the browser go to `postmail-gilt.vercel.app/api/...` and Vercel proxies them server-side to Render. No CORS needed for these requests.

**Exception:** SSE connections go directly to the backend URL because Next.js rewrites buffer streaming responses.

## Render (Backend)

### Setup

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your repo
3. Set:
   - **Runtime:** Docker
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Docker Context:** `./backend`
4. Add environment variables:
   - `POSTMAIL_DATABASE_URL` = your Supabase connection string (use the **connection pooler** URL with `?pgbouncer=true`, swap `postgresql://` for `postgresql+asyncpg://`)
   - `POSTMAIL_GROQ_API_KEY`
   - `POSTMAIL_SUPABASE_URL`
   - `POSTMAIL_CORS_ORIGINS` = `["https://postmail-gilt.vercel.app"]`
5. Set **Health Check Path** to `/health`

### Free Tier Considerations

Render's free tier:
- **512MB RAM** — The backend fits within this after the embedding API migration (see [CHANGELOG.md](./CHANGELOG.md))
- **Spins down after 15 min of inactivity** — First request after sleep takes 30-60 seconds (cold start)
- **750 hours/month** — Enough for one always-on service

### Startup

The Docker container runs `start.sh` which:
1. Enables the pgvector extension
2. Runs Alembic migrations
3. Starts Uvicorn on port 8000

## Supabase (Database + Auth)

### Database

Use the Supabase PostgreSQL instance with pgvector pre-installed.

Connection string format for the backend:
```
postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Auth Configuration

In the Supabase dashboard under **Auth > URL Configuration**:

| Setting | Value |
|---|---|
| Site URL | `https://postmail-gilt.vercel.app` |
| Redirect URLs | `https://postmail-gilt.vercel.app/**` |

The wildcard redirect covers all callback paths (`/auth/callback?next=/onboarding`, `/auth/callback?next=/`, etc).

### Email Deliverability

Supabase's built-in email sender:
- Rate limited to ~4 emails/hour on the free plan
- Often lands in spam

For production, configure a custom SMTP under **Auth > SMTP Settings**. Resend offers 100 emails/day free:
1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (or use their test domain)
3. Get SMTP credentials and add them to Supabase SMTP settings

## CORS

The backend allows requests from origins listed in `POSTMAIL_CORS_ORIGINS`. This must include your Vercel production URL.

Most frontend API calls go through the Next.js rewrite proxy (server-side, no CORS), but SSE connections go directly to the backend, so CORS must be configured.

## Troubleshooting

### "Not Found" when visiting backend URL root
Normal. The root `/` has no route. Check `/health` instead.

### CORS errors in browser console
- Verify `POSTMAIL_CORS_ORIGINS` includes your exact Vercel URL (with `https://`, no trailing slash)
- Redeploy the backend after changing env vars

### API calls failing silently
- Check that `NEXT_PUBLIC_API_URL` is set in Vercel env vars
- Redeploy Vercel after adding/changing `NEXT_PUBLIC_*` vars (they're baked at build time)

### Verification emails not arriving
- Check Supabase Auth > Users to see if signup was received
- Check Supabase Auth > Logs for errors
- Verify Site URL and Redirect URLs are set correctly
- Check spam folder
- Free tier rate limit: only ~4 emails/hour

### Backend OOM (out of memory) on Render
See [CHANGELOG.md](./CHANGELOG.md) — the embedding system was migrated from a local model to the Hugging Face Inference API to stay within 512MB.

### Cold start delays on Render free tier
The service spins down after 15 min of inactivity. First request takes 30-60 seconds. This is a Render free tier limitation. The health check endpoint helps keep it warm, but Render's scheduler may still spin it down.
