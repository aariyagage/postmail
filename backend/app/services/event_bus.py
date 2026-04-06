import asyncio
import json
import uuid
from typing import Any


class EventBus:
    """Per-user asyncio.Queue-based pub/sub for SSE progress events."""

    def __init__(self):
        # user_id -> {subscriber_id -> Queue}
        self._subscribers: dict[uuid.UUID, dict[str, asyncio.Queue]] = {}
        self._last_status: dict[uuid.UUID, str] = {}

    def last_status(self, user_id: uuid.UUID) -> str:
        """Return the last published status event for a user, or idle default."""
        return self._last_status.get(user_id, '{"stage": "idle"}')

    def subscribe(self, user_id: uuid.UUID, subscriber_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        if user_id not in self._subscribers:
            self._subscribers[user_id] = {}
        self._subscribers[user_id][subscriber_id] = queue
        return queue

    def unsubscribe(self, user_id: uuid.UUID, subscriber_id: str) -> None:
        if user_id in self._subscribers:
            self._subscribers[user_id].pop(subscriber_id, None)
            if not self._subscribers[user_id]:
                del self._subscribers[user_id]

    async def publish(self, user_id: uuid.UUID | str, event: str, data: Any) -> None:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        payload = json.dumps(data) if not isinstance(data, str) else data
        if event == "status":
            self._last_status[user_id] = payload
        for queue in self._subscribers.get(user_id, {}).values():
            await queue.put({"event": event, "data": payload})


event_bus = EventBus()
