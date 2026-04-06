"""Per-user topic history for diversity tracking.

Records every essay topic shown to a user, the sub-domain it came from,
and the angle/framing used. The research agent uses this as an exclusion
list to avoid repeating topics or angles.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class TopicHistory(Base, UUIDMixin):
    __tablename__ = "topic_history"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False
    )
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)  # broad interest
    sub_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    angle: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
