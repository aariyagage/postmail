import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ResearchSource(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "research_sources"

    essay_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("essays.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(50))  # book, paper, lecture, article
    title: Mapped[str] = mapped_column(String(512))
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding = mapped_column(Vector(384), nullable=True)

    essay: Mapped["Essay"] = relationship(back_populates="sources")
