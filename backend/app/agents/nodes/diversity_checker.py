"""Post-generation diversity gate.

After essays are composed, this node checks each one against the user's
recent essay history. If keyword/topic overlap exceeds 40%, the essay is
rejected and re-generated with a stronger constraint. Max 2 retries per
essay before it's dropped with a warning.
"""

import asyncio
import logging
import re
import uuid as uuid_mod
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.nodes.composer_essays import _compose_one, VOICES, OPENING_MOVES
from app.agents.nodes.research_agent import (
    _select_topic_for_subdomain,
    _research_topic,
    _normalize_concept,
    BANNED_TOPICS,
)
from app.agents.state import DigestState
from app.database import async_session
from app.models.digest import Digest
from app.models.essay import Essay as EssayModel
from app.schemas.essay import EssayOutput
from app.schemas.research import ResearchBundle, ResearchSourceSchema
from app.services.event_bus import event_bus
from app.services.topic_history import record_topics

logger = logging.getLogger(__name__)

MAX_RETRIES = 2
SIMILARITY_THRESHOLD = 0.40

# Common English stop words to exclude from concept extraction
_STOP_WORDS = frozenset({
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "must", "ought",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
    "us", "them", "my", "your", "his", "its", "our", "their", "mine",
    "yours", "hers", "ours", "theirs", "this", "that", "these", "those",
    "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
    "all", "each", "every", "both", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "just", "because", "as", "until", "while", "of", "at", "by",
    "for", "with", "about", "against", "between", "through", "during",
    "before", "after", "above", "below", "to", "from", "up", "down", "in",
    "out", "on", "off", "over", "under", "again", "further", "then", "once",
    "here", "there", "and", "but", "or", "if", "also", "into", "one", "two",
    "new", "way", "many", "much", "even", "still", "yet", "like", "well",
    "back", "first", "last", "long", "great", "little", "right", "old",
    "big", "high", "different", "small", "large", "next", "early", "young",
    "important", "public", "bad", "however", "often", "another", "become",
    "make", "made", "work", "part", "take", "get", "place", "case", "world",
    "think", "know", "say", "said", "find", "found", "give", "tell", "may",
    "come", "see", "time", "year", "people", "thing", "point", "fact",
})


def _extract_concepts(text: str, topic: str, n: int = 20) -> set[str]:
    """Extract key concept words from essay text + topic.

    Returns a set of meaningful lowercase words (no stop words, no short words).
    """
    combined = f"{topic} {text}"
    # Extract words, lowercase, strip punctuation
    words = re.findall(r"[a-zA-Z]{4,}", combined.lower())
    # Filter stop words
    meaningful = [w for w in words if w not in _STOP_WORDS]
    # Count frequency and return top N unique terms
    freq: dict[str, int] = {}
    for w in meaningful:
        freq[w] = freq.get(w, 0) + 1
    sorted_words = sorted(freq.keys(), key=lambda w: freq[w], reverse=True)
    return set(sorted_words[:n])


def _compute_similarity(concepts_a: set[str], concepts_b: set[str]) -> float:
    """Compute keyword overlap as a fraction of the smaller set."""
    if not concepts_a or not concepts_b:
        return 0.0
    overlap = len(concepts_a & concepts_b)
    return overlap / min(len(concepts_a), len(concepts_b))


async def _load_recent_essays(
    user_id: uuid_mod.UUID,
    db: AsyncSession,
    limit: int = 5,
) -> list[dict]:
    """Load the user's last N essays with their text for comparison."""
    result = await db.execute(
        select(EssayModel)
        .join(Digest, EssayModel.digest_id == Digest.id)
        .where(Digest.user_id == user_id)
        .order_by(EssayModel.created_at.desc())
        .limit(limit)
    )
    essays = result.scalars().all()
    return [
        {
            "topic": e.topic,
            "body": e.body_markdown or "",
            "concepts": _extract_concepts(e.body_markdown or "", e.topic),
        }
        for e in essays
    ]


def _check_essay_diversity(
    essay: EssayOutput,
    recent_essays: list[dict],
) -> tuple[bool, float, str | None]:
    """Check if an essay is too similar to recent ones.

    Returns (is_diverse, max_similarity, most_similar_topic).
    """
    new_concepts = _extract_concepts(essay.body_markdown, essay.topic)
    max_sim = 0.0
    most_similar = None

    for recent in recent_essays:
        sim = _compute_similarity(new_concepts, recent["concepts"])
        if sim > max_sim:
            max_sim = sim
            most_similar = recent["topic"]

    return max_sim < SIMILARITY_THRESHOLD, max_sim, most_similar


