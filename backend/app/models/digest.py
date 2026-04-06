import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Digest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "digests"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    edition_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, building, complete, failed
    headline: Mapped[str | None] = mapped_column(String(512), nullable=True)
    big_question: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="digests")
    articles: Mapped[list["Article"]] = relationship(back_populates="digest", cascade="all, delete-orphan")
    essays: Mapped[list["Essay"]] = relationship(back_populates="digest", cascade="all, delete-orphan")
