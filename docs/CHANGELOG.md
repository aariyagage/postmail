# Changelog

## 2026-04-09: Migrate Embeddings from Local Model to Hugging Face Inference API

### Problem

The backend crashed on Render's free tier with **"Ran out of memory (used over 512MB)"**. The root cause was `sentence-transformers`, a Python library that loads ML models locally:

- The `all-MiniLM-L6-v2` model file: ~90MB on disk
- Model loaded into RAM with PyTorch runtime: ~300MB
- Plus Python + FastAPI + SQLAlchemy + all other dependencies

Total memory exceeded Render's 512MB free tier limit. The server would start, load the model, OOM-crash, restart, and repeat.

### What `sentence-transformers` Was Doing

The library converts text into **embedding vectors** — arrays of 384 numbers that represent the meaning of the text. Similar texts produce similar vectors, which enables:

- **Semantic search** — Find essays/articles that match a search query by meaning, not just keywords
- **Relevance matching** — Score how well articles match a user's interests during digest building
- **Source scoring** — Filter research sources by relevance to an essay's topic
- **Content indexing** — Store vectors in pgvector for fast similarity queries

The library ran the ML model **locally on the server's CPU** — no external calls, but heavy memory usage.

### Solution

Replaced the local model with the **Hugging Face Inference API**, a free hosted version of the exact same model.

Before (local):
```
text → sentence-transformers loads model into RAM → runs inference on CPU → vector
```

After (API):
```
text → HTTP POST to api-inference.huggingface.co → HF runs the model → vector
```

### Why This Solution

- **Same model** (`all-MiniLM-L6-v2`) — produces identical 384-dimension vectors, so all existing embeddings in the database remain compatible. No migration needed.
- **Same function interface** — `embed_text()` and `embed_batch()` still take strings and return `list[float]`. No code changes needed anywhere else in the codebase.
- **Free** — Hugging Face Inference API is free for public models with no API key required.
- **~400MB RAM saved** — Server now fits comfortably within Render's 512MB free tier.

### Tradeoffs

| | Before (local) | After (API) |
|---|---|---|
| RAM usage | ~400MB | ~0MB |
| Latency per call | ~10ms | ~200-500ms |
| Works offline | Yes | No |
| Rate limits | None | Generous (not documented, but sufficient for this use case) |
| Cold start | Model loads on first call (~5s) | First API call may wake HF model (~10-20s) |

The latency increase is acceptable because embedding calls happen during digest generation (a background process that takes minutes anyway) and search queries (where 200ms extra is not noticeable).

### Files Changed

| File | Change |
|---|---|
| `backend/app/services/embeddings.py` | Replaced `SentenceTransformer` local model with `httpx` calls to HF Inference API |
| `backend/pyproject.toml` | Removed `sentence-transformers` from dependencies |
| `backend/Dockerfile` | Removed model pre-download step (`RUN python -c "from sentence_transformers..."`) |
| `backend/app/agents/sources.py` | Replaced `numpy` cosine similarity with pure Python `math` module (numpy was a transitive dependency of sentence-transformers) |

### What is NumPy (and Why It Was Removed)

NumPy is a Python library for fast math on large arrays of numbers. It's the foundation of most scientific Python code. In this project, it was used for exactly one thing: computing cosine similarity between two embedding vectors in `sources.py`.

Cosine similarity measures how similar two vectors are (0 = unrelated, 1 = identical). The math is:

```
similarity = dot_product(A, B) / (length(A) * length(B))
```

NumPy can do this in one line (`np.dot`), but so can plain Python (`sum(a*b for a,b in zip(A,B))`). Since NumPy was only installed as a side-effect of sentence-transformers (not a direct dependency), and it adds ~30MB to the install, the 5 lines of NumPy code were rewritten using Python's built-in `math` module. The output is mathematically identical.
