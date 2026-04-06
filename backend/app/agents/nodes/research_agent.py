"""Phase 1 (topic selection) + Phase 2 (source gathering) of the research pipeline.

Phase 1 uses a topic diversity system:
  - Sub-domain rotation: each interest maps to 8-12 sub-domains, rotated so
    the same sub-domain isn't reused until all others have been visited.
  - Topic history: per-user memory of every topic shown, with angle tracking.
  - Topic selector subagent: LLM call with strict rules against pop-science
    clichés, forced to pick from specific sub-domains with exclusion lists.
  - Angle rotation: cycles through 7 framing angles so the user never sees
    the same style of essay twice in a row.

Phase 2: Concurrent free-API fetches — zero LLM calls.
"""

import asyncio
import logging
import random
import uuid as uuid_mod
from datetime import date

from app.agents.sources import (
    Source,
    fetch_gutenberg,
    fetch_open_library,
    fetch_sep,
    fetch_semantic_scholar,
    fetch_web_search,
    fetch_wikipedia,
    fetch_youtube_transcript,
    score_sources,
)
from app.agents.state import DigestState
from app.agents.subdomain_map import get_subdomains
from app.database import async_session
from app.schemas.research import ResearchBundle, ResearchSourceSchema
from app.services import llm
from app.services.event_bus import event_bus
from app.services.topic_history import (
    get_topic_exclusions,
    get_used_angles,
    get_used_subdomains,
    record_topics,
)

logger = logging.getLogger(__name__)

MIN_SOURCES = 1
TARGET_ESSAYS = 7

# The 7 angle framings — the pipeline rotates through these
ANGLE_TYPES = [
    "historical origin",
    "modern research update",
    "counterintuitive finding",
    "cross-cultural perspective",
    "practical application",
    "critique of mainstream view",
    "niche case study",
]

# Pop-science/pop-philosophy topics to explicitly ban
BANNED_TOPICS = [
    "Baader-Meinhof phenomenon", "frequency illusion",
    "Ship of Theseus", "trolley problem", "Dunning-Kruger effect",
    "Plato's Cave", "allegory of the cave", "butterfly effect",
    "Schrödinger's cat", "Pavlov's dogs", "Stanford prison experiment",
    "Milgram experiment", "Maslow's hierarchy", "impostor syndrome",
    "confirmation bias", "cognitive dissonance", "anchoring bias",
    "sunk cost fallacy", "bystander effect", "Occam's razor",
    "Sapir-Whorf hypothesis", "Stockholm syndrome",
    "Turing test", "Chinese room argument", "simulation hypothesis",
    "Fermi paradox", "Drake equation", "Monty Hall problem",
    "prisoner's dilemma", "tragedy of the commons",
    "Peter principle", "Pareto principle", "Murphy's law",
]

# Intent-specific prompt modifiers
_INTENT_PROMPTS = {
    "balanced": "",
    "go_deeper": (
        "The reader wants to GO DEEPER. Pick ADVANCED, specialist sub-topics — "
        "contested questions, frontier research, niche debates that only people "
        "deep in the field would know about. Assume the reader has already read "
        "the Wikipedia page on every obvious topic.\n"
    ),
    "surprise_me": (
        "The reader wants to be SURPRISED. Pick topics that create unexpected "
        "connections across disciplines — where this sub-domain intersects with "
        "something nobody would expect. The more lateral, the better.\n"
    ),
    "new_territory": (
        "The reader wants completely NEW TERRITORY. Avoid well-trodden paths. "
        "Find obscure corners, forgotten thinkers, emerging questions. If a concept "
        "would appear in a 'Top 10' listicle, SKIP IT.\n"
    ),
}


def _pick_subdomain(
    interest: str,
    used_subdomains: list[str],
) -> str | None:
    """Pick the next sub-domain for this interest using round-robin rotation.

    Returns None if no sub-domains are mapped (falls back to interest-level).
    """
    all_subdomains = get_subdomains(interest)
    if not all_subdomains:
        return None

    # Find sub-domains not yet used
    unused = [sd for sd in all_subdomains if sd not in used_subdomains]

    # If all have been used, reset rotation — pick from all
    if not unused:
        unused = all_subdomains

    return random.choice(unused)


