"""Sparks — 2-sentence thought-starters from trending articles.

Instead of full dispatch articles, sparks are bite-sized intellectual provocations
that tease curiosity. They're the appetizers to the essays' main course.
"""

import asyncio
import logging
import random
import uuid

from app.agents.state import DigestState
from app.schemas.digest import ArticleRead
from app.services import llm
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)

# Rotate spark styles so they don't all sound the same
SPARK_TEMPLATES = [
    # Lead with a specific fact or number
    (
        "Write a 'spark' — exactly 2 sentences.\n"
        "Sentence 1: Lead with a specific number, date, or concrete fact from the article.\n"
        "Sentence 2: What that fact reveals about the bigger picture.\n"
        "Do NOT start with 'What if' or 'Did you know'."
    ),
    # Lead with a contrast or tension
    (
        "Write a 'spark' — exactly 2 sentences.\n"
        "Sentence 1: Set up a tension or contradiction — two things that shouldn't coexist but do.\n"
        "Sentence 2: What that tension tells us.\n"
        "Do NOT start with 'What if' or a rhetorical question."
    ),
    # Lead with a person or entity
    (
        "Write a 'spark' — exactly 2 sentences.\n"
        "Sentence 1: Name a person, company, or team and what they did.\n"
        "Sentence 2: Why it matters beyond the obvious.\n"
        "Do NOT start with a question."
    ),
    # Lead with an implication
    (
        "Write a 'spark' — exactly 2 sentences.\n"
        "Sentence 1: State the most surprising implication of this article — "
        "not the headline, but what it means.\n"
        "Sentence 2: Connect it to something the reader already cares about.\n"
        "Do NOT start with 'What if', 'Imagine', or 'Did you know'."
    ),
]


async def _compose_one(item, template_index: int) -> ArticleRead:
    summary = item.summary
    template = SPARK_TEMPLATES[template_index % len(SPARK_TEMPLATES)]

    try:
        result = await llm.complete_json(
            f"Title: {item.title}\nSummary: {item.summary}\nSource: {item.source_name}\n\n"
            f"{template}\n\n"
            f"Tone: sharp, specific, no filler words. "
            f"Like a smart friend forwarding you an article with a one-line note about why it's interesting.",
            system='Return JSON with keys: "summary" (the 2-sentence spark).',
            max_tokens=200,
        )
        summary = result.get("summary", item.summary)
    except Exception as e:
        logger.warning("LLM spark composition failed: %s", e)

    # body_markdown gets the original article summary (longer context),
    # while summary gets the 2-sentence spark for card display
    return ArticleRead(
        id=uuid.uuid4(),
        title=item.title,
        summary=summary,
        body_markdown=item.summary,
        source_name=item.source_name,
        source_url=item.url,
        category=item.category,
        published_at=item.published_at,
        quality_score=item.quality_score,
        relevance_score=item.relevance_score,
    )


async def composer_dispatch(state: DigestState) -> dict:
    """Compose Track 1 Sparks — bite-sized thought-starters from trending articles."""
    await event_bus.publish(state["user_id"], "status", {"stage": "composer_dispatch", "progress": 0, "message": "Writing sparks..."})

    matched = state.get("matched_articles", [])
    if not matched:
        return {"dispatch_articles": []}

    # Filter out articles with empty/failed content
    BAD_MARKERS = ["not available", "details are unknown", "content is not available", "details of the project are unknown"]
    matched = [
        item for item in matched
        if not any(marker in (item.summary or "").lower() for marker in BAD_MARKERS)
    ]
    if not matched:
        return {"dispatch_articles": []}

    # Randomize starting template so digests feel different each day
    offset = random.randint(0, len(SPARK_TEMPLATES) - 1)
    articles = await asyncio.gather(*[
        _compose_one(item, i + offset) for i, item in enumerate(matched)
    ])

    await event_bus.publish(state["user_id"], "status", {"stage": "composer_dispatch", "progress": 100, "message": f"Wrote {len(articles)} sparks"})
    return {"dispatch_articles": list(articles)}
