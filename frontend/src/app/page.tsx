"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Masthead from "@/components/Masthead";
import EssayCard from "@/components/EssayCard";
import ArticleCard from "@/components/ArticleCard";
import InlineError from "@/components/InlineError";
import { getTopicTint } from "@/lib/topicColors";
import { api } from "@/lib/api";
import type { Digest, User } from "@/types";

const TOPIC_SUGGESTIONS = [
  "Philosophy", "Cognitive Science", "AI & Machine Learning", "Economics",
  "History", "Psychology", "Physics", "Literature", "Neuroscience",
  "Political Theory", "Sociology", "Mathematics", "Biology & Evolution",
  "Art & Design", "Technology", "Linguistics", "Climate & Environment",
  "Space & Astronomy",
];

const CARD_VARIANTS = ["default", "tinted", "bordered", "default", "tinted", "bordered"] as const;

export default function Home() {
  const router = useRouter();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showTopics, setShowTopics] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [savingTopics, setSavingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIntentPicker, setShowIntentPicker] = useState(false);
  const scrollRevealRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal observer for essay cards and sidebar elements
  const setupScrollReveal = useCallback(() => {
    const container = scrollRevealRef.current;
    if (!container) return;
    const elements = container.querySelectorAll(".scroll-reveal");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("scroll-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loading && digest) {
      const timer = setTimeout(setupScrollReveal, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, digest, setupScrollReveal]);

  useEffect(() => {
    setError(null);
    Promise.all([
      api.getUser().then((u) => setUser(u)),
      api
        .listDigests()
        .then((summaries) => {
          const list = summaries;
          const today = new Date().toISOString().split("T")[0];
          // Prefer today's complete digest with essays, then any complete with essays
          const complete =
            list.find((d) => d.status === "complete" && d.essay_count > 0 && d.edition_date === today)
            || list.find((d) => d.status === "complete" && d.essay_count > 0)
            || list.find((d) => d.status === "complete");
          if (complete) return api.getDigest(complete.id);
          return null;
        })
        .then((d) => {
          if (d) setDigest(d);
        }),
    ])
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load your digest"
        );
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleGenerate(fresh = false, intent = "balanced") {
    setGenerating(true);
    setShowIntentPicker(false);
    try {
      await api.triggerDigest(fresh, intent);
      router.push("/pressroom");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start digest generation"
      );
      setGenerating(false);
    }
  }

  async function handleRemoveTopic(topic: string) {
    if (!user) return;
    setSavingTopics(true);
    const updated = user.interests
      .filter((i) => i.topic !== topic)
      .map((i) => ({ topic: i.topic, description: i.description }));
    try {
      const u = await api.updateInterests(updated);
      setUser(u);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update topics"
      );
    }
    setSavingTopics(false);
  }

  async function handleAddTopic() {
    if (!user || !newTopic.trim()) return;
    setSavingTopics(true);
    const updated = [
      ...user.interests.map((i) => ({ topic: i.topic, description: i.description })),
      { topic: newTopic.trim() },
    ];
    try {
      const u = await api.updateInterests(updated);
      setUser(u);
      setNewTopic("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add topic"
      );
    }
    setSavingTopics(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-6xl mx-auto px-6 animate-pulse">
          <div className="max-w-2xl pt-12 pb-8">
            <div className="h-3 w-24 bg-ink/10 mb-6" />
            <div className="h-8 w-3/4 bg-ink/10 mb-3" />
            <div className="h-5 w-1/2 bg-ink/10 mb-4" />
            <div className="h-3 w-20 bg-ink/10" />
          </div>
          <div className="border-b border-dashed border-rule-light mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mb-8">
                <div className="h-2 w-20 bg-ink/10 mb-3" />
                <div className="h-6 w-4/5 bg-ink/10 mb-2" />
                <div className="h-4 w-2/3 bg-ink/10" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const featuredEssay =
    digest?.essays.find((e) => e.length_tier !== "quick_read") ||
    digest?.essays[0];
  const otherEssays =
    digest?.essays.filter((e) => e.id !== featuredEssay?.id) || [];

  // Extract a pull quote — first sentence >60 chars from the featured essay body
  const pullQuote = (() => {
    if (!featuredEssay) return null;
    const sentences = featuredEssay.body_markdown
      .replace(/[#*_>\[\]]/g, "")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.length > 60 && s.length < 200);
    return sentences[1] || sentences[0] || null; // skip first (drop cap), take second
  })();

  // Random essay for "surprise me"
  const randomEssay = digest?.essays.length
    ? digest.essays[Math.floor(Date.now() / 86400000) % digest.essays.length]
    : null;

  return (
    <main className="min-h-screen bg-paper">
      <Masthead />
      <div className="max-w-6xl mx-auto px-6">
        {/* Edition header */}
        <div className="rule-double mb-4" />
        <div className="flex items-baseline justify-between mb-2">
          <p className="font-logo text-xl italic ink-bleed">today&apos;s edition</p>
          <p className="font-mono text-[11px] text-ink-muted">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="rule-hairline mb-8" />

        {/* Error */}
        {error && <InlineError message={error} onDismiss={() => setError(null)} />}

        {/* Topics — colored pills */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 flex-wrap stagger-reveal">
            <span className="section-label mr-1">your topics</span>
            {user?.interests.map((interest) => {
              const tint = getTopicTint(interest.topic);
              return (
                <span
                  key={interest.id}
                  className="inline-flex items-center gap-1 font-mono text-[11px] lowercase px-2 py-0.5"
                  style={{ backgroundColor: tint.bg, color: "rgb(var(--color-ink-light))" }}
                >
                  {interest.topic}
                  {showTopics && (
                    <button
                      onClick={() => handleRemoveTopic(interest.topic)}
                      disabled={savingTopics}
                      className="text-ink-muted hover:text-ink ml-0.5"
                      aria-label={`Remove ${interest.topic}`}
                    >
                      &times;
                    </button>
                  )}
                </span>
              );
            })}
            <button
              onClick={() => setShowTopics(!showTopics)}
              className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors underline decoration-dashed underline-offset-2 ml-1"
            >
              {showTopics ? "done" : "edit"}
            </button>
          </div>
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            {generating ? "starting..." : digest ? "new digest" : "generate"}
          </button>
        </div>

        {/* Add topic panel */}
        {showTopics && (
          <div className="mb-8 pl-4 border-l-2 border-ink">
            <p className="font-mono text-[11px] text-ink-muted mb-3">
              suggestions:
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
              {TOPIC_SUGGESTIONS
                .filter((t) => !user?.interests.some((i) => i.topic === t))
                .slice(0, 12)
                .map((topic) => (
                  <button
                    key={topic}
                    onClick={() => { setNewTopic(topic); }}
                    disabled={savingTopics}
                    className={`font-mono text-[11px] lowercase transition-colors ${
                      newTopic === topic
                        ? "text-ink underline"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                placeholder="or type your own..."
                className="flex-1 border-b border-dashed border-rule-light px-0 py-1 font-mono text-xs bg-transparent focus:border-ink placeholder:text-ink-muted"
              />
              <button
                onClick={handleAddTopic}
                disabled={savingTopics || !newTopic.trim()}
                className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink disabled:opacity-40 underline decoration-dashed underline-offset-2"
              >
                add
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!digest && !loading && (
          <div className="py-20 max-w-md">
            <p className="font-mono text-[11px] text-ink-muted mb-4">
              -- nothing here yet
            </p>
            <h2 className="font-headline text-2xl mb-3">
              your digest is being written
            </h2>
            <p className="font-body text-sm text-ink-muted mb-6 leading-relaxed">
              We&apos;re researching and writing essays on your topics.
              Head to the pressroom to watch.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/pressroom"
                className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors"
              >
                view progress
              </a>
              <button
                onClick={() => handleGenerate()}
                disabled={generating}
                className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink underline decoration-dashed underline-offset-2 disabled:opacity-40"
              >
                {generating ? "starting..." : "generate new"}
              </button>
            </div>
          </div>
        )}

        {digest && (
          <div ref={scrollRevealRef}>
            {/* Edition strip */}
            <div className="flex items-center gap-3 mb-10 flex-wrap">
              <span className="font-mono text-[11px] text-ink-muted">
                {digest.essays.length} essays
              </span>
              <span className="text-rule-light text-[11px]">&#183;</span>
              <span className="font-mono text-[11px] text-ink-muted">
                {digest.articles.length} links
              </span>
              <span className="text-rule-light text-[11px]">&#183;</span>
              <span className="font-mono text-[11px] text-ink-muted">
                {new Date(digest.edition_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <div className="flex-1" />
            </div>

            {/* Featured essay — front page treatment */}
            {featuredEssay && (
              <section
                className="scroll-reveal mb-12 mx-[-1.5rem] md:mx-[-3rem] px-8 md:px-12 py-10"
                style={{ backgroundColor: getTopicTint(featuredEssay.topic).bg }}
              >
                <div className="rule-double mb-6" />
                {digest.big_question && (
                  <p className="font-mono text-[11px] text-ink-muted mb-4">
                    -- today&apos;s question
                  </p>
                )}
                <Link href={`/essay/${featuredEssay.id}`} className="group block">
                  <h2 className="font-headline text-3xl md:text-4xl leading-[1.1] mb-4 group-hover:text-ink-light transition-colors italic ink-bleed-heavy max-w-4xl">
                    {digest.big_question || featuredEssay.title}
                  </h2>
                </Link>
                <p className="font-body text-base text-ink-muted italic mb-4 max-w-lg">
                  {featuredEssay.subtitle || featuredEssay.thesis}
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] lowercase px-1.5 py-0.5 border-l-2 border-accent-red pl-2 text-ink-muted">
                    {featuredEssay.topic}
                  </span>
                  <span className="text-rule-light text-[11px]">&#183;</span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {featuredEssay.reading_time_minutes} min read
                  </span>
                </div>
                <div className="envelope-fold mt-8" />
              </section>
            )}

            {/* Pull quote — below featured essay, above columns */}
            {pullQuote && (
              <section className="mb-10 max-w-lg md:ml-[10%] scroll-reveal">
                <blockquote className="font-headline text-xl italic leading-snug text-ink border-l-4 pl-5 ink-bleed" style={{ borderColor: featuredEssay ? getTopicTint(featuredEssay.topic).border : "rgb(var(--color-ink))" }}>
                  <span className="font-logo text-3xl leading-none">&ldquo;</span>{pullQuote.trim()}<span className="font-logo text-3xl leading-none">&rdquo;</span>
                </blockquote>
                {featuredEssay && (
                  <p className="font-mono text-[11px] text-ink-muted mt-2 pl-5">
                    — from &ldquo;{featuredEssay.title}&rdquo;
                  </p>
                )}
              </section>
            )}

            {/* Decorative divider */}
            <div className="divider-asterisk" />

            {/* Two-column layout: essays + sidebar */}
            <div className="flex flex-col md:flex-row gap-12 md:gap-16">
              {/* Main column — essays */}
              <div className="flex-1 min-w-0">
                {otherEssays.length > 0 && (
                  <section className="mb-12">
                    <p className="section-label mb-6">essays</p>
                    {otherEssays.map((essay, i) => (
                      <div key={essay.id} className="scroll-reveal">
                        <EssayCard
                          id={essay.id}
                          title={essay.title}
                          subtitle={essay.subtitle}
                          topic={essay.topic}
                          readingTime={essay.reading_time_minutes}
                          lengthTier={essay.length_tier}
                          href={`/essay/${essay.id}`}
                          variant={CARD_VARIANTS[i % CARD_VARIANTS.length]}
                        />
                      </div>
                    ))}
                  </section>
                )}
              </div>

              {/* Sidebar */}
              <aside className="md:w-[280px] lg:w-[320px] shrink-0">
                <div className="md:sticky md:top-24 space-y-10">
                  {/* From the Wire */}
                  {digest.articles.length > 0 && (
                    <div className="scroll-reveal dot-grid py-4 px-4 -mx-2 border-t-2 border-accent-blue">
                      <p className="section-label mb-3 text-accent-blue">from the wire</p>
                      {digest.articles.slice(0, 4).map((article) => (
                        <ArticleCard
                          key={article.id}
                          id={article.id}
                          title={article.title}
                          summary={article.summary}
                          source={article.source_name}
                          category={article.category}
                          href={`/article/${article.id}`}
                          variant="sm"
                        />
                      ))}
                    </div>
                  )}

                  {/* Surprise me */}
                  {randomEssay && (
                    <div className="scroll-reveal border border-dashed border-rule-light p-4 text-center">
                      <p className="font-mono text-[10px] text-ink-muted mb-2">feeling curious?</p>
                      <a
                        href={`/essay/${randomEssay.id}`}
                        className="font-mono text-[11px] lowercase text-ink hover:text-ink-light underline decoration-dashed underline-offset-2 transition-colors"
                      >
                        surprise me ~
                      </a>
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {/* Closing — zine back page */}
            <footer className="mb-16 pt-8 border-t border-dashed border-rule-light">
              <div className="max-w-2xl">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    {digest.headline && (
                      <p className="font-headline text-lg italic text-ink-muted mb-3 max-w-sm">
                        {digest.headline}
                      </p>
                    )}
                    <p className="font-mono text-[11px] text-ink-muted">
                      that&apos;s all for today. see you tomorrow.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => setShowIntentPicker(!showIntentPicker)}
                      disabled={generating}
                      className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
                    >
                      {generating ? "starting..." : "regenerate"}
                    </button>
                    {randomEssay && (
                      <a
                        href={`/essay/${randomEssay.id}`}
                        className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink underline decoration-dashed underline-offset-2"
                      >
                        or read something random ~
                      </a>
                    )}
                  </div>
                </div>

                {/* Intent picker */}
                {showIntentPicker && (
                  <div className="border border-dashed border-rule-light p-4 mb-4">
                    <p className="font-mono text-[11px] text-ink-muted mb-3">
                      what kind of edition do you want?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "balanced", label: "balanced", desc: "a mix of everything" },
                        { key: "go_deeper", label: "go deeper", desc: "advanced, specialist content" },
                        { key: "surprise_me", label: "surprise me", desc: "unexpected cross-discipline connections" },
                        { key: "new_territory", label: "new territory", desc: "obscure corners, fresh angles" },
                      ].map(({ key, label, desc }) => (
                        <button
                          key={key}
                          onClick={() => handleGenerate(true, key)}
                          disabled={generating}
                          className="text-left p-3 border border-rule-light hover:border-ink hover:bg-paper-warm transition-all group disabled:opacity-40"
                        >
                          <span className="font-mono text-[11px] lowercase text-ink group-hover:font-bold block">
                            {label}
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted block mt-0.5">
                            {desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </footer>
          </div>
        )}

        {/* Page footer */}
        <div className="airmail-border mt-8 mb-4" />
      </div>
    </main>
  );
}
