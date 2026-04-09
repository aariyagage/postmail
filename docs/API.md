# Postmail API Reference

Base URL: `https://postmail-api-2z7u.onrender.com`

All endpoints except `/health` require authentication via `Authorization: Bearer <supabase-jwt>` header.

## Authentication

| Mode | Config | How It Works |
|---|---|---|
| JWKS (production) | `POSTMAIL_SUPABASE_URL` set | Fetches public keys from Supabase, verifies ES256 JWT |
| HS256 (legacy) | `POSTMAIL_SUPABASE_JWT_SECRET` set | Verifies JWT with shared secret |
| Dev mode | Neither set | Reads user ID from `X-Dev-User-Id` header or `user_id` query param |

## Endpoints

### Health

```
GET /health
```
Returns `{"status": "ok"}`. No auth required.

---

### Users

```
POST /api/users
```
Create user account during onboarding. Embeds interest topics.

Body:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "interests": [
    {"topic": "Philosophy", "description": "Continental philosophy, phenomenology"},
    {"topic": "AI & Machine Learning"}
  ]
}
```

```
GET /api/users/me
```
Get the authenticated user with their interests.

```
PUT /api/users/me/interests
```
Update user interests (re-embeds all topics).

---

### Digests

```
GET /api/digests
```
List all digests for the authenticated user, newest first.

```
GET /api/digests/{id}
```
Get a single digest with all its articles and essays.

```
POST /api/digests/generate?fresh=true&intent=balanced
```
Trigger async digest generation. Returns immediately with the digest ID and `building` status.

Query params:
- `fresh` (bool) — Force new generation even if today's digest exists
- `intent` — One of: `balanced`, `go_deeper`, `surprise_me`, `new_territory`

---

### Essays

```
GET /api/essays/{id}
```
Get a single essay with its research sources.

```
GET /api/essays/{id}/related
```
Get related essays (by embedding similarity, with topic-based fallback).

---

### Articles

```
GET /api/articles/{id}
```
Get a single article.

---

### Bookmarks

```
GET /api/bookmarks
```
List all bookmarks for the authenticated user.

```
POST /api/bookmarks?content_type=essay&content_id={uuid}
```
Bookmark an essay or article. Returns `already_bookmarked` if duplicate.

```
DELETE /api/bookmarks/{id}
```
Remove a bookmark.

---

### Reading

```
POST /api/reading/mark-read
```
Track reading progress.

Body:
```json
{
  "content_type": "essay",
  "content_id": "uuid",
  "reading_progress": 100
}
```

```
GET /api/reading/stats
```
Get reading statistics:
```json
{
  "total_essays_read": 12,
  "total_articles_read": 45,
  "current_streak": 3,
  "longest_streak": 7,
  "topics_explored": 5,
  "total_reading_time_minutes": 180,
  "essays_this_week": 4
}
```

```
POST /api/reading/feedback
```
Submit essay feedback signal.

Body:
```json
{
  "essay_id": "uuid",
  "signal": "more"
}
```
Signal is either `"more"` (more like this) or `"different"` (less like this).

---

### Search

```
GET /api/search?q=epistemology
```
Semantic search across essays and articles. Returns mixed results ranked by embedding similarity.

Query params:
- `q` (string, min 2 chars) — Search query

---

### SSE Streaming

```
GET /api/stream/digest?access_token={jwt}
```
Server-Sent Events stream for real-time digest generation progress.

Event format:
```
event: status
data: {"stage": "extractor", "progress": 45, "message": "extracting articles..."}
```

Stages in order: `fetcher` → `extractor` → `quality_filter` → `relevance_matcher` → `composer_dispatch` → `research_agent` → `composer_essays` → `diversity_checker` → `digest_assembler`

Heartbeat sent every 30 seconds if idle.

**Note:** This endpoint requires the JWT as a query parameter (not a header) because `EventSource` doesn't support custom headers.
