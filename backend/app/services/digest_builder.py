import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.graph import digest_graph
from app.models.article import Article
from app.models.bookmark import Bookmark
from app.models.digest import Digest
from app.models.essay import Essay as EssayModel
from app.models.essay_feedback import EssayFeedback
from app.models.read_history import ReadHistory
from app.models.research_source import ResearchSource
from app.models.user import User
from app.schemas.essay import EssayOutput
from app.schemas.research import ResearchSourceSchema
from app.services import embeddings, llm
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)

ESSAY_CACHE_DAYS = 3


async def _check_essay_cache(
    db: AsyncSession, user_id: uuid.UUID, interest_topics: list[str]
) -> list[EssayOutput]:
    """Return cached essays for topics — scoped to THIS user's digests only."""
    if not interest_topics:
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=ESSAY_CACHE_DAYS)
    cached: list[EssayOutput] = []

    for topic in interest_topics[:5]:
        result = await db.execute(
            select(EssayModel)
            .options(selectinload(EssayModel.sources))
            .join(Digest, EssayModel.digest_id == Digest.id)
            .where(
                Digest.user_id == user_id,
                EssayModel.topic == topic,
                EssayModel.created_at > cutoff,
            )
            .order_by(EssayModel.created_at.desc())
            .limit(1)
        )
        essay = result.scalar_one_or_none()
        if essay:
            cached.append(EssayOutput(
                id=essay.id,
                title=essay.title,
                subtitle=essay.subtitle,
                body_markdown=essay.body_markdown,
                thesis=essay.thesis,
                topic=essay.topic,
                word_count=essay.word_count or 0,
                reading_time_minutes=essay.reading_time_minutes or 0,
                sources=[
                    ResearchSourceSchema(
                        source_type=s.source_type,
                        title=s.title,
                        author=s.author,
                        url=s.url,
                        excerpt=s.excerpt,
                    )
                    for s in essay.sources
                ],
            ))
            logger.info("Essay cache hit for topic %r (id=%s)", topic, essay.id)

    return cached


