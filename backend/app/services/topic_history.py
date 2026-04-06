"""Service for persisting and querying per-user topic history.

Used by the research agent to build exclusion lists and rotate
sub-domains so the user never sees the same content twice.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.topic_history import TopicHistory


async def get_topic_exclusions(
    db: AsyncSession,
    user_id: uuid.UUID,
    domain: str | None = None,
    days: int = 90,
) -> list[dict]:
    """Load topic history for a user as an exclusion list.

    Returns list of dicts with: topic, domain, sub_domain, angle, created_at
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = (
        select(TopicHistory)
        .where(TopicHistory.user_id == user_id, TopicHistory.created_at > cutoff)
        .order_by(TopicHistory.created_at.desc())
    )
    if domain:
        query = query.where(TopicHistory.domain == domain)

    result = await db.execute(query)
    rows = result.scalars().all()
    return [
        {
            "topic": r.topic,
            "domain": r.domain,
            "sub_domain": r.sub_domain,
            "angle": r.angle,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


async def get_used_subdomains(
    db: AsyncSession,
    user_id: uuid.UUID,
    domain: str,
    days: int = 90,
) -> list[str]:
    """Return sub-domains already used for this user+domain within the window."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(TopicHistory.sub_domain)
        .where(
            TopicHistory.user_id == user_id,
            TopicHistory.domain == domain,
            TopicHistory.sub_domain.isnot(None),
            TopicHistory.created_at > cutoff,
        )
        .distinct()
    )
    return [row[0] for row in result.all()]


async def get_used_angles(
    db: AsyncSession,
    user_id: uuid.UUID,
    domain: str,
    last_n: int = 5,
) -> list[str]:
    """Return the last N angles used for this domain (most recent first)."""
    result = await db.execute(
        select(TopicHistory.angle)
        .where(
            TopicHistory.user_id == user_id,
            TopicHistory.domain == domain,
            TopicHistory.angle.isnot(None),
        )
        .order_by(TopicHistory.created_at.desc())
        .limit(last_n)
    )
    return [row[0] for row in result.all()]


async def record_topics(
    db: AsyncSession,
    user_id: uuid.UUID,
    entries: list[dict],
) -> None:
    """Save generated topics to history.

    Each entry: {topic, domain, sub_domain (optional), angle (optional)}
    """
    for entry in entries:
        db.add(TopicHistory(
            user_id=user_id,
            topic=entry["topic"],
            domain=entry["domain"],
            sub_domain=entry.get("sub_domain"),
            angle=entry.get("angle"),
        ))
    await db.flush()
