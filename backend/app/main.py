import logging
import sys
import time
import uuid as uuid_mod
from contextlib import asynccontextmanager

# Configure root logger so all app.* loggers output to stderr
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stderr,
)

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import async_session
from app.jobs.digest_cron import run_daily_digest
from app.models.digest import Digest
from app.routers import articles, bookmarks, digests, essays, health, reading, search, sse, users

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log method, path, status, and duration for every request."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid_mod.uuid4())[:8]
        request.state.request_id = request_id
        start = time.monotonic()

        response = await call_next(request)

        duration_ms = (time.monotonic() - start) * 1000
        logger.info(
            "[%s] %s %s → %d (%.0fms)",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response


async def _cleanup_stale_digests():
    """Mark any digests stuck in 'building' status as 'failed' on startup."""
    from sqlalchemy import update
    async with async_session() as db:
        result = await db.execute(
            update(Digest)
            .where(Digest.status == "building")
            .values(status="failed")
            .returning(Digest.id)
        )
        stale_ids = result.scalars().all()
        if stale_ids:
            await db.commit()
            logger.warning("Marked %d stale 'building' digests as 'failed': %s", len(stale_ids), stale_ids)


def _validate_config():
    """Log warnings for missing or insecure configuration on startup."""
    if not settings.groq_api_key:
        logger.warning("POSTMAIL_GROQ_API_KEY is not set — digest generation will fail")
    if not settings.supabase_jwt_secret and not settings.supabase_url:
        logger.warning("Neither POSTMAIL_SUPABASE_JWT_SECRET nor POSTMAIL_SUPABASE_URL is set — running in dev mode (auth disabled)")
    if settings.cors_origins == ["http://localhost:3000"]:
        logger.warning("POSTMAIL_CORS_ORIGINS is still localhost — set to your production domain for deployment")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    _validate_config()
    await _cleanup_stale_digests()
    scheduler.add_job(
        run_daily_digest,
        "cron",
        hour=settings.digest_cron_hour,
        minute=settings.digest_cron_minute,
        id="daily_digest",
        max_instances=1,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info("Postmail API started — digest cron at %02d:%02d UTC", settings.digest_cron_hour, settings.digest_cron_minute)
    yield
    # Shutdown
    scheduler.shutdown()


app = FastAPI(
    title="Postmail API",
    description="Personalized intellectual daily digest",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Register routers
app.include_router(health.router)
app.include_router(users.router)
app.include_router(digests.router)
app.include_router(articles.router)
app.include_router(essays.router)
app.include_router(bookmarks.router)
app.include_router(reading.router)
app.include_router(search.router)
app.include_router(sse.router)
