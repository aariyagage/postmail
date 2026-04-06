"""Reading progress, streaks, stats, and essay feedback endpoints."""

import uuid
from datetime import date, timedelta, timezone, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, and_, func, distinct, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.essay_feedback import EssayFeedback
from app.models.read_history import ReadHistory
from app.models.essay import Essay
from app.models.user import User

router = APIRouter(prefix="/api/reading", tags=["reading"])


class ReadingStats(BaseModel):
    total_essays_read: int
    total_articles_read: int
    current_streak: int  # consecutive days with at least 1 read
    longest_streak: int
    topics_explored: list[str]
    total_reading_time_minutes: int
    essays_this_week: int


class MarkReadRequest(BaseModel):
    content_type: Literal["essay", "article"]
    content_id: uuid.UUID
    progress: int = 100  # 0-100


@router.post("/mark-read")
async def mark_read(
    payload: MarkReadRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if already tracked
    existing = await db.execute(
        select(ReadHistory).where(
            and_(
                ReadHistory.user_id == user.id,
                ReadHistory.content_type == payload.content_type,
                ReadHistory.content_id == payload.content_id,
            )
        )
    )
    record = existing.scalar_one_or_none()

    if record:
        record.reading_progress = max(record.reading_progress, payload.progress)
    else:
        record = ReadHistory(
            user_id=user.id,
            content_type=payload.content_type,
            content_id=payload.content_id,
            reading_progress=payload.progress,
        )
        db.add(record)

    await db.commit()
    return {"status": "ok", "progress": record.reading_progress}


@router.get("/stats", response_model=ReadingStats)
async def get_reading_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = user.id

    # Total reads by type
    essay_count_result = await db.execute(
        select(func.count()).where(
            and_(ReadHistory.user_id == user_id, ReadHistory.content_type == "essay", ReadHistory.reading_progress >= 50)
        )
    )
    total_essays = essay_count_result.scalar() or 0

    article_count_result = await db.execute(
        select(func.count()).where(
            and_(ReadHistory.user_id == user_id, ReadHistory.content_type == "article", ReadHistory.reading_progress >= 50)
        )
    )
    total_articles = article_count_result.scalar() or 0

    # Get distinct dates when user read something (for streak calculation)
    dates_result = await db.execute(
        select(distinct(cast(ReadHistory.created_at, Date)))
        .where(ReadHistory.user_id == user_id)
        .order_by(cast(ReadHistory.created_at, Date).desc())
    )
    read_dates = [row[0] for row in dates_result.all()]

    current_streak, longest_streak = _calculate_streaks(read_dates)

    # Topics explored (distinct topics from read essays)
    read_essay_ids_result = await db.execute(
        select(ReadHistory.content_id).where(
            and_(ReadHistory.user_id == user_id, ReadHistory.content_type == "essay")
        )
    )
    read_essay_ids = [row[0] for row in read_essay_ids_result.all()]

    topics = []
    if read_essay_ids:
        topics_result = await db.execute(
            select(distinct(Essay.topic)).where(Essay.id.in_(read_essay_ids))
        )
        topics = [row[0] for row in topics_result.all()]

    # Total reading time from essays
    reading_time = 0
    if read_essay_ids:
        time_result = await db.execute(
            select(func.coalesce(func.sum(Essay.reading_time_minutes), 0))
            .where(Essay.id.in_(read_essay_ids))
        )
        reading_time = time_result.scalar() or 0

    # Essays this week
    week_start = date.today() - timedelta(days=date.today().weekday())
    week_result = await db.execute(
        select(func.count()).where(
            and_(
                ReadHistory.user_id == user_id,
                ReadHistory.content_type == "essay",
                ReadHistory.reading_progress >= 50,
                cast(ReadHistory.created_at, Date) >= week_start,
            )
        )
    )
    essays_this_week = week_result.scalar() or 0

    return ReadingStats(
        total_essays_read=total_essays,
        total_articles_read=total_articles,
        current_streak=current_streak,
        longest_streak=longest_streak,
        topics_explored=topics,
        total_reading_time_minutes=reading_time,
        essays_this_week=essays_this_week,
    )


def _calculate_streaks(read_dates: list[date]) -> tuple[int, int]:
    """Calculate current and longest reading streaks from sorted dates (desc)."""
    if not read_dates:
        return 0, 0

    today = date.today()
    yesterday = today - timedelta(days=1)

    # Current streak: count consecutive days ending today or yesterday
    if read_dates[0] < yesterday:
        current_streak = 0
    else:
        current_streak = 0
        expected = read_dates[0]  # Start from the most recent date (today or yesterday)
        for d in read_dates:
            if d == expected:
                current_streak += 1
                expected -= timedelta(days=1)
            elif d < expected:
                break

    # Longest streak
    sorted_dates = sorted(set(read_dates))
    longest = 1 if sorted_dates else 0
    current = 1
    for i in range(1, len(sorted_dates)):
        if sorted_dates[i] - sorted_dates[i - 1] == timedelta(days=1):
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    return current_streak, longest


class EssayFeedbackRequest(BaseModel):
    essay_id: uuid.UUID
    signal: Literal["more", "different"]


@router.post("/feedback")
async def submit_essay_feedback(
    payload: EssayFeedbackRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Upsert — one feedback per user per essay
    existing = await db.execute(
        select(EssayFeedback).where(
            and_(
                EssayFeedback.user_id == user.id,
                EssayFeedback.essay_id == payload.essay_id,
            )
        )
    )
    record = existing.scalar_one_or_none()

    if record:
        record.signal = payload.signal
    else:
        record = EssayFeedback(
            user_id=user.id,
            essay_id=payload.essay_id,
            signal=payload.signal,
        )
        db.add(record)

    await db.commit()
    return {"status": "ok", "signal": record.signal}
