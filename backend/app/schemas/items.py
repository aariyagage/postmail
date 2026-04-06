import uuid
from datetime import datetime

from pydantic import BaseModel, HttpUrl


class RawItem(BaseModel):
    url: str
    title: str
    source_name: str
    published_at: datetime | None = None
    raw_content: str | None = None


class ExtractedItem(BaseModel):
    url: str
    title: str
    source_name: str
    published_at: datetime | None = None
    summary: str
    category: str | None = None
    embedding: list[float] | None = None


class ScoredArticle(ExtractedItem):
    quality_score: float


class MatchedArticle(ScoredArticle):
    relevance_score: float
    matched_interests: list[str] = []
