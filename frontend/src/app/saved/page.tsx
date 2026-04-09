"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import PageShell from "@/components/PageShell";
import ArticleCard from "@/components/ArticleCard";
import EssayCard from "@/components/EssayCard";
import InlineError from "@/components/InlineError";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { api } from "@/lib/api";
import type { Article, Essay } from "@/types";

interface HydratedBookmark {
  id: string;
  content_type: string;
  content_id: string;
  created_at: string | null;
  article?: Article;
  essay?: Essay;
}

export default function SavedPage() {
  const { bookmarks, loaded, removeBookmark } = useBookmarks();
  const [hydrated, setHydrated] = useState<HydratedBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;

    if (bookmarks.length === 0) {
      setHydrated([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      bookmarks.map(async (b) => {
        const entry: HydratedBookmark = {
          id: b.id,
          content_type: b.content_type,
          content_id: b.content_id,
          created_at: null,
        };
        try {
          if (b.content_type === "article") {
            entry.article = await api.getArticle(b.content_id);
          } else if (b.content_type === "essay") {
            entry.essay = await api.getEssay(b.content_id);
          }
        } catch {
          // Content may have been deleted
        }
        return entry;
      })
    )
      .then(setHydrated)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookmarks, loaded]);

  async function handleDelete(bookmarkId: string) {
    try {
      await removeBookmark(bookmarkId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove bookmark"
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-3 w-16 bg-ink/10 mb-8" />
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-2 w-20 bg-ink/10 mb-3" />
                <div className="h-5 w-2/3 bg-ink/10 mb-2" />
                <div className="h-3 w-1/2 bg-ink/10" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <PageShell>
        <p className="section-label mb-2">saved</p>
        <h1 className="font-headline text-3xl italic ink-bleed-heavy mb-8">Saved</h1>

        {error && <InlineError message={error} onDismiss={() => setError(null)} />}

        {hydrated.length === 0 ? (
          <div className="py-12">
            <p className="font-headline text-xl italic ink-bleed mb-2">
              Your reading list is empty
            </p>
            <p className="font-body text-sm text-ink-muted">
              Bookmark essays and articles as you read. They&apos;ll wait for you here.
            </p>
          </div>
        ) : (
          <div>
            {hydrated.map((b) => (
              <div key={b.id} className="relative group">
                {b.article && (
                  <ArticleCard
                    title={b.article.title}
                    summary={b.article.summary}
                    source={b.article.source_name}
                    category={b.article.category}
                    href={`/article/${b.article.id}`}
                  />
                )}
                {b.essay && (
                  <EssayCard
                    title={b.essay.title}
                    subtitle={b.essay.subtitle}
                    topic={b.essay.topic}
                    readingTime={b.essay.reading_time_minutes}
                    href={`/essay/${b.essay.id}`}
                  />
                )}
                {!b.article && !b.essay && (
                  <p className="font-mono text-xs text-ink-muted italic py-4">
                    content no longer available
                  </p>
                )}
                <button
                  onClick={() => handleDelete(b.id)}
                  className="absolute top-5 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="remove bookmark"
                >
                  &#215;
                </button>
              </div>
            ))}
          </div>
        )}
    </PageShell>
  );
}
