import logging
import math
import random

from app.agents.state import DigestState
from app.schemas.items import MatchedArticle
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _weighted_sample(scored_items: list[tuple], n: int) -> list[tuple]:
    """Sample n items from scored_items using relevance scores as weights.

    Guarantees the top-3 are always included for quality, then samples
    the remaining slots from the rest with score-weighted probability.
    """
    if len(scored_items) <= n:
        return scored_items

    # Always include top 3 for baseline quality
    guaranteed = scored_items[:3]
    candidates = scored_items[3:]

    remaining = n - len(guaranteed)
    if remaining <= 0 or not candidates:
        return guaranteed[:n]

    # Use scores as weights for sampling
    weights = [max(s[0], 0.01) for s in candidates]
    sampled = random.choices(candidates, weights=weights, k=min(remaining, len(candidates)))

    # Deduplicate (choices can repeat)
    seen = {id(item) for item in guaranteed}
    unique_sampled = []
    for item in sampled:
        if id(item) not in seen:
            seen.add(id(item))
            unique_sampled.append(item)

    # If we lost items to dedup, fill from remaining candidates
    if len(unique_sampled) < remaining:
        for item in candidates:
            if id(item) not in seen:
                unique_sampled.append(item)
                seen.add(id(item))
                if len(unique_sampled) >= remaining:
                    break

    result = guaranteed + unique_sampled
    # Sort by score so the best articles appear first in the digest
    result.sort(key=lambda x: x[0], reverse=True)
    return result


async def relevance_matcher(state: DigestState) -> dict:
    """Match scored items against user interests using cosine similarity, return ~10 with variety."""
    await event_bus.publish(state["user_id"], "status", {"stage": "relevance_matcher", "progress": 0, "message": "Matching articles to interests..."})

    items = state.get("scored_items", [])
    interest_embeddings = state.get("interest_embeddings", [])
    interest_topics = state.get("interest_topics", [])

    if not items:
        return {"matched_articles": []}

    # If no interest embeddings, pass through with weighted sampling for variety
    if not interest_embeddings:
        pool = items[:20]
        sampled = random.sample(pool, min(10, len(pool)))
        matched = [
            MatchedArticle(**item.model_dump(), relevance_score=0.5, matched_interests=[])
            for item in sampled
        ]
        await event_bus.publish(state["user_id"], "status", {"stage": "relevance_matcher", "progress": 100, "message": f"Matched {len(matched)} articles (no interest filter)"})
        return {"matched_articles": matched}

    scored_items = []
    for item in items:
        if not item.embedding:
            continue
        best_score = 0.0
        matched_interests = []
        for j, ie in enumerate(interest_embeddings):
            sim = _cosine_similarity(item.embedding, ie)
            if sim > 0.2:
                topic = interest_topics[j] if j < len(interest_topics) else "Unknown"
                matched_interests.append(topic)
            best_score = max(best_score, sim)

        scored_items.append((best_score, item, matched_interests))

    scored_items.sort(key=lambda x: x[0], reverse=True)

    # Weighted sample from top 25 instead of hard top-10
    top = _weighted_sample(scored_items[:25], 10)

    matched = [
        MatchedArticle(
            **item.model_dump(),
            relevance_score=round(score, 4),
            matched_interests=interests,
        )
        for score, item, interests in top
    ]

    await event_bus.publish(state["user_id"], "status", {"stage": "relevance_matcher", "progress": 100, "message": f"Matched {len(matched)} articles to interests"})
    return {"matched_articles": matched}