async def _retry_essay(
    bundle: ResearchBundle,
    attempt: int,
    rejected_topic: str,
    similar_to: str,
    state: DigestState,
) -> EssayOutput | None:
    """Re-run topic selection and composition with stronger constraints."""
    user_id_str = state["user_id"]
    interest_topics = state.get("interest_topics", [])
    reading_context = state.get("reading_context", {})
    interest_descriptions = state.get("interest_descriptions", {})
    intent = state.get("generation_intent", "balanced")

    # Pick the domain from the original bundle's topic
    domain = bundle.topic
    for it in interest_topics:
        if it.lower() in bundle.topic.lower() or bundle.topic.lower() in it.lower():
            domain = it
            break

    constraint = (
        f"Previous attempt produced '{rejected_topic}' which was too similar to "
        f"the reader's recent essay on '{similar_to}'. Be MORE AGGRESSIVE in "
        f"finding an obscure angle. Pick something the reader has NEVER encountered. "
        f"Go deeper into niche territory."
    )
    if attempt >= 2:
        constraint += (
            " This is the FINAL attempt. Pick the most unusual, least-expected "
            "topic you can find in this sub-domain. Academic journal deep cuts only."
        )

    # Expanded exclusion with the rejected topic
    exclusion = [rejected_topic, similar_to]

    topic_data = await _select_topic_for_subdomain(
        interest=domain,
        sub_domain=None,  # let it pick freely
        angle="niche case study",  # force niche angle on retry
        exclusion_list=exclusion,
        reading_context=reading_context,
        interest_description=interest_descriptions.get(domain),
        intent=intent,
    )

    if not topic_data or not topic_data.get("topic"):
        logger.warning("Retry topic selection returned nothing (attempt %d)", attempt)
        return None

    # Research the new topic
    new_bundle = await _research_topic(topic_data, domain, bundle.length_tier)
    if not new_bundle:
        logger.warning("Retry source gathering failed (attempt %d)", attempt)
        return None

    # Compose with a random voice/move
    import random
    voice_idx = random.randint(0, len(VOICES) - 1)
    move_idx = random.randint(0, len(OPENING_MOVES) - 1)

    essay = await _compose_one(new_bundle, voice_idx, move_idx)

    # Record the new topic to history
    user_id = uuid_mod.UUID(user_id_str) if isinstance(user_id_str, str) else user_id_str
    async with async_session() as db:
        await record_topics(db, user_id, [{
            "topic": topic_data.get("topic", ""),
            "domain": domain,
            "sub_domain": None,
            "angle": "niche case study",
        }])
        await db.commit()

    return essay


async def diversity_checker(state: DigestState) -> dict:
    """Post-generation diversity gate. Checks essays against user history."""
    user_id_str = state["user_id"]
    user_id = uuid_mod.UUID(user_id_str) if isinstance(user_id_str, str) else user_id_str
    essays = state.get("raw_essays", [])

    if not essays:
        return {"essays": []}

    await event_bus.publish(
        user_id_str, "status",
        {"stage": "composer_essays", "progress": 80, "message": "Checking essay diversity..."},
    )

    # Load recent essays for comparison
    async with async_session() as db:
        recent_essays = await _load_recent_essays(user_id, db, limit=5)

    if not recent_essays:
        # No history — all essays pass
        logger.info("No recent essays for diversity check, all %d pass", len(essays))
        return {"essays": essays}

    # Check each essay
    passed: list[EssayOutput] = []
    # Build the bundles lookup from research_bundles for retries
    bundles_by_topic = {
        b.topic: b for b in state.get("research_bundles", [])
    }

    for essay in essays:
        is_diverse, sim_score, similar_to = _check_essay_diversity(essay, recent_essays)

        if is_diverse:
            logger.info(
                "PASS: '%s' (max similarity %.0f%% with '%s')",
                essay.topic, sim_score * 100, similar_to or "none",
            )
            passed.append(essay)
            # Add this essay to the comparison set so later essays in the
            # same batch are also checked against it
            recent_essays.append({
                "topic": essay.topic,
                "body": essay.body_markdown,
                "concepts": _extract_concepts(essay.body_markdown, essay.topic),
            })
            continue

        logger.warning(
            "REJECT: '%s' — %.0f%% similar to '%s', attempting retry",
            essay.topic, sim_score * 100, similar_to,
        )

        # Retry loop
        bundle = bundles_by_topic.get(essay.topic)
        if not bundle:
            # Create a minimal bundle from the essay data for retry
            bundle = ResearchBundle(
                topic=essay.topic,
                thesis=essay.thesis or "",
                sources=[],
                outline=[],
                length_tier=essay.length_tier,
            )

        retried = False
        for attempt in range(1, MAX_RETRIES + 1):
            replacement = await _retry_essay(
                bundle, attempt, essay.topic, similar_to or "", state
            )
            if not replacement:
                continue

            # Check the replacement too
            is_div, new_sim, new_similar = _check_essay_diversity(replacement, recent_essays)
            if is_div:
                logger.info(
                    "RETRY SUCCESS (attempt %d): '%s' replaces '%s' (sim %.0f%%)",
                    attempt, replacement.topic, essay.topic, new_sim * 100,
                )
                passed.append(replacement)
                recent_essays.append({
                    "topic": replacement.topic,
                    "body": replacement.body_markdown,
                    "concepts": _extract_concepts(replacement.body_markdown, replacement.topic),
                })
                retried = True
                break
            else:
                logger.warning(
                    "RETRY STILL TOO SIMILAR (attempt %d): '%s' %.0f%% similar to '%s'",
                    attempt, replacement.topic, new_sim * 100, new_similar,
                )

        if not retried:
            logger.error(
                "DROPPED: '%s' — failed diversity check after %d retries",
                essay.topic, MAX_RETRIES,
            )

    logger.info(
        "Diversity check: %d essays in → %d passed (%d dropped)",
        len(essays), len(passed), len(essays) - len(passed),
    )

    await event_bus.publish(
        user_id_str, "status",
        {"stage": "composer_essays", "progress": 100, "message": f"Wrote {len(passed)} essays"},
    )

    return {"essays": passed}
