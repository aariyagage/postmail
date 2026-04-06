import logging

from app.agents.state import DigestState
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)


async def digest_assembler(state: DigestState) -> dict:
    """Validate that both tracks produced output and report status."""
    await event_bus.publish(state["user_id"], "status", {"stage": "digest_assembler", "progress": 0, "message": "Assembling digest..."})

    dispatch = state.get("dispatch_articles", [])
    essays = state.get("essays", [])
    errors = state.get("errors", [])

    if not dispatch and not essays:
        errors.append("No articles or essays were produced")

    await event_bus.publish(state["user_id"], "status", {
        "stage": "digest_assembler",
        "progress": 100,
        "message": f"Digest assembled: {len(dispatch)} articles, {len(essays)} essays",
    })

    return {"errors": errors} if errors else {}
