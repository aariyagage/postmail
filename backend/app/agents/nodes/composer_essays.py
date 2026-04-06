"""Phase 3 — Essay synthesis: knowledge-first writing with source context (2 Groq calls per essay)."""

import asyncio
import logging
import random

from app.agents.state import DigestState
from app.schemas.essay import EssayOutput
from app.schemas.research import ResearchBundle, ResearchSourceSchema
from app.services import llm
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Essay voice personas — rotated across essays for variety
# ---------------------------------------------------------------------------

VOICES = [
    {
        "system": (
            "You are a narrative journalist. You write like the best long-form "
            "pieces in The Atlantic or GQ — grounded in scenes, people, and "
            "concrete detail. You open with a specific moment, not an abstraction."
        ),
        "open_instruction": (
            "Open with a specific scene, person, or moment in history — "
            "NOT a rhetorical question, NOT 'Imagine...', NOT a dictionary definition."
        ),
    },
    {
        "system": (
            "You are a public intellectual writing for Aeon magazine. You build "
            "arguments the way a philosopher does — state a bold claim early, "
            "then defend it with evidence, anticipate objections, and resolve them."
        ),
        "open_instruction": (
            "Open with your boldest claim — the thesis itself — stated plainly "
            "in one sentence. Then immediately present the strongest objection "
            "to it. Do NOT open with a question or 'Imagine...'."
        ),
    },
    {
        "system": (
            "You are an essayist in the tradition of Oliver Sacks and Mary Roach — "
            "you explain complex ideas through fascinating case studies, real "
            "experiments, and the people behind them. Curiosity is your engine."
        ),
        "open_instruction": (
            "Open with a real person, a real experiment, or a specific historical "
            "event. Ground the reader in something concrete before going abstract. "
            "Do NOT open with 'Imagine...', 'What if...', or a rhetorical question."
        ),
    },
    {
        "system": (
            "You are an essayist who writes like a great letter to a smart friend — "
            "direct, opinionated, occasionally funny, never pretentious. You write "
            "for Nautilus or Works in Progress."
        ),
        "open_instruction": (
            "Open with a surprising, specific fact — a number, a date, a name, "
            "something the reader didn't know five seconds ago. "
            "Do NOT open with 'Imagine...', a rhetorical question, or a vague abstraction."
        ),
    },
    {
        "system": (
            "You are a cultural critic who connects ideas across disciplines — science "
            "to art, history to technology, philosophy to everyday life. You write "
            "like the best pieces in The New Yorker's culture section."
        ),
        "open_instruction": (
            "Open with a juxtaposition — two things that shouldn't be connected but are. "
            "A painting and a physics equation. A Supreme Court case and a pop song. "
            "Do NOT open with 'Imagine...', 'What if...', or 'In today's world...'."
        ),
    },
]

# Cliché openers and closings to ban
BANNED = (
    "BANNED PATTERNS (do NOT use any of these):\n"
    "Openers: 'Imagine...', 'What if...', 'In today's fast-paced world...', "
    "'Have you ever wondered...', 'Picture this...', 'In an era of...', "
    "'Throughout history...', 'Since the dawn of time...', "
    "'It's no secret that...', 'In recent years...', 'In the [decade/year]...', "
    "'One [adjective] day...', 'On a [adjective] [day/morning/evening]...', "
    "'It was [year] when...', 'The year was...', 'Back in [year]...'.\n"
    "DO NOT open with a historical scene-setting sentence that starts with a year, date, or era. "
    "DO NOT open with 'In [year], a [profession] in [city]...' — this is the single most overused pattern.\n"
    "Closings: Do NOT end with 'As we gaze at the stars...', 'As the sun sets...', "
    "'The darkness stretches...', or any generic cosmic imagery. "
    "Do NOT end with 'In conclusion...', 'Ultimately...', or a summary of what you just said. "
    "End with a specific, concrete thought that gives the reader something to chew on."
)

