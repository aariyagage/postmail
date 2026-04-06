from pydantic import BaseModel


class ResearchSourceSchema(BaseModel):
    source_type: str
    title: str
    author: str | None = None
    url: str | None = None
    excerpt: str | None = None


class ResearchBundle(BaseModel):
    topic: str
    thesis: str
    sources: list[ResearchSourceSchema]
    outline: list[str]
    length_tier: str = "deep_dive"  # "quick_read" or "deep_dive"
