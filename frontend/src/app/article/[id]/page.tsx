"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Masthead from "@/components/Masthead";
import CinematicReader from "@/components/CinematicReader";
import BookmarkButton from "@/components/BookmarkButton";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButton from "@/components/ShareButton";
import TopicTag from "@/components/TopicTag";
import { getTopicTint } from "@/lib/topicColors";
import { api } from "@/lib/api";
import type { Article } from "@/types";

export default function ArticlePage() {
  const params = useParams();
  const id = params.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getArticle(id)
      .then((data) => setArticle(data))
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load article"
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-2 w-16 bg-ink/10 mb-4" />
          <div className="h-8 w-3/4 bg-ink/10 mb-3" />
          <div className="h-3 w-32 bg-ink/10 mb-8" />
          <div className="space-y-3">
            <div className="h-3 w-full bg-ink/10" />
            <div className="h-3 w-5/6 bg-ink/10" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <p className="font-mono text-xs text-ink-muted">
            {error || "article not found."}
          </p>
        </div>
      </main>
    );
  }

  const content = article.body_markdown || article.summary;
  const tint = getTopicTint(article.category || article.title);

  return (
    <main className="min-h-screen bg-paper">
      <ReadingProgress color={tint.border} />
      <Masthead />

      {/* Article header — centered, dramatic */}
      <header className="max-w-3xl mx-auto px-6 pt-12 pb-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          {article.category && <TopicTag topic={article.category} />}
          <span className="font-mono text-[10px] text-ink-muted tracking-wider">
            via {article.source_name}
          </span>
          {article.published_at && (
            <span className="font-mono text-[10px] text-ink-muted tracking-wider">
              {new Date(article.published_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        <h1 className="font-headline text-3xl md:text-4xl leading-[1.15] text-balance mb-5 italic ink-bleed-heavy">
          {article.title}
        </h1>

        <div className="flex items-center justify-center gap-4 mb-8">
          <BookmarkButton contentType="article" contentId={article.id} size={18} />
          <ShareButton />
        </div>

        {/* Decorative rule */}
        <div className="envelope-fold mb-2" />
      </header>

      {/* Cinematic body */}
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <CinematicReader
          bodyMarkdown={content}
          topic={article.category || "general"}
        />
      </div>

      {/* Source link */}
      {article.source_url && (
        <div className="max-w-2xl mx-auto px-6 pb-16 text-center">
          <div className="border-t border-dashed border-rule-light pt-6">
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors underline decoration-dashed underline-offset-2"
            >
              read original &rarr;
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
