"use client";

import { useEffect, useState } from "react";
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
          <p className="font-headline text-xl italic ink-bleed">Today&apos;s Edition</p>
          <p className="font-mono text-[11px] text-ink-muted">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="rule-hairline mb-8" />

        {/* Error */}
        {error && <InlineError message={error} onDismiss={() => setError(null)} />}

        {/* Topics — colored pills */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="section-label mr-1">your topics</span>
            {user?.interests.map((interest) => {
              const tint = getTopicTint(interest.topic);
              return (
                <span
                  key={interest.id}
                  className="inline-flex items-center gap-1 font-mono text-[11px] lowercase px-2 py-0.5"
                  style={{ backgroundColor: tint.bg, color: "#4a4a4a" }}
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
              Your digest is being written
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
          <>
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
              {randomEssay && (
                <a
                  href={`/essay/${randomEssay.id}`}
                  className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors underline decoration-dashed underline-offset-2"
                >
                  surprise me ~
                </a>
              )}
            </div>

            {/* Featured essay — front page treatment */}
            {featuredEssay && (
              <section
                className="mb-12 mx-[-1.5rem] md:mx-[-3rem] px-8 md:px-12 py-10"
                style={{ backgroundColor: getTopicTint(featuredEssay.topic).bg }}
              >
                <div className="rule-double mb-6" />
                {digest.big_question && (
                  <p className="font-mono text-[11px] text-ink-muted mb-4">
                    -- today&apos;s question
                  </p>
                )}
                <Link href={`/essay/${featuredEssay.id}`} className="group block">
                  <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-4 group-hover:text-ink-light transition-colors italic ink-bleed-heavy max-w-4xl">
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

            {/* Pull quote — extracted from featured essay */}
            {pullQuote && (
              <section className="mb-12 max-w-lg md:ml-[20%]">
                <blockquote className="font-headline text-2xl md:text-3xl italic leading-snug text-ink border-l-4 pl-6 ink-bleed-heavy" style={{ borderColor: featuredEssay ? getTopicTint(featuredEssay.topic).border : "#1a1a1a" }}>
                  &ldquo;{pullQuote.trim()}&rdquo;
                </blockquote>
                {featuredEssay && (
                  <p className="font-mono text-[11px] text-ink-muted mt-3 pl-6">
                    — from &ldquo;{featuredEssay.title}&rdquo;
                  </p>
                )}
              </section>
            )}

            {/* Decorative divider */}
            <div className="divider-asterisk" />

            {/* Essays — staggered, mixed variants */}
            {otherEssays.length > 0 && (
              <section className="mb-12">
                <p className="section-label mb-6">essays</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
                  <div>
                    {otherEssays
                      .filter((_, i) => i % 2 === 0)
                      .map((essay, i) => (
                        <EssayCard
                          key={essay.id}
                          id={essay.id}
                          title={essay.title}
                          subtitle={essay.subtitle}
                          topic={essay.topic}
                          readingTime={essay.reading_time_minutes}
                          lengthTier={essay.length_tier}
                          href={`/essay/${essay.id}`}
                          variant={CARD_VARIANTS[i % CARD_VARIANTS.length]}
                        />
                      ))}
                  </div>
                  <div className="md:mt-16">
                    {otherEssays
                      .filter((_, i) => i % 2 === 1)
                      .map((essay, i) => (
                        <EssayCard
                          key={essay.id}
                          id={essay.id}
                          title={essay.title}
                          subtitle={essay.subtitle}
                          topic={essay.topic}
                          readingTime={essay.reading_time_minutes}
                          lengthTier={essay.length_tier}
                          href={`/essay/${essay.id}`}
                          variant={CARD_VARIANTS[(i + 1) % CARD_VARIANTS.length]}
                        />
                      ))}
                  </div>
                </div>
              </section>
            )}

            {/* From the Wire — on dot grid, offset */}
            {digest.articles.length > 0 && (
              <section className="mb-12 md:ml-auto md:max-w-3xl dot-grid py-6 px-6 -mx-2 border-t-2 border-accent-blue">
                <p className="section-label mb-4 text-accent-blue">from the wire</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                  {digest.articles.slice(0, 6).map((article) => (
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
              </section>
            )}

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
          </>
        )}

        {/* Page footer */}
        <div className="airmail-border mt-8 mb-4" />
      </div>
    </main>
  );
}
