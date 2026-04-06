import uuid

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.bookmark import Bookmark
from app.models.user import User

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.get("")
async def list_bookmarks(
    user: User = Depends(get_current_user),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Bookmark)
        .where(Bookmark.user_id == user.id)
        .order_by(Bookmark.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    bookmarks = result.scalars().all()
    return [
        {
            "id": str(b.id),
            "content_type": b.content_type,
            "content_id": str(b.content_id),
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in bookmarks
    ]


@router.post("", status_code=201)
async def create_bookmark(
    content_type: Literal["essay", "article"] = Query(...),
    content_id: uuid.UUID = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Deduplicate
    existing = await db.execute(
        select(Bookmark).where(
            and_(
                Bookmark.user_id == user.id,
                Bookmark.content_type == content_type,
                Bookmark.content_id == content_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "already_bookmarked"}

    bookmark = Bookmark(
        user_id=user.id,
        content_type=content_type,
        content_id=content_id,
    )
    db.add(bookmark)
    await db.commit()
    return {"status": "created", "id": str(bookmark.id)}


@router.delete("/{bookmark_id}", status_code=204)
async def delete_bookmark(
    bookmark_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Bookmark).where(
            and_(Bookmark.id == bookmark_id, Bookmark.user_id == user.id)
        )
    )
    bookmark = result.scalar_one_or_none()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    await db.delete(bookmark)
    await db.commit()
