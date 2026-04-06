import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Essay(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "essays"

    digest_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("digests.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    subtitle: Mapped[str | None] = mapped_column(String(512), nullable=True)
    body_markdown: Mapped[str] = mapped_column(Text)
    thesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str] = mapped_column(String(255))
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=0)
    length_tier: Mapped[str] = mapped_column(String(20), default="deep_dive", server_default="deep_dive")
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    embedding = mapped_column(Vector(384), nullable=True)

    digest: Mapped["Digest | None"] = relationship(back_populates="essays")
    sources: Mapped[list["ResearchSource"]] = relationship(back_populates="essay", cascade="all, delete-orphan")
