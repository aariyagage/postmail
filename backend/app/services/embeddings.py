import asyncio
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.config import settings


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)


async def embed_text(text: str) -> list[float]:
    """Generate embedding vector for a single text."""
    model = _get_model()
    loop = asyncio.get_running_loop()
    vector = await loop.run_in_executor(None, lambda: model.encode(text).tolist())
    return vector


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts."""
    if not texts:
        return []
    model = _get_model()
    loop = asyncio.get_running_loop()
    vectors = await loop.run_in_executor(
        None, lambda: model.encode(texts).tolist()
    )
    return vectors
