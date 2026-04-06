import operator
from typing import Annotated, TypedDict

from app.schemas.digest import ArticleRead
from app.schemas.essay import EssayOutput
from app.schemas.items import ExtractedItem, MatchedArticle, RawItem, ScoredArticle
from app.schemas.research import ResearchBundle


class DigestState(TypedDict, total=False):
    """Shared state for the digest-building LangGraph DAG.

    Uses Annotated[list, operator.add] reducers so parallel branches
    can append to shared lists without overwriting each other.
    """

    user_id: str
    interest_topics: list[str]
    interest_descriptions: dict[str, str]  # topic -> user's depth/description
    research_topics: list[str]  # uncached topics that need fresh research
    avoid_topics: list[str]  # recently used topics to avoid on regenerate
    interest_embeddings: list[list[float]]
    reading_context: dict  # read_topics, read_theses, bookmarked_topics, bookmarked_theses
    generation_intent: str  # "balanced", "go_deeper", "surprise_me", "new_territory"

    # Pipeline data — each stage appends
    raw_items: Annotated[list[RawItem], operator.add]
    extracted_items: Annotated[list[ExtractedItem], operator.add]
    scored_items: Annotated[list[ScoredArticle], operator.add]
    matched_articles: Annotated[list[MatchedArticle], operator.add]

    # Track 2
    research_bundles: Annotated[list[ResearchBundle], operator.add]
    raw_essays: Annotated[list[EssayOutput], operator.add]  # pre-diversity-check
    essays: list[EssayOutput]  # post-diversity-check (replaced, not appended)

    # Final output
    dispatch_articles: Annotated[list[ArticleRead], operator.add]
    errors: Annotated[list[str], operator.add]
