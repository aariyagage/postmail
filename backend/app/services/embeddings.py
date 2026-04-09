import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

HF_API_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{settings.embedding_model}"

# Reusable client — avoids opening a new connection per request
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30)
    return _client


async def _hf_embed(texts: list[str]) -> list[list[float]]:
    """Call Hugging Face Inference API for embeddings."""
    client = _get_client()
    resp = await client.post(
        HF_API_URL,
        json={"inputs": texts, "options": {"wait_for_model": True}},
    )
    resp.raise_for_status()
    return resp.json()


async def embed_text(text: str) -> list[float]:
    """Generate embedding vector for a single text."""
    vectors = await _hf_embed([text])
    return vectors[0]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts."""
    if not texts:
        return []
    # HF Inference API handles batches natively
    return await _hf_embed(texts)
