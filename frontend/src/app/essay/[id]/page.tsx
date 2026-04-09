"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Masthead from "@/components/Masthead";
import CinematicReader from "@/components/CinematicReader";
import EssayCard from "@/components/EssayCard";
import BookmarkButton from "@/components/BookmarkButton";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButton from "@/components/ShareButton";
import TopicTag from "@/components/TopicTag";
import { getTopicTint } from "@/lib/topicColors";
import { api } from "@/lib/api";
import type { Essay } from "@/types";

export default function EssayPage() {
  const params = useParams();
  const id = params.id as string;
  const [essay, setEssay] = useState<Essay | null>(null);
  const [related, setRelated] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markedRead, setMarkedRead] = useState(false);
  const [feedback, setFeedback] = useState<"more" | "different" | null>(null);

  const handleFeedback = useCallback(async (signal: "more" | "different") => {
    if (!essay) return;
    setFeedback(signal);
    try {
      await api.submitEssayFeedback(essay.id, signal);
    } catch {
      // non-critical
    }
  }, [essay]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getEssay(id).then((data) => setEssay(data)),
      api
        .getRelatedEssays(id)
        .then((data) => setRelated(data))
        .catch(() => {}),
    ])
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load essay");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!essay || markedRead) return;

    function handleScroll() {
      const scrollPos = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollPos / docHeight >= 0.8 && essay) {
        api.markRead("essay", essay.id).catch(() => {});
        setMarkedRead(true);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [essay, markedRead]);

  if (loading) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-2 w-20 bg-ink/10 mb-6" />
          <div className="h-8 w-3/4 bg-ink/10 mb-3" />
          <div className="h-4 w-1/2 bg-ink/10 mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 bg-ink/10" style={{ width: `${85 - i * 5}%` }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !essay) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <p className="font-mono text-xs text-ink-muted">
            {error || "essay not found."}
          </p>
        </div>
      </main>
    );
  }

  const tint = getTopicTint(essay.topic);

  return (
    <main className="min-h-screen bg-paper">
      <ReadingProgress color={tint.border} />
      <Masthead />

      {/* Essay header — vintage postal */}
      <header className="max-w-3xl mx-auto px-6 pt-12 pb-4 text-center">
        <div className="flex items-center justify-center gap-4 mb-6">
          <TopicTag topic={essay.topic} />
          <div className="postage-stamp">
            <span className="postage-stamp-value">{essay.reading_time_minutes}</span>
            <span className="postage-stamp-label">min read</span>
          </div>
          {markedRead && (
            <span className="font-mono text-[10px] text-ink-muted italic tracking-wider">
              — read
            </span>
          )}
        </div>

        <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl leading-[1.15] text-balance mb-4 italic ink-bleed-heavy">
          {essay.title}
        </h1>

        {essay.subtitle && (
          <p className="font-body text-base md:text-lg text-ink-muted italic max-w-xl mx-auto mb-5 leading-relaxed">
            {essay.subtitle}
          </p>
        )}

        <div className="flex items-center justify-center gap-4 mb-8">
          <BookmarkButton contentType="essay" contentId={essay.id} size={18} />
          <ShareButton />
        </div>

        {/* Envelope fold line */}
        <div className="envelope-fold" />
      </header>

      {/* Cinematic body */}
      <div className="max-w-3xl mx-auto px-6 pb-6">
        <CinematicReader
          bodyMarkdown={essay.body_markdown}
          topic={essay.topic}
          thesis={essay.thesis}
          sources={essay.sources}
        />
      </div>

      {/* Feedback */}
      <div className="max-w-2xl mx-auto bg-paper-warm py-8 px-8">
        <div className="text-center">
          <span className="font-mono text-[10px] text-ink-muted block mb-3">
            {feedback ? "noted — this shapes your next digest" : "what did you think?"}
          </span>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleFeedback("more")}
              className={`font-mono text-[11px] lowercase px-4 py-1.5 border transition-all ${
                feedback === "more"
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-light text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              more like this
            </button>
            <button
              onClick={() => handleFeedback("different")}
              className={`font-mono text-[11px] lowercase px-4 py-1.5 border transition-all ${
                feedback === "different"
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-light text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              different direction
            </button>
          </div>
        </div>
      </div>

      {/* Related essays */}
      {related.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 pb-16">
          <div className="border-t border-dashed border-rule-light pt-8">
            <p className="section-label mb-4">keep reading about {essay.topic}</p>
            {related.map((r) => (
              <EssayCard
                key={r.id}
                id={r.id}
                title={r.title}
                subtitle={r.subtitle}
                topic={r.topic}
                readingTime={r.reading_time_minutes}
                lengthTier={r.length_tier}
                href={`/essay/${r.id}`}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
