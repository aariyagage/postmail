import asyncio
import logging
from datetime import date

from sqlalchemy import select

from app.database import async_session
from app.models.digest import Digest
from app.models.user import User
from app.services.digest_builder import build_digest_for_user

logger = logging.getLogger(__name__)

# Max concurrent digest builds to avoid overwhelming Groq rate limits
MAX_CONCURRENT_BUILDS = 3


async def _build_for_user(user_id, semaphore: asyncio.Semaphore):
    """Build a digest for a single user with its own DB session."""
    async with semaphore:
        try:
            async with async_session() as db:
                await build_digest_for_user(user_id, db)
            logger.info("Digest built for user %s", user_id)
        except Exception as e:
            logger.error("Failed to build digest for user %s: %s", user_id, e)


async def run_daily_digest():
    """Cron job: build digests for all onboarded users.

    APScheduler is configured with max_instances=1, so overlapping runs
    are prevented at the scheduler level.
    """
    logger.info("Starting daily digest generation")

    # Fetch users in a short-lived session
    async with async_session() as db:
        result = await db.execute(
            select(User.id).where(User.onboarding_complete == True)
        )
        user_ids = [row[0] for row in result.all()]

    logger.info("Found %d users for digest generation", len(user_ids))

    # Filter out users who already have a digest today
    users_to_build = []
    async with async_session() as db:
        for user_id in user_ids:
            existing = await db.execute(
                select(Digest.id).where(
                    Digest.user_id == user_id,
                    Digest.edition_date == date.today(),
                    Digest.status.in_(["pending", "building", "complete"]),
                )
            )
            if existing.first():
                logger.info("Skipping user %s — already has a digest for today", user_id)
            else:
                users_to_build.append(user_id)

    if not users_to_build:
        logger.info("No users need digests today")
        return

    # Build digests concurrently with a semaphore to limit parallelism
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_BUILDS)
    tasks = [_build_for_user(uid, semaphore) for uid in users_to_build]
    await asyncio.gather(*tasks)

    logger.info("Daily digest generation complete")
