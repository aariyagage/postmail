import asyncio
import logging
from datetime import datetime, timezone

import httpx

from app.agents.state import DigestState
from app.schemas.items import RawItem
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)

HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item/{}.json"


async def _fetch_item(client: httpx.AsyncClient, sid: int) -> RawItem | None:
    try:
        resp = await client.get(HN_ITEM_URL.format(sid))
        resp.raise_for_status()
        item = resp.json()
        if not item or item.get("type") != "story" or not item.get("title"):
            return None
        url = item.get("url", f"https://news.ycombinator.com/item?id={sid}")
        published = None
        if item.get("time"):
            published = datetime.fromtimestamp(item["time"], tz=timezone.utc)
        return RawItem(
            url=url,
            title=item["title"],
            source_name="Hacker News",
            published_at=published,
            raw_content=item.get("text"),
        )
    except Exception:
        logger.warning("Failed to fetch HN item %s", sid)
        return None


HN_BEST_URL = "https://hacker-news.firebaseio.com/v0/beststories.json"
HN_NEW_URL = "https://hacker-news.firebaseio.com/v0/newstories.json"


async def fetcher(state: DigestState) -> dict:
    """Fetch stories from multiple HN feeds for variety — top, best, and new."""
    await event_bus.publish(state["user_id"], "status", {"stage": "fetcher", "progress": 0, "message": "Fetching stories from Hacker News..."})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Pull from three feeds to get a wider content pool
            top_resp, best_resp, new_resp = await asyncio.gather(
                client.get(HN_TOP_URL),
                client.get(HN_BEST_URL),
                client.get(HN_NEW_URL),
            )
            top_resp.raise_for_status()
            best_resp.raise_for_status()
            new_resp.raise_for_status()

            # Merge and deduplicate story IDs, preserving order
            seen: set[int] = set()
            story_ids: list[int] = []
            for ids in [top_resp.json()[:30], best_resp.json()[:20], new_resp.json()[:15]]:
                for sid in ids:
                    if sid not in seen:
                        seen.add(sid)
                        story_ids.append(sid)

            results = await asyncio.gather(*[_fetch_item(client, sid) for sid in story_ids[:50]])
            raw_items = [r for r in results if r is not None]
    except Exception as e:
        logger.error("Failed to fetch HN stories: %s", e)
        return {"raw_items": [], "errors": [f"Fetcher error: {e}"]}

    await event_bus.publish(state["user_id"], "status", {"stage": "fetcher", "progress": 100, "message": f"Fetched {len(raw_items)} stories"})
    return {"raw_items": raw_items}
