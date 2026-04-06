import asyncio
import time


class RateLimitedGroq:
    """Wrapper around Groq API calls that enforces a per-minute rate limit."""

    def __init__(self, calls_per_minute: int = 25):
        self.min_interval = 60.0 / calls_per_minute
        self._lock = asyncio.Lock()
        self._last_call = 0.0

    async def throttle(self):
        """Wait until we can make the next call without exceeding the rate limit."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_call
            if elapsed < self.min_interval:
                await asyncio.sleep(self.min_interval - elapsed)
            self._last_call = time.monotonic()


rate_limiter = RateLimitedGroq(calls_per_minute=25)