def _pick_angle(used_angles: list[str]) -> str:
    """Pick the next angle, avoiding recently used ones."""
    unused = [a for a in ANGLE_TYPES if a not in used_angles]
    if not unused:
        unused = ANGLE_TYPES
    return random.choice(unused)


async def _select_topic_for_subdomain(
    interest: str,
    sub_domain: str | None,
    angle: str,
    exclusion_list: list[str],
    reading_context: dict | None = None,
    interest_description: str | None = None,
    intent: str = "balanced",
    matched_articles: list | None = None,
) -> dict | None:
    """Topic selector subagent: one LLM call to pick a specific, non-obvious topic."""

    domain_label = sub_domain or interest
    today = date.today().strftime("%A, %B %d, %Y")

    # Build exclusion string
    exclusion_str = ""
    if exclusion_list:
        exclusion_str = (
            f"\nEXCLUSION LIST (absolute — do NOT use these topics, even as passing "
            f"references or examples):\n"
            + "\n".join(f"- {t}" for t in exclusion_list[:30])
            + "\n"
        )

    # Banned topics string
    banned_str = "\n".join(f"- {t}" for t in BANNED_TOPICS)

    # Article context
    context = ""
    if matched_articles:
        context = "Recent articles the reader engaged with:\n"
        context += "\n".join(
            f"- {a.title}: {a.summary[:80]}" for a in matched_articles[:3]
        )
        context += "\n"

    # Reading history
    history_instruction = ""
    if reading_context:
        bookmarked = reading_context.get("bookmarked_topics", [])
        more_like = reading_context.get("more_like_topics", [])
        different_from = reading_context.get("different_from_topics", [])

        if bookmarked:
            history_instruction += (
                f"The reader SAVED essays on: {', '.join(bookmarked[:8])}. "
                f"Explore adjacent territory.\n"
            )
        if more_like:
            history_instruction += (
                f"The reader wants MORE like: {', '.join(more_like[:8])}. "
                f"Go deeper into these areas.\n"
            )
        if different_from:
            history_instruction += (
                f"The reader wants DIFFERENT from: {', '.join(different_from[:8])}. "
                f"Avoid these entirely.\n"
            )

    # Depth calibration
    depth_instruction = ""
    if interest_description:
        depth_instruction = (
            f"The reader describes their level as: \"{interest_description}\". "
            f"Calibrate accordingly.\n"
        )

    intent_prompt = _INTENT_PROMPTS.get(intent, "")

    system_prompt = (
        "You are a topic curator for long-form intellectual essays. Your ONLY job "
        "is to select a specific, non-obvious topic within a given sub-domain.\n\n"
        "Rules you must follow without exception:\n"
        "- Never suggest topics that dominate pop-science or pop-philosophy content "
        "online. These are BANNED:\n"
        f"{banned_str}\n\n"
        "- Prefer topics sourced from academic journals, recent studies (post-2015), "
        "or niche historical events — not viral blog posts or TED talks.\n"
        "- The topic must be specific enough to write a 700-word essay about. "
        "Not a whole field, but a particular finding, person, event, or idea.\n"
        "- If given an exclusion list, treat it as ABSOLUTE.\n"
        "Return JSON only. No preamble, no markdown fences."
    )

    user_prompt = (
        f"Today is {today}.\n\n"
        f"Domain: {interest}\n"
        f"Sub-domain: {domain_label}\n"
        f"Required angle/framing: {angle}\n\n"
        f"{context}"
        f"{intent_prompt}"
        f"{depth_instruction}"
        f"{history_instruction}"
        f"{exclusion_str}\n"
        f"Select ONE specific, non-obvious topic within '{domain_label}' "
        f"using the '{angle}' framing.\n\n"
        f"Return JSON with:\n"
        f"- topic: specific topic name (a concept, person, event, or finding)\n"
        f"- angle: a SPECIFIC debatable thesis statement framed as a '{angle}'. "
        f"Write it as a claim someone could argue for or against. "
        f"Example: 'The Hawthorne effect was never real — the original data was fabricated.' "
        f"NOT: 'An exploration of workplace psychology.'\n"
        f"- search_queries: array of 7 SPECIFIC search strings — one each for: "
        f"philosophy encyclopedia, academic papers, youtube lectures, wikipedia, "
        f"books (Open Library), classic texts (Project Gutenberg), general web search. "
        f"Use concept name, key researchers, or key terms in each query."
    )

    try:
        result = await llm.complete_json(
            user_prompt,
            system=system_prompt,
            max_tokens=400,
            temperature=0.95,
        )
        if result.get("topic"):
            return result
    except Exception as e:
        logger.warning("Topic selector failed for %s/%s: %s", interest, domain_label, e)

    return None


