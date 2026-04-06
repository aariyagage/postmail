import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Bookmark(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "bookmarks"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    content_type: Mapped[str] = mapped_column(String(50))  # article, essay
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)

    user: Mapped["User"] = relationship(back_populates="bookmarks")
