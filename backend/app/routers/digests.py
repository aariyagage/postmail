import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db, async_session
from app.models.article import Article
from app.models.digest import Digest
from app.models.essay import Essay
from app.models.user import User
from app.schemas.digest import DigestOutput, DigestSummary
from app.services.digest_builder import build_digest_for_user

router = APIRouter(prefix="/api/digests", tags=["digests"])


@router.get("", response_model=list[DigestSummary])
async def list_digests(
    user: User = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Digest.id,
            Digest.edition_date,
            Digest.status,
            Digest.headline,
            func.count(Article.id.distinct()).label("article_count"),
            func.count(Essay.id.distinct()).label("essay_count"),
        )
        .outerjoin(Article, Article.digest_id == Digest.id)
        .outerjoin(Essay, Essay.digest_id == Digest.id)
        .where(Digest.user_id == user.id, Digest.status != "superseded")
        .group_by(Digest.id)
        .order_by(Digest.edition_date.desc(), Digest.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    return [
        DigestSummary(
            id=r.id,
            edition_date=r.edition_date,
            status=r.status,
            headline=r.headline,
            article_count=r.article_count,
            essay_count=r.essay_count,
        )
        for r in rows
    ]


@router.get("/{digest_id}", response_model=DigestOutput)
async def get_digest(
    digest_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Digest)
        .options(
            selectinload(Digest.articles),
            selectinload(Digest.essays).selectinload(Essay.sources),
        )
        .where(Digest.id == digest_id, Digest.user_id == user.id)
    )
    digest = result.scalar_one_or_none()
    if not digest:
        raise HTTPException(status_code=404, detail="Digest not found")
    return digest


VALID_INTENTS = {"balanced", "go_deeper", "surprise_me", "new_territory"}


async def _build_in_background(user_id: uuid.UUID, skip_cache: bool = False, intent: str = "balanced"):
    import logging
    logger = logging.getLogger(__name__)
    try:
        async with async_session() as db:
            await build_digest_for_user(user_id, db, skip_cache=skip_cache, intent=intent)
    except Exception as e:
        logger.exception("Background digest build crashed: %s", e)


@router.post("/generate", status_code=202)
async def trigger_digest(
    background_tasks: BackgroundTasks,
    fresh: bool = Query(default=False),
    intent: str = Query(default="balanced"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timedelta, timezone

    # Cooldown: prevent regeneration within 2 minutes of the last attempt
    recent = await db.execute(
        select(Digest).where(
            Digest.user_id == user.id,
            Digest.edition_date == date.today(),
            Digest.created_at >= datetime.now(timezone.utc) - timedelta(minutes=2),
        ).order_by(Digest.created_at.desc()).limit(1)
    )
    if recent.first() and not fresh:
        raise HTTPException(
            status_code=429,
            detail="Please wait at least 2 minutes between digest generation attempts.",
        )

    # Check for in-progress digest today
    existing = await db.execute(
        select(Digest).where(
            Digest.user_id == user.id,
            Digest.edition_date == date.today(),
            Digest.status.in_(["pending", "building"]),
        )
    )
    active = existing.scalar_one_or_none()

    if active:
        stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        is_stale = active.created_at and active.created_at < stale_cutoff

        if fresh or is_stale:
            # User explicitly regenerating, or digest is stuck — cancel the old one
            active.status = "failed"
            await db.commit()
        else:
            raise HTTPException(
                status_code=409,
                detail="A digest is already being generated. Please wait for it to complete.",
            )

    # When regenerating, supersede any previous complete digests from today
    if fresh:
        old_complete = await db.execute(
            select(Digest).where(
                Digest.user_id == user.id,
                Digest.edition_date == date.today(),
                Digest.status == "complete",
            )
        )
        for old in old_complete.scalars().all():
            old.status = "superseded"
        await db.commit()

    validated_intent = intent if intent in VALID_INTENTS else "balanced"
    background_tasks.add_task(_build_in_background, user.id, skip_cache=fresh, intent=validated_intent)
    return {"status": "accepted", "message": "Digest generation started"}