def _normalize_concept(concept: str) -> str:
    """Normalize a concept name for dedup comparison."""
    c = concept.lower().strip()
    for prefix in ["the concept of ", "the ", "a ", "an "]:
        if c.startswith(prefix):
            c = c[len(prefix):]
    c = c.strip("'\"")
    return c


def _deduplicate_topics(all_topics: list[tuple[str, str | None, str, dict]]) -> list[tuple[str, str | None, str, dict]]:
    """Remove duplicate topics. Each item: (interest, sub_domain, angle, topic_data)."""
    seen_concepts: list[str] = []
    unique: list[tuple[str, str | None, str, dict]] = []

    for entry in all_topics:
        concept = _normalize_concept(entry[3].get("topic", ""))
        if not concept:
            continue

        # Check against banned topics
        is_banned = any(
            banned.lower() in concept or concept in banned.lower()
            for banned in BANNED_TOPICS
        )
        if is_banned:
            logger.info("Filtered banned topic: '%s'", concept)
            continue

        is_dup = False
        for seen in seen_concepts:
            if concept in seen or seen in concept:
                is_dup = True
                break
            words_a = set(concept.split())
            words_b = set(seen.split())
            if words_a and words_b:
                overlap = len(words_a & words_b) / min(len(words_a), len(words_b))
                if overlap > 0.5:
                    is_dup = True
                    break
        if not is_dup:
            seen_concepts.append(concept)
            unique.append(entry)

    return unique


async def _gather_sources(queries: list[str]) -> list[Source]:
    """Phase 2: concurrent free-API fetches, zero LLM calls."""
    if len(queries) < 7:
        queries.extend([queries[0] if queries else ""] * (7 - len(queries)))

    results = await asyncio.gather(
        fetch_sep(queries[0]),
        fetch_semantic_scholar(queries[1]),
        fetch_youtube_transcript(queries[2]),
        fetch_wikipedia(queries[3]),
        fetch_open_library(queries[4]),
        fetch_gutenberg(queries[5]),
        fetch_web_search(queries[6]),
        return_exceptions=True,
    )

    sources: list[Source] = []
    for r in results:
        if isinstance(r, Exception):
            logger.warning("Source fetch raised: %s", r)
        elif isinstance(r, list):
            sources.extend(r)
        elif r is not None:
            sources.append(r)

    return sources


async def _research_topic(topic_data: dict, interest: str, length_tier: str = "deep_dive") -> ResearchBundle | None:
    """Full Phase 2 for a single topic."""
    concept = topic_data.get("topic", interest)
    angle = topic_data.get("angle", f"An exploration of {interest}")
    queries = topic_data.get("search_queries", [concept] * 7)

    raw_sources = await _gather_sources(queries)
    sources = await score_sources(raw_sources, concept, angle)
    logger.info(
        "Sources for '%s': %d raw → %d after relevance filter",
        concept, len(raw_sources), len(sources),
    )

    if len(sources) < MIN_SOURCES:
        logger.warning(
            "Only %d sources for '%s' (need %d), skipping",
            len(sources), concept, MIN_SOURCES,
        )
        return None

    return ResearchBundle(
        topic=concept,
        thesis=angle,
        sources=[
            ResearchSourceSchema(
                source_type=s.source_type,
                title=s.title,
                author=s.author,
                url=s.url,
                excerpt=s.excerpt,
            )
            for s in sources
        ],
        outline=[],
        length_tier=length_tier,
    )


