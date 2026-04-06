import uuid

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    supabase_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    onboarding_complete: Mapped[bool] = mapped_column(default=False)

    interests: Mapped[list["Interest"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    digests: Mapped[list["Digest"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    bookmarks: Mapped[list["Bookmark"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    read_history: Mapped[list["ReadHistory"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    essay_feedback: Mapped[list["EssayFeedback"]] = relationship(back_populates="user", cascade="all, delete-orphan")