# Specific opening moves — one assigned per essay to force structural variety.
# These override the voice's open_instruction when assigned.
OPENING_MOVES = [
    "Open with a direct quote from a named person — a philosopher, scientist, writer, or practitioner. "
    "Attribute it, then immediately complicate or challenge what they said.",
    "Open with a single striking statistic or measurement. No preamble — just the number and what it means. "
    "Then pivot to why that number is wrong, misleading, or more interesting than it appears.",
    "Open with your thesis — your boldest claim — stated plainly in one declarative sentence. "
    "Then immediately present the strongest objection to it.",
    "Open by describing something the reader does every day without thinking about it — a habit, "
    "a reflex, a default assumption. Then reveal the hidden complexity inside that ordinary thing.",
    "Open with a paradox or contradiction — two true things that seem incompatible. "
    "State both plainly, then explain why the tension matters.",
    "Open with a short, punchy anecdote about a SPECIFIC person — use their name, what they did, "
    "and what happened. No more than 3 sentences. Do NOT set a scene with weather, time period, or geography.",
    "Open with a question that the reader cannot immediately answer — not rhetorical, but genuinely puzzling. "
    "Something that makes them pause. Then begin answering it in an unexpected way.",
    "Open mid-argument, as if the reader walked into the middle of a debate. "
    "Take a strong position in sentence one. Defend it in sentence two. No setup, no context — just the argument.",
]


