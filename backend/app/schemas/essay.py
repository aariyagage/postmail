import uuid

from pydantic import BaseModel


class EssayOutput(BaseModel):
    id: uuid.UUID | None = None
    title: str
    subtitle: str | None = None
    body_markdown: str
    thesis: str | None = None
    topic: str
    word_count: int = 0
    reading_time_minutes: int = 0
    length_tier: str = "deep_dive"  # "quick_read" (~750w, 3min) or "deep_dive" (~1750w, 7min)
    sources: list["ResearchSourceSchema"] = []

    model_config = {"from_attributes": True}


from app.schemas.research import ResearchSourceSchema

EssayOutput.model_rebuild()
