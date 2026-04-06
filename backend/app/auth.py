"""Authentication dependency for FastAPI routes.

Supports two JWT verification modes:
  1. JWKS (ES256) — set POSTMAIL_SUPABASE_URL to your Supabase project URL.
     The public keys are fetched from {url}/auth/v1/.well-known/jwks.json.
  2. Shared secret (HS256) — set POSTMAIL_SUPABASE_JWT_SECRET (legacy).

When neither is set, falls back to dev mode (X-Dev-User-Id header).
"""

import logging
import uuid

import httpx
import jwt
from jwt.api_jwk import PyJWK
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Cached JWKS keys: dict of kid -> PyJWK
_jwks_cache: dict[str, PyJWK] = {}


async def _fetch_jwks():
    """Fetch JWKS from Supabase and cache the keys."""
    global _jwks_cache
    if _jwks_cache:
        return

    if not settings.supabase_url:
        return

    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(jwks_url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        for key_data in data.get("keys", []):
            kid = key_data.get("kid")
            if kid:
                _jwks_cache[kid] = PyJWK(key_data)
        logger.info("Fetched %d JWKS keys from Supabase", len(_jwks_cache))
    except Exception as e:
        logger.error("Failed to fetch JWKS: %s", e)


def _extract_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _is_auth_enabled() -> bool:
    return bool(settings.supabase_jwt_secret or settings.supabase_url)


async def _verify_token(token: str) -> dict:
    """Verify a Supabase JWT and return its payload."""

    # Try JWKS (ES256) first
    if settings.supabase_url:
        await _fetch_jwks()

        # Get the kid from the token header
        try:
            header = jwt.get_unverified_header(token)
        except jwt.DecodeError:
            raise HTTPException(status_code=401, detail="Invalid token")

        kid = header.get("kid")
        jwk = _jwks_cache.get(kid) if kid else None

        if jwk:
            try:
                payload = jwt.decode(
                    token,
                    jwk.key,
                    algorithms=["ES256"],
                    audience="authenticated",
                )
                return payload
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Token expired")
            except jwt.InvalidTokenError as e:
                logger.warning("JWKS token verification failed: %s", e)
                raise HTTPException(status_code=401, detail="Invalid token")
        else:
            # Kid not found — try refreshing cache once
            _jwks_cache.clear()
            await _fetch_jwks()
            jwk = _jwks_cache.get(kid) if kid else None
            if not jwk:
                raise HTTPException(status_code=401, detail="Unknown signing key")
            try:
                payload = jwt.decode(
                    token,
                    jwk.key,
                    algorithms=["ES256"],
                    audience="authenticated",
                )
                return payload
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Token expired")
            except jwt.InvalidTokenError as e:
                logger.warning("JWKS token verification failed: %s", e)
                raise HTTPException(status_code=401, detail="Invalid token")

    # Fall back to HS256 shared secret
    if settings.supabase_jwt_secret:
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            logger.warning("HS256 token verification failed: %s", e)
            raise HTTPException(status_code=401, detail="Invalid token")

    raise HTTPException(status_code=500, detail="No JWT verification method configured")


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verify Supabase JWT and return the authenticated user."""

    # Dev mode: no secret or URL configured
    if not _is_auth_enabled():
        user_id_str = (
            request.headers.get("X-Dev-User-Id")
            or request.query_params.get("user_id")
        )
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Authentication required")
        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user_id")

        result = await db.execute(
            select(User).options(selectinload(User.interests)).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    # Production mode: verify JWT
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = await _verify_token(token)

    sub = payload.get("sub")
    email = payload.get("email")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub claim")
    if not email:
        raise HTTPException(status_code=401, detail="Token missing email claim")

    # Look up by supabase_id first, fall back to email for legacy users
    result = await db.execute(
        select(User).options(selectinload(User.interests)).where(User.supabase_id == sub)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Try email lookup (legacy user created before supabase_id column)
        result = await db.execute(
            select(User).options(selectinload(User.interests)).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        if user and not user.supabase_id:
            # Backfill supabase_id for legacy user
            user.supabase_id = sub
            await db.commit()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found — please complete onboarding",
        )

    # Keep email in sync if changed on Supabase side
    if user.email != email:
        user.email = email
        await db.commit()

    return user