async def _compose_one(
    bundle: ResearchBundle,
    voice_index: int,
    move_index: int | None = None,
    sibling_topics: list[str] | None = None,
) -> EssayOutput:
    voice = VOICES[voice_index % len(VOICES)]
    opening_move = OPENING_MOVES[(move_index if move_index is not None else voice_index) % len(OPENING_MOVES)]

    # Build source context block — these inform the essay, not constrain it
    source_context = ""
    for i, s in enumerate(bundle.sources, 1):
        parts = [f"[{i}] {s.title}"]
        if s.author:
            parts.append(f"by {s.author}")
        if s.url:
            parts.append(f"({s.url})")
        parts.append(f"\n{s.excerpt or '(no excerpt)'}")
        source_context += " ".join(parts) + "\n\n"

    # ---- Call 1: write the essay ----
    try:
        essay_body = await llm.complete(
            f"TOPIC: {bundle.topic}\n"
            f"THESIS: {bundle.thesis}\n\n"
            f"REFERENCE MATERIAL (use as context and further reading, but write primarily from your own knowledge):\n"
            f"{source_context}\n"
            f"REQUIREMENTS:\n"
            f"- Write a 600-800 word essay. This is the target — not shorter, not longer.\n"
            f"- YOUR OPENING MOVE (follow this exactly): {opening_move}\n"
            f"- Write from your knowledge of this topic. The sources above are context and inspiration, "
            f"not your only material. You know far more about {bundle.topic} than what's in those excerpts.\n"
            f"- Use real names, dates, experiments, and specific details. No vague hand-waving.\n"
            f"- EVERY paragraph must introduce a NEW idea. NEVER restate your thesis or repeat a point "
            f"you already made. If you catch yourself writing something similar to a previous paragraph, skip it.\n"
            f"- Structure: opening hook → thesis → 3-4 body paragraphs each advancing the argument → "
            f"one strong closing thought.\n"
            f"- Include one counterargument and address it honestly in a single paragraph.\n"
            f"- {BANNED}\n"
            f"- Write in plain, muscular prose. No filler phrases like 'it is worth noting', "
            f"'it is important to remember', 'this is significant because'.\n"
            f"- Write the essay now. Output ONLY the essay text, no title, no metadata.",
            system=voice["system"],
            temperature=0.75,
            max_tokens=1800,
        )
    except Exception as e:
        logger.warning("Essay body LLM call failed for %s: %s", bundle.topic, e)
        return _fallback_essay(bundle)

    word_count = len(essay_body.split())

    # ---- Call 2: title + standfirst ----
    # Pass sibling topics so the LLM avoids similar-sounding titles
    sibling_note = ""
    if sibling_topics:
        others = [t for t in sibling_topics if t != bundle.topic]
        if others:
            sibling_note = (
                f"\nOTHER ESSAYS IN THIS EDITION (your title must feel completely different from these topics): "
                f"{', '.join(others)}\n"
            )

    try:
        meta = await llm.complete_json(
            f"You are writing the headline and subtitle for this magazine essay.\n\n"
            f"Essay topic: {bundle.topic}\n"
            f"Essay thesis: {bundle.thesis}\n"
            f"Essay opening:\n{essay_body[:600]}\n"
            f"{sibling_note}\n"
            f"Write a title and standfirst (subtitle) for this essay.\n\n"
            f"TITLE RULES:\n"
            f"- 2-6 words. Evocative, not descriptive.\n"
            f"- The title must NOT contain the topic name or any obvious keyword from it. "
            f"For example, if the topic is 'The Ship of Theseus', do NOT put 'Theseus' or 'Ship' in the title. "
            f"Find a lateral, evocative framing.\n"
            f"- Do NOT use 'The [Noun] [Noun]' pattern (e.g. 'The Echo Chamber', 'The Meme Effect').\n"
            f"- Do NOT use colons in the title.\n"
            f"- Do NOT start with 'Beyond', 'On', 'Against', or 'Why'.\n"
            f"- Each title in a magazine issue must feel like a DIFFERENT genre. Vary structure: "
            f"try a verb phrase, a fragment, a provocation, a single evocative word, or a short sentence.\n"
            f"- Think of titles like: 'Consider the Lobster', 'The Egg', "
            f"'How to Do Nothing', 'Skin in the Game', 'Fooled by Randomness'.\n\n"
            f"STANDFIRST RULES:\n"
            f"- One sentence, 10-20 words.\n"
            f"- It should make someone want to read the essay — sell the tension, not summarize.",
            system='Return JSON only: {"title": "...", "standfirst": "..."}',
            max_tokens=150,
        )
        title = meta.get("title", f"On {bundle.topic}")
        standfirst = meta.get("standfirst", bundle.thesis)
    except Exception as e:
        logger.warning("Title/standfirst LLM call failed: %s", e)
        title = f"On {bundle.topic}"
        standfirst = bundle.thesis

    return EssayOutput(
        title=title,
        subtitle=standfirst,
        body_markdown=essay_body,
        thesis=bundle.thesis,
        topic=bundle.topic,
        word_count=word_count,
        reading_time_minutes=max(1, word_count // 250),
        length_tier=bundle.length_tier,
        sources=[ResearchSourceSchema(**s.model_dump()) for s in bundle.sources],
    )


def _fallback_essay(bundle: ResearchBundle) -> EssayOutput:
    body = (
        f"# {bundle.topic}\n\n"
        f"{bundle.thesis}\n\n"
        f"This topic remains an active area of discussion and research.\n"
    )
    return EssayOutput(
        title=f"On {bundle.topic}",
        subtitle=bundle.thesis,
        body_markdown=body,
        thesis=bundle.thesis,
        topic=bundle.topic,
        word_count=len(body.split()),
        reading_time_minutes=1,
        sources=[ResearchSourceSchema(**s.model_dump()) for s in bundle.sources],
    )


async def composer_essays(state: DigestState) -> dict:
    """Compose Track 2 essays from research bundles (2 Groq calls each)."""
    await event_bus.publish(
        state["user_id"], "status",
        {"stage": "composer_essays", "progress": 0, "message": "Writing essays..."},
    )

    bundles = state.get("research_bundles", [])
    if not bundles:
        return {"raw_essays": []}

    # Collect all topics so each essay's title generator knows its siblings
    all_topics = [b.topic for b in bundles]

    # Shuffle assignment so voices and opening moves don't always pair the same way
    voice_indices = list(range(len(VOICES)))
    move_indices = list(range(len(OPENING_MOVES)))
    random.shuffle(voice_indices)
    random.shuffle(move_indices)

    essays = await asyncio.gather(*[
        _compose_one(b, voice_indices[i % len(VOICES)], move_indices[i % len(OPENING_MOVES)], sibling_topics=all_topics)
        for i, b in enumerate(bundles)
    ])

    await event_bus.publish(
        state["user_id"], "status",
        {"stage": "composer_essays", "progress": 100, "message": f"Wrote {len(essays)} essays"},
    )
    return {"raw_essays": list(essays)}
