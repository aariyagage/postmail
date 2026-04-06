import logging

from app.agents.state import DigestState
from app.schemas.items import ScoredArticle
from app.services import llm
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)

BATCH_SIZE = 10


async def quality_filter(state: DigestState) -> dict:
    """Score items for quality and filter low-quality content (< 0.4)."""
    await event_bus.publish(state["user_id"], "status", {"stage": "quality_filter", "progress": 0, "message": "Scoring article quality..."})

    items = state.get("extracted_items", [])
    if not items:
        return {"scored_items": []}

    scored: list[ScoredArticle] = []

    for batch_start in range(0, len(items), BATCH_SIZE):
        batch = items[batch_start:batch_start + BATCH_SIZE]
        items_text = "\n".join(
            f"- [{i+1}] {item.title}: {item.summary[:150]}"
            for i, item in enumerate(batch)
        )

        try:
            result = await llm.complete_json(
                f"Rate each article's quality from 0.0 to 1.0 based on intellectual depth, "
                f"novelty, and relevance to a curious reader.\n\n{items_text}",
                system="Return a JSON array of objects with keys: \"index\" (1-based), \"score\" (float 0-1)."
            )
            scores = result if isinstance(result, list) else result.get("scores", result.get("items", []))
        except Exception as e:
            logger.warning("LLM quality scoring failed, using default 0.6: %s", e)
            scores = [{"index": i + 1, "score": 0.6} for i in range(len(batch))]

        score_map = {s.get("index", 0): s.get("score", 0.5) for s in scores}

        for i, item in enumerate(batch):
            score = score_map.get(i + 1, 0.5)
            if score >= 0.4:
                scored.append(ScoredArticle(
                    **item.model_dump(),
                    quality_score=score,
                ))

    await event_bus.publish(state["user_id"], "status", {"stage": "quality_filter", "progress": 100, "message": f"Kept {len(scored)}/{len(items)} articles"})
    return {"scored_items": scored}
