import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, _extract_token, _verify_token, _is_auth_enabled
from app.database import get_db
from app.models.interest import Interest
from app.models.user import User
from app.schemas.user import InterestCreate, UserCreate, UserRead, MAX_INTERESTS
from app.services import embeddings

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=201)
async def create_user(
    payload: UserCreate,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    # Extract identity from JWT (auth required in production)
    if _is_auth_enabled():
        token = _extract_token(request)
        if not token:
            raise HTTPException(status_code=401, detail="Authentication required")
        jwt_payload = await _verify_token(token)
        email = jwt_payload.get("email")
        supabase_id = jwt_payload.get("sub")
        if not email or not supabase_id:
            raise HTTPException(status_code=401, detail="Token missing required claims")
    else:
        # Dev mode: require email in headers or allow from payload for testing
        email = request.headers.get("X-Dev-Email") if request else None
        supabase_id = None
        if not email:
            raise HTTPException(status_code=401, detail="Authentication required (dev mode: set X-Dev-Email header)")

    # Check if user already exists by supabase_id or email
    user = None
    if supabase_id:
        result = await db.execute(
            select(User).options(selectinload(User.interests)).where(User.supabase_id == supabase_id)
        )
        user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(
            select(User).options(selectinload(User.interests)).where(User.email == email)
        )
        user = result.scalar_one_or_none()

    if user:
        # Update existing user
        user.name = payload.name
        user.onboarding_complete = True
        if supabase_id and not user.supabase_id:
            user.supabase_id = supabase_id
        if user.email != email:
            user.email = email

        # Replace interests
        for old in user.interests:
            await db.delete(old)
    else:
        user = User(
            supabase_id=supabase_id,
            email=email,
            name=payload.name,
            onboarding_complete=True,
        )
        db.add(user)
        await db.flush()

    if payload.interests:
        topics = [i.topic for i in payload.interests]
        try:
            vecs = await embeddings.embed_batch(topics)
        except Exception:
            vecs = [None] * len(topics)

        for interest_data, vec in zip(payload.interests, vecs):
            interest = Interest(
                user_id=user.id,
                topic=interest_data.topic,
                description=interest_data.description,
                embedding=vec,
            )
            db.add(interest)

    await db.commit()

    result = await db.execute(
        select(User).options(selectinload(User.interests)).where(User.id == user.id)
    )
    return result.scalar_one()


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).options(selectinload(User.interests)).where(User.id == user.id)
    )
    return result.scalar_one()


@router.put("/me/interests", response_model=UserRead)
async def update_interests(
    interests: list[InterestCreate],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(interests) > MAX_INTERESTS:
        raise HTTPException(
            status_code=422,
            detail=f"Maximum {MAX_INTERESTS} interests allowed",
        )

    result = await db.execute(
        select(User).options(selectinload(User.interests)).where(User.id == user.id)
    )
    user = result.scalar_one()

    # Remove old interests
    for old in user.interests:
        await db.delete(old)

    # Add new interests
    topics = [i.topic for i in interests]
    try:
        vecs = await embeddings.embed_batch(topics)
    except Exception:
        vecs = [None] * len(topics)

    for interest_data, vec in zip(interests, vecs):
        interest = Interest(
            user_id=user.id,
            topic=interest_data.topic,
            description=interest_data.description,
            embedding=vec,
        )
        db.add(interest)

    await db.commit()

    result = await db.execute(
        select(User).options(selectinload(User.interests)).where(User.id == user.id)
    )
    return result.scalar_one()