async def research_agent(state: DigestState) -> dict:
    """Generate research bundles with topic diversity system."""
    user_id_str = state["user_id"]
    user_id = uuid_mod.UUID(user_id_str) if isinstance(user_id_str, str) else user_id_str

    await event_bus.publish(
        state["user_id"], "status",
        {"stage": "research_agent", "progress": 0, "message": "Selecting diverse topics..."},
    )

    interest_topics = state.get("research_topics", []) or state.get("interest_topics", [])
    matched = state.get("matched_articles", [])
    avoid_topics = state.get("avoid_topics", [])
    reading_context = state.get("reading_context", {})
    interest_descriptions = state.get("interest_descriptions", {})
    intent = state.get("generation_intent", "balanced")

    if not interest_topics:
        return {"research_bundles": []}

    # --- TOPIC DIVERSITY SYSTEM ---

    # Load per-user topic history from database
    async with async_session() as db:
        # Get full exclusion list (90 days of topics)
        history = await get_topic_exclusions(db, user_id, days=90)
        history_topics = [h["topic"] for h in history]

        # Build master exclusion list: history + avoid_topics + read topics
        full_exclusion = list(set(
            history_topics
            + (avoid_topics or [])
            + reading_context.get("read_topics", [])
            + [b.lower() for b in BANNED_TOPICS]
        ))

        # Distribute essay slots across interests
        active_interests = interest_topics[:5]
        essays_per_interest = max(1, TARGET_ESSAYS // len(active_interests))
        remainder = TARGET_ESSAYS - (essays_per_interest * len(active_interests))

        # Phase 1: select topics via subagent — one per sub-domain slot
        all_topics: list[tuple[str, str | None, str, dict]] = []  # (interest, sub_domain, angle, data)
        topic_tasks = []

        for i, interest in enumerate(active_interests):
            count = essays_per_interest + (1 if i < remainder else 0)

            # Get used sub-domains and angles for this interest
            used_sds = await get_used_subdomains(db, user_id, interest)
            used_angles = await get_used_angles(db, user_id, interest, last_n=count + 2)

            for j in range(count):
                sub_domain = _pick_subdomain(interest, used_sds)
                angle = _pick_angle(used_angles)

                # Track what we've picked this round to avoid within-batch repeats
                if sub_domain:
                    used_sds.append(sub_domain)
                used_angles.append(angle)

                # Build per-topic exclusion: global + interest-specific
                interest_history = [
                    h["topic"] for h in history if h["domain"] == interest
                ]
                topic_exclusion = list(set(full_exclusion + interest_history))

                topic_tasks.append((
                    interest, sub_domain, angle,
                    _select_topic_for_subdomain(
                        interest=interest,
                        sub_domain=sub_domain,
                        angle=angle,
                        exclusion_list=topic_exclusion,
                        reading_context=reading_context,
                        interest_description=interest_descriptions.get(interest),
                        intent=intent,
                        matched_articles=matched,
                    )
                ))

    # Execute all topic selection calls concurrently
    coros = [t[3] for t in topic_tasks]
    results = await asyncio.gather(*coros, return_exceptions=True)

    for (interest, sub_domain, angle, _), result in zip(topic_tasks, results):
        if isinstance(result, Exception):
            logger.warning("Topic selection failed for %s/%s: %s", interest, sub_domain, result)
            continue
        if result and result.get("topic"):
            all_topics.append((interest, sub_domain, angle, result))

    # Deduplicate and filter banned topics
    unique_topics = _deduplicate_topics(all_topics)
    logger.info("Topics: %d total → %d after dedup + ban filter", len(all_topics), len(unique_topics))

    # Record selected topics to history
    async with async_session() as db:
        history_entries = [
            {
                "topic": entry[3].get("topic", ""),
                "domain": entry[0],
                "sub_domain": entry[1],
                "angle": entry[2],
            }
            for entry in unique_topics
        ]
        if history_entries:
            await record_topics(db, user_id, history_entries)
            await db.commit()

    # Phase 2: gather sources for each topic (parallel, no LLM)
    await event_bus.publish(
        state["user_id"], "status",
        {"stage": "research_agent", "progress": 40, "message": f"Gathering sources for {len(unique_topics)} topics..."},
    )

    research_tasks = []
    for idx, (interest, sub_domain, angle, topic_data) in enumerate(unique_topics):
        tier = "deep_dive" if idx % 3 != 2 else "quick_read"
        research_tasks.append(_research_topic(topic_data, interest, tier))

    results = await asyncio.gather(*research_tasks, return_exceptions=True)
    bundles = [r for r in results if isinstance(r, ResearchBundle)]

    await event_bus.publish(
        state["user_id"], "status",
        {"stage": "research_agent", "progress": 100, "message": f"Researched {len(bundles)} topics"},
    )
    return {"research_bundles": bundles}
