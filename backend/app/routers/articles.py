import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.article import Article
from app.models.user import User
from app.schemas.digest import ArticleRead

router = APIRouter(prefix="/api/articles", tags=["articles"])


@router.get("/{article_id}", response_model=ArticleRead)
async def get_article(
    article_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article
