"""Semantic search endpoint using pgvector embeddings."""

import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, not_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.essay import Essay
from app.models.article import Article
from app.models.user import User
from app.services import embeddings

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchResult(BaseModel):
    type: str  # "essay" or "article"
    id: str
    title: str
    subtitle: str | None = None
    topic: str | None = None
    summary: str | None = None
    reading_time_minutes: int | None = None
    source_name: str | None = None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[SearchResult])
async def search(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=10, le=30),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Semantic search across essays and articles using embedding similarity."""
    # Embed the query
    try:
        query_vecs = await embeddings.embed_batch([q])
        query_vec = query_vecs[0]
    except Exception:
        return []

    results: list[SearchResult] = []

    # Search essays
    essay_result = await db.execute(
        select(Essay)
        .where(Essay.embedding.isnot(None))
        .order_by(Essay.embedding.cosine_distance(query_vec))
        .limit(limit)
    )
    for essay in essay_result.scalars().all():
        results.append(SearchResult(
            type="essay",
            id=str(essay.id),
            title=essay.title,
            subtitle=essay.subtitle,
            topic=essay.topic,
            reading_time_minutes=essay.reading_time_minutes,
        ))

    # Search articles
    article_result = await db.execute(
        select(Article)
        .where(Article.embedding.isnot(None))
        .order_by(Article.embedding.cosine_distance(query_vec))
        .limit(limit)
    )
    for article in article_result.scalars().all():
        results.append(SearchResult(
            type="article",
            id=str(article.id),
            title=article.title,
            summary=article.summary,
            source_name=article.source_name,
        ))

    # Interleave essays and articles by relevance (they're already sorted by distance)
    # Simple approach: alternate, preferring essays
    essays = [r for r in results if r.type == "essay"]
    articles = [r for r in results if r.type == "article"]
    merged: list[SearchResult] = []
    ei, ai = 0, 0
    while len(merged) < limit and (ei < len(essays) or ai < len(articles)):
        if ei < len(essays):
            merged.append(essays[ei])
            ei += 1
        if ai < len(articles) and len(merged) < limit:
            merged.append(articles[ai])
            ai += 1

    return merged[:limit]
