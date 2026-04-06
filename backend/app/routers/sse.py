import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

from app.auth import _is_auth_enabled, _verify_token
from app.database import get_db
from app.models.user import User
from app.services.event_bus import event_bus

router = APIRouter(prefix="/api/stream", tags=["streaming"])


async def _get_sse_user(
    request: Request,
    access_token: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate SSE connections via query params since EventSource can't set headers."""

    if _is_auth_enabled() and access_token:
        payload = await _verify_token(access_token)
        sub = payload.get("sub")
        email = payload.get("email")
        if not sub or not email:
            raise HTTPException(status_code=401, detail="Token missing required claims")

        # Look up by supabase_id first, fall back to email
        result = await db.execute(
            select(User).options(selectinload(User.interests)).where(User.supabase_id == sub)
        )
        user = result.scalar_one_or_none()
        if user:
            return user

        result = await db.execute(
            select(User).options(selectinload(User.interests)).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    # Dev mode fallback
    if not _is_auth_enabled() and user_id:
        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user_id")

        result = await db.execute(
            select(User).options(selectinload(User.interests)).where(User.id == uid)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    raise HTTPException(status_code=401, detail="Authentication required")


async def _event_generator(user_id: uuid.UUID):
    """SSE generator that subscribes to event_bus for a specific user."""
    sub_id = str(uuid.uuid4())
    queue = event_bus.subscribe(user_id, sub_id)

    try:
        last = event_bus.last_status(user_id)
        yield {"event": "status", "data": last if isinstance(last, str) else json.dumps(last)}
        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30.0)
                data = msg["data"]
                yield {"event": msg["event"], "data": data if isinstance(data, str) else json.dumps(data)}
            except asyncio.TimeoutError:
                yield {"event": "heartbeat", "data": "ping"}
    finally:
        event_bus.unsubscribe(user_id, sub_id)


@router.get("/digest")
async def stream_digest_progress(user: User = Depends(_get_sse_user)):
    return EventSourceResponse(_event_generator(user.id))
