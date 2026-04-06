import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, not_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.essay import Essay
from app.models.user import User
from app.schemas.essay import EssayOutput

router = APIRouter(prefix="/api/essays", tags=["essays"])


@router.get("/{essay_id}", response_model=EssayOutput)
async def get_essay(
    essay_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Essay).options(selectinload(Essay.sources)).where(Essay.id == essay_id)
    )
    essay = result.scalar_one_or_none()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    return essay


@router.get("/{essay_id}/related", response_model=list[EssayOutput])
async def get_related_essays(
    essay_id: uuid.UUID,
    limit: int = Query(default=3, le=10),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get related essays — 'Keep reading about...' recommendations.

    Uses embedding similarity when available, falls back to topic matching.
    """
    # Get the source essay
    result = await db.execute(
        select(Essay).options(selectinload(Essay.sources)).where(Essay.id == essay_id)
    )
    essay = result.scalar_one_or_none()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")

    related: list[Essay] = []

    # Strategy 1: Vector similarity (if embedding exists)
    if essay.embedding is not None:
        from pgvector.sqlalchemy import Vector
        vector_result = await db.execute(
            select(Essay)
            .options(selectinload(Essay.sources))
            .where(not_(Essay.id == essay_id))
            .where(Essay.embedding.isnot(None))
            .order_by(Essay.embedding.cosine_distance(essay.embedding))
            .limit(limit)
        )
        related = list(vector_result.scalars().all())

    # Strategy 2: Fall back to same-topic essays
    if len(related) < limit:
        existing_ids = {e.id for e in related} | {essay_id}
        topic_result = await db.execute(
            select(Essay)
            .options(selectinload(Essay.sources))
            .where(
                and_(
                    Essay.topic == essay.topic,
                    not_(Essay.id.in_(existing_ids)),
                )
            )
            .order_by(Essay.created_at.desc())
            .limit(limit - len(related))
        )
        related.extend(topic_result.scalars().all())

    # Strategy 3: Fill remaining with recent essays
    if len(related) < limit:
        existing_ids = {e.id for e in related} | {essay_id}
        recent_result = await db.execute(
            select(Essay)
            .options(selectinload(Essay.sources))
            .where(not_(Essay.id.in_(existing_ids)))
            .order_by(Essay.created_at.desc())
            .limit(limit - len(related))
        )
        related.extend(recent_result.scalars().all())

    return related
