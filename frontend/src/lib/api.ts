import { createClient } from "@/lib/supabase/client";
import type {
  User,
  Digest,
  DigestSummary,
  Article,
  Essay,
  ReadingStats,
  SearchResult,
} from "@/types";

interface BookmarkEntry {
  id: string;
  content_type: string;
  content_id: string;
}

interface BookmarkResponse {
  status: string;
  id?: string;
}

interface MarkReadResponse {
  status: string;
  progress: number;
}

interface TriggerDigestResponse {
  status: string;
  message: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  } catch {
    // Supabase not configured
  }

  return {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API error ${res.status}: ${res.statusText}`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  getDigest: (id: string) => request<Digest>(`/api/digests/${id}`),
  listDigests: () => request<DigestSummary[]>("/api/digests"),
  triggerDigest: (fresh = false, intent = "balanced") => {
    const params = new URLSearchParams();
    if (fresh) params.set("fresh", "true");
    if (intent !== "balanced") params.set("intent", intent);
    const qs = params.toString();
    return request<TriggerDigestResponse>(
      `/api/digests/generate${qs ? `?${qs}` : ""}`,
      { method: "POST" }
    );
  },
  getArticle: (id: string) => request<Article>(`/api/articles/${id}`),
  getEssay: (id: string) => request<Essay>(`/api/essays/${id}`),
  getBookmarks: () => request<BookmarkEntry[]>("/api/bookmarks"),
  createBookmark: (contentType: string, contentId: string) =>
    request<BookmarkResponse>(
      `/api/bookmarks?content_type=${contentType}&content_id=${contentId}`,
      { method: "POST" }
    ),
  deleteBookmark: (id: string) =>
    request<void>(`/api/bookmarks/${id}`, { method: "DELETE" }),
  createUser: (data: { name: string; interests: { topic: string }[] }) =>
    request<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  getUser: () => request<User>("/api/users/me"),
  updateInterests: (interests: { topic: string }[]) =>
    request<User>("/api/users/me/interests", {
      method: "PUT",
      body: JSON.stringify(interests),
    }),
  getReadingStats: () => request<ReadingStats>("/api/reading/stats"),
  markRead: (contentType: "essay" | "article", contentId: string, progress = 100) =>
    request<MarkReadResponse>("/api/reading/mark-read", {
      method: "POST",
      body: JSON.stringify({ content_type: contentType, content_id: contentId, progress }),
    }),
  getRelatedEssays: (essayId: string, limit = 3) =>
    request<Essay[]>(`/api/essays/${essayId}/related?limit=${limit}`),
  submitEssayFeedback: (essayId: string, signal: "more" | "different") =>
    request<{ status: string; signal: string }>("/api/reading/feedback", {
      method: "POST",
      body: JSON.stringify({ essay_id: essayId, signal }),
    }),
  search: (query: string, limit = 10) =>
    request<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`),
};