async def _get_user_reading_context(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Gather reading history and bookmarks to inform topic selection."""
    # Recent essay topics this user has READ (last 30 days)
    read_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    read_result = await db.execute(
        select(EssayModel.topic, EssayModel.thesis)
        .join(ReadHistory, ReadHistory.content_id == EssayModel.id)
        .where(
            ReadHistory.user_id == user_id,
            ReadHistory.content_type == "essay",
            ReadHistory.reading_progress >= 50,  # at least half-read
            ReadHistory.created_at > read_cutoff,
        )
        .distinct()
    )
    read_essays = [(row[0], row[1]) for row in read_result.all()]

    # Bookmarked essay topics (strong positive signal)
    bookmark_result = await db.execute(
        select(EssayModel.topic, EssayModel.thesis)
        .join(Bookmark, Bookmark.content_id == EssayModel.id)
        .where(
            Bookmark.user_id == user_id,
            Bookmark.content_type == "essay",
        )
        .distinct()
    )
    bookmarked_essays = [(row[0], row[1]) for row in bookmark_result.all()]

    # Essay feedback signals ("more like this" / "different direction")
    more_result = await db.execute(
        select(EssayModel.topic, EssayModel.thesis)
        .join(EssayFeedback, EssayFeedback.essay_id == EssayModel.id)
        .where(
            EssayFeedback.user_id == user_id,
            EssayFeedback.signal == "more",
        )
    )
    more_topics = [(row[0], row[1]) for row in more_result.all()]

    different_result = await db.execute(
        select(EssayModel.topic, EssayModel.thesis)
        .join(EssayFeedback, EssayFeedback.essay_id == EssayModel.id)
        .where(
            EssayFeedback.user_id == user_id,
            EssayFeedback.signal == "different",
        )
    )
    different_topics = [(row[0], row[1]) for row in different_result.all()]

    return {
        "read_topics": list({t for t, _ in read_essays}),
        "read_theses": [th for _, th in read_essays if th],
        "bookmarked_topics": list({t for t, _ in bookmarked_essays}),
        "bookmarked_theses": [th for _, th in bookmarked_essays if th],
        "more_like_topics": list({t for t, _ in more_topics}),
        "more_like_theses": [th for _, th in more_topics if th],
        "different_from_topics": list({t for t, _ in different_topics}),
    }


async def build_digest_for_user(
    user_id: uuid.UUID,
    db: AsyncSession,
    skip_cache: bool = False,
    intent: str = "balanced",
) -> None:
    """Orchestrate the full digest pipeline for a user."""
    # Load user with interests
    result = await db.execute(
        select(User).options(selectinload(User.interests)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        logger.error("User %s not found", user_id)
        return

    # Compute interest embeddings
    interest_topics = [i.topic for i in user.interests]
    interest_descriptions = {i.topic: i.description for i in user.interests if i.description}
    interest_embeddings = []
    if interest_topics:
        try:
            interest_embeddings = await embeddings.embed_batch(interest_topics)
        except Exception as e:
            logger.warning("Failed to embed interests: %s", e)

    # Gather reading context for personalization
    reading_context = await _get_user_reading_context(db, user_id)

    # Check essay cache before running pipeline (skip on regenerate for fresh content)
    # avoid_topics: scoped to THIS user's recent essays only
    avoid_topics: list[str] = []
    if skip_cache:
        cached_essays = []
        logger.info("Skipping essay cache (regenerate mode)")
        recent_result = await db.execute(
            select(EssayModel.topic)
            .join(Digest, EssayModel.digest_id == Digest.id)
            .where(
                Digest.user_id == user_id,
                EssayModel.created_at > datetime.now(timezone.utc) - timedelta(days=ESSAY_CACHE_DAYS),
            )
            .distinct()
        )
        avoid_topics = [row[0] for row in recent_result.all()]
        logger.info("Avoiding %d recent topics for user %s on regenerate", len(avoid_topics), user_id)
    else:
        cached_essays = await _check_essay_cache(db, user_id, interest_topics)

    # Also add read topics to avoid list so users don't re-read similar content
    avoid_topics.extend(reading_context["read_topics"])
    avoid_topics = list(set(avoid_topics))

    cached_topics = {e.topic for e in cached_essays}
    uncached_topics = [t for t in interest_topics if t not in cached_topics]

    # Create digest record
    digest = Digest(
        user_id=user_id,
        edition_date=date.today(),
        status="building",
    )
    db.add(digest)
    await db.commit()
    await db.refresh(digest)

    await event_bus.publish(user_id, "status", {"stage": "starting", "progress": 0, "message": "Starting digest generation..."})

    try:
        # Invoke the LangGraph pipeline
        initial_state = {
            "user_id": str(user_id),
            "interest_topics": interest_topics,
            "interest_descriptions": interest_descriptions,
            "research_topics": uncached_topics,
            "avoid_topics": avoid_topics,
            "interest_embeddings": interest_embeddings,
            "reading_context": reading_context,
            "generation_intent": intent,
            "raw_items": [],
            "extracted_items": [],
            "scored_items": [],
            "matched_articles": [],
            "research_bundles": [],
            "raw_essays": [],
            "essays": [],
            "dispatch_articles": [],
            "errors": [],
        }

        final_state = await digest_graph.ainvoke(initial_state)

        # Persist articles with embeddings
        dispatch_articles = final_state.get("dispatch_articles", [])
        article_texts = [
            f"{a.title}. {a.summary or ''}" for a in dispatch_articles
        ]
        article_vecs = [None] * len(dispatch_articles)
        if article_texts:
            try:
                article_vecs = await embeddings.embed_batch(article_texts)
            except Exception as e:
                logger.warning("Failed to embed articles: %s", e)

        for article_data, vec in zip(dispatch_articles, article_vecs):
            article = Article(
                digest_id=digest.id,
                source_url=article_data.source_url,
                source_name=article_data.source_name,
                title=article_data.title,
                summary=article_data.summary,
                body_markdown=article_data.body_markdown,
                category=article_data.category,
                published_at=article_data.published_at,
                quality_score=article_data.quality_score,
                relevance_score=article_data.relevance_score,
                embedding=vec,
            )
            db.add(article)

        # Combine pipeline essays with cached essays
        all_essays = list(final_state.get("essays", [])) + cached_essays

        # Persist essays and sources
        seen_essay_ids: set[uuid.UUID] = set()
        for essay_data in all_essays:
            # Cached essay already exists in DB — create a copy for this digest
            # (moving it would trigger delete-orphan cascade on the old digest)
            if essay_data.id and essay_data.id not in seen_essay_ids:
                seen_essay_ids.add(essay_data.id)
                result = await db.execute(
                    select(EssayModel).options(selectinload(EssayModel.sources)).where(EssayModel.id == essay_data.id)
                )
                existing_essay = result.scalar_one_or_none()
                if existing_essay:
                    copy = EssayModel(
                        digest_id=digest.id,
                        title=existing_essay.title,
                        subtitle=existing_essay.subtitle,
                        body_markdown=existing_essay.body_markdown,
                        thesis=existing_essay.thesis,
                        topic=existing_essay.topic,
                        word_count=existing_essay.word_count,
                        reading_time_minutes=existing_essay.reading_time_minutes,
                        length_tier=existing_essay.length_tier,
                        embedding=existing_essay.embedding,
                    )
                    db.add(copy)
                    await db.flush()
                    for src in existing_essay.sources:
                        db.add(ResearchSource(
                            essay_id=copy.id,
                            source_type=src.source_type,
                            title=src.title,
                            author=src.author,
                            url=src.url,
                            excerpt=src.excerpt,
                        ))
                    continue

            essay = EssayModel(
                digest_id=digest.id,
                title=essay_data.title,
                subtitle=essay_data.subtitle,
                body_markdown=essay_data.body_markdown,
                thesis=essay_data.thesis,
                topic=essay_data.topic,
                word_count=essay_data.word_count,
                reading_time_minutes=essay_data.reading_time_minutes,
                length_tier=essay_data.length_tier,
            )

            # Embed essay for related-essays vector search
            try:
                essay_vecs = await embeddings.embed_batch(
                    [f"{essay_data.title}. {essay_data.thesis or ''}"]
                )
                essay.embedding = essay_vecs[0]
            except Exception as e:
                logger.warning("Failed to embed essay '%s': %s", essay_data.title, e)

            db.add(essay)
            await db.flush()

            for source in essay_data.sources:
                rs = ResearchSource(
                    essay_id=essay.id,
                    source_type=source.source_type,
                    title=source.title,
                    author=source.author,
                    url=source.url,
                    excerpt=source.excerpt,
                )
                db.add(rs)

        # Generate "Today's Big Question" from the lead essay
        if all_essays:
            lead_essay = all_essays[0]
            try:
                big_q = await llm.complete(
                    f"Based on this essay thesis: \"{lead_essay.thesis}\"\n"
                    f"And this essay title: \"{lead_essay.title}\"\n\n"
                    f"Write ONE provocative, curiosity-sparking question (max 15 words) "
                    f"that this essay answers. The question should make someone stop scrolling "
                    f"and think \"I need to know this.\" Do NOT use quotes. Just the question.",
                    system="You write compelling magazine cover questions. Return only the question, nothing else.",
                    temperature=0.7,
                    max_tokens=60,
                )
                digest.big_question = big_q.strip().strip('"')
            except Exception:
                digest.big_question = None

        # Generate headline from essays (the hero content)
        try:
            essay_titles = [e.title for e in all_essays[:5]]
            headline_prompt = (
                f"You're the editor of an intellectual magazine. "
                f"Write a compelling, curiosity-sparking edition tagline (max 10 words) "
                f"inspired by today's essays:\n{', '.join(essay_titles)}"
            )
            headline = await llm.complete(headline_prompt, temperature=0.5)
            digest.headline = headline.strip().strip('"')
        except Exception:
            digest.headline = f"Your Daily Digest \u2014 {date.today().strftime('%B %d, %Y')}"

        # Only mark complete if we actually produced essays
        if all_essays:
            digest.status = "complete"
            await db.commit()
            await event_bus.publish(user_id, "status", {
                "stage": "complete",
                "progress": 100,
                "message": "Digest complete!",
                "digest_id": str(digest.id),
            })
        else:
            logger.error("Digest pipeline produced 0 essays — marking as failed")
            digest.status = "failed"
            await db.commit()
            await event_bus.publish(user_id, "status", {
                "stage": "failed",
                "progress": 0,
                "message": "Essay generation failed (likely rate-limited). Try again in a minute.",
            })

    except Exception as e:
        logger.error("Digest pipeline failed: %s", e)
        digest.status = "failed"
        await db.commit()
        await event_bus.publish(user_id, "status", {"stage": "failed", "progress": 0, "message": "Digest generation failed. Please try again."})
