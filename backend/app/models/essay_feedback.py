import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class EssayFeedback(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "essay_feedback"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    essay_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("essays.id"), index=True)
    signal: Mapped[str] = mapped_column(String(20))  # "more" or "different"

    user: Mapped["User"] = relationship(back_populates="essay_feedback")
    essay: Mapped["Essay"] = relationship()
