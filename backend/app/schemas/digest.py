import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.essay import EssayOutput
from app.schemas.items import MatchedArticle


class ArticleRead(BaseModel):
    id: uuid.UUID
    title: str
    summary: str
    body_markdown: str | None = None
    source_name: str
    source_url: str
    category: str | None = None
    published_at: datetime | None = None
    quality_score: float | None = None
    relevance_score: float | None = None

    model_config = {"from_attributes": True}


class DigestSummary(BaseModel):
    id: uuid.UUID
    edition_date: date
    status: str
    headline: str | None = None
    big_question: str | None = None
    article_count: int = 0
    essay_count: int = 0

    model_config = {"from_attributes": True}


class DigestOutput(BaseModel):
    id: uuid.UUID
    edition_date: date
    status: str
    headline: str | None = None
    big_question: str | None = None
    articles: list[ArticleRead] = []
    essays: list[EssayOutput] = []

    model_config = {"from_attributes": True}
