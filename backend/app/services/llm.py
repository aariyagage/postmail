import asyncio
import json
import logging
import re

import httpx

from app.config import settings
from app.utils.groq_queue import rate_limiter

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Limit concurrent Groq API calls to avoid 429 rate limits
_semaphore = asyncio.Semaphore(3)

# Shared client for connection pooling
_client: httpx.AsyncClient | None = None

# Retryable HTTP status codes
RETRYABLE_STATUSES = {429, 500, 502, 503}


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10.0, read=90.0, write=10.0, pool=30.0)
        )
    return _client


async def _call_groq(
    messages: list[dict],
    temperature: float = 0.7,
    json_mode: bool = False,
    max_tokens: int | None = None,
) -> str:
    """Make a rate-limited call to Groq API with retry on transient errors."""
    if not settings.groq_api_key:
        raise RuntimeError("POSTMAIL_GROQ_API_KEY not set")

    body: dict = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if max_tokens is not None:
        body["max_tokens"] = max_tokens

    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}
    client = _get_client()

    last_error: Exception | None = None

    for attempt in range(4):
        await rate_limiter.throttle()
        try:
            async with _semaphore:
                resp = await client.post(GROQ_URL, headers=headers, json=body)
        except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as e:
            last_error = e
            wait = min(2 ** attempt * 2, 15)
            logger.warning("Groq connection error (attempt %d): %s, retrying in %ds", attempt + 1, type(e).__name__, wait)
            await asyncio.sleep(wait)
            continue

        if resp.status_code in RETRYABLE_STATUSES:
            last_error = httpx.HTTPStatusError(
                f"HTTP {resp.status_code}", request=resp.request, response=resp
            )
            wait = min(2 ** attempt * 2, 15)
            logger.warning("Groq %d (attempt %d), retrying in %ds", resp.status_code, attempt + 1, wait)
            await asyncio.sleep(wait)
            continue

        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    # All retries exhausted
    if last_error:
        raise last_error
    raise RuntimeError("Groq API call failed after all retries")


async def complete(
    prompt: str,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int | None = None,
) -> str:
    """Call Groq LLM for text completion."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return await _call_groq(messages, temperature=temperature, max_tokens=max_tokens)


def _sanitize_json_string(raw: str) -> str:
    """Fix unescaped control characters inside JSON string values."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)

    out = []
    in_string = False
    i = 0
    while i < len(cleaned):
        ch = cleaned[i]
        if ch == '"' and (i == 0 or cleaned[i - 1] != '\\'):
            in_string = not in_string
            out.append(ch)
        elif in_string and ch == '\n':
            out.append('\\n')
        elif in_string and ch == '\r':
            out.append('\\r')
        elif in_string and ch == '\t':
            out.append('\\t')
        elif in_string and ord(ch) < 0x20:
            out.append(f'\\u{ord(ch):04x}')
        else:
            out.append(ch)
        i += 1
    return ''.join(out)


async def complete_json(
    prompt: str,
    system: str | None = None,
    max_tokens: int | None = None,
    temperature: float = 0.3,
) -> dict:
    """Call Groq LLM and parse JSON response, using JSON mode."""
    json_system = (system or "") + "\nYou MUST respond with valid JSON only. No markdown fences, no extra text."

    messages = [
        {"role": "system", "content": json_system.strip()},
        {"role": "user", "content": prompt},
    ]

    raw = await _call_groq(messages, temperature=temperature, json_mode=True, max_tokens=max_tokens)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    logger.debug("JSON mode output needed sanitization")
    cleaned = _sanitize_json_string(raw)
    return json.loads(cleaned)
