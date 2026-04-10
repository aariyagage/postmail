"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SAMPLE_TOPICS = [
  "Philosophy",
  "Cognitive Science",
  "Economics",
  "History",
  "AI & Machine Learning",
  "Neuroscience",
  "Physics",
  "Literature",
  "Political Theory",
  "Biology & Evolution",
  "Psychology",
  "Mathematics",
];

const STEPS = [
  {
    num: "01",
    title: "choose your curiosities",
    desc: "pick 3\u20137 topics that fascinate you. anything from quantum mechanics to political philosophy.",
  },
  {
    num: "02",
    title: "we research overnight",
    desc: "our AI pipeline scours books, papers, lectures, and podcasts \u2014 assembling a research dossier on each topic.",
  },
  {
    num: "03",
    title: "original essays, written for you",
    desc: "every morning, a fresh edition lands: long-form essays with real sources, not summaries or listicles.",
  },
  {
    num: "04",
    title: "your library grows",
    desc: "every edition is saved. bookmark what resonates. search across everything. watch your intellectual map expand.",
  },
];

const TOPIC_ROTATIONS = [-2, 1, -1, 2, 0, -1.5, 1.5, -0.5, 2, -2, 1, -1];

const HERO_TEXT = "original essays written for you every morning.";

// Intro animation clippings — packed tight, large text, fill the screen
const CLIPPINGS = [
  // Top row
  { title: "the archaeology of attention", topic: "cognitive science", time: "8 min", top: "0%", left: "0%", rotate: -2, bg: "#f0ddd8", size: "lg" },
  { title: "why we forgot how to be bored", topic: "philosophy", time: "6 min", top: "2%", left: "35%", rotate: 3, bg: "#dde8df", size: "lg" },
  { title: "on the ethics of memory", topic: "neuroscience", time: "5 min", top: "1%", left: "65%", rotate: -1.5, bg: "#e4e0ed", size: "lg" },
  // Second row
  { title: "what darwin missed about cooperation", topic: "biology", time: "7 min", top: "14%", left: "10%", rotate: 2, bg: "#dce6ed", size: "lg" },
  { title: "the paradox of choice", topic: "history", time: "10 min", top: "16%", left: "50%", rotate: -3, bg: "#f2ebe0", size: "md" },
  { title: "consciousness is a hallucination", topic: "psychology", time: "4 min", top: "13%", left: "75%", rotate: 1.5, bg: "#f2e0e4", size: "lg" },
  // Third row
  { title: "quantum mechanics for poets", topic: "physics", time: "9 min", top: "28%", left: "0%", rotate: -1, bg: "#d8ede6", size: "md" },
  { title: "the geometry of thought", topic: "mathematics", time: "6 min", top: "30%", left: "28%", rotate: 4, bg: "#ede8da", size: "lg" },
  { title: "language shapes reality", topic: "linguistics", time: "5 min", top: "27%", left: "58%", rotate: -2.5, bg: "#f0ddd8", size: "lg" },
  // Fourth row
  { title: "markets as moral systems", topic: "economics", time: "7 min", top: "42%", left: "5%", rotate: 3, bg: "#dde8df", size: "lg" },
  { title: "the invention of loneliness", topic: "sociology", time: "8 min", top: "44%", left: "40%", rotate: -2, bg: "#e4e0ed", size: "md" },
  { title: "beauty and the algorithm", topic: "art & design", time: "6 min", top: "40%", left: "68%", rotate: 2, bg: "#dce6ed", size: "lg" },
  // Fifth row
  { title: "free will is a feeling", topic: "philosophy", time: "5 min", top: "56%", left: "0%", rotate: -3, bg: "#f2ebe0", size: "lg" },
  { title: "how stories rewire the brain", topic: "literature", time: "7 min", top: "55%", left: "32%", rotate: 1.5, bg: "#f2e0e4", size: "lg" },
  { title: "the sleep of reason", topic: "cognitive science", time: "9 min", top: "58%", left: "62%", rotate: -1, bg: "#d8ede6", size: "md" },
  // Sixth row
  { title: "power corrupts symmetrically", topic: "political theory", time: "6 min", top: "68%", left: "8%", rotate: 2.5, bg: "#ede8da", size: "md" },
  { title: "the body keeps the score", topic: "neuroscience", time: "8 min", top: "70%", left: "38%", rotate: -4, bg: "#f0ddd8", size: "lg" },
  { title: "utopia as method", topic: "political theory", time: "5 min", top: "67%", left: "70%", rotate: 1, bg: "#dde8df", size: "lg" },
  // Bottom row
  { title: "entropy and empathy", topic: "physics", time: "6 min", top: "80%", left: "0%", rotate: -2, bg: "#e4e0ed", size: "lg" },
  { title: "the last library", topic: "history", time: "7 min", top: "82%", left: "30%", rotate: 3, bg: "#dce6ed", size: "lg" },
  { title: "what machines dream about", topic: "AI", time: "4 min", top: "79%", left: "55%", rotate: -1.5, bg: "#f2ebe0", size: "md" },
  { title: "silence as resistance", topic: "philosophy", time: "5 min", top: "83%", left: "78%", rotate: 2, bg: "#f2e0e4", size: "lg" },
];

function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Pop in clippings one by one
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= CLIPPINGS.length) {
        clearInterval(interval);
        // Hold briefly, then fade
        setTimeout(() => setFading(true), 400);
        // Complete after fade finishes
        setTimeout(() => onComplete(), 1200);
      }
    }, 90);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-paper overflow-hidden"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {CLIPPINGS.map((clip, i) => {
        const isVisible = i < visibleCount;
        const sizeClasses =
          clip.size === "lg"
            ? "px-7 py-6 max-w-[420px]"
            : clip.size === "md"
              ? "px-6 py-5 max-w-[350px]"
              : "px-5 py-4 max-w-[300px]";
        const titleClasses =
          clip.size === "lg"
            ? "font-headline text-2xl md:text-3xl italic ink-bleed leading-snug"
            : clip.size === "md"
              ? "font-headline text-xl md:text-2xl italic ink-bleed leading-snug"
              : "font-headline text-lg md:text-xl italic ink-bleed leading-snug";

        return (
          <div
            key={i}
            className={`absolute ${sizeClasses} border border-rule-light`}
            style={{
              top: clip.top,
              left: clip.left,
              transform: `rotate(${clip.rotate}deg) scale(${isVisible ? 1 : 0.3})`,
              opacity: isVisible ? 1 : 0,
              backgroundColor: clip.bg,
              transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              zIndex: i + 1,
            }}
          >
            <p className="font-mono text-[9px] lowercase text-ink-muted mb-1.5 tracking-wide">
              {clip.topic} &middot; {clip.time}
            </p>
            <p className={titleClasses}>{clip.title}</p>
            <div className="border-b border-dashed border-rule-light mt-3 opacity-40" />
          </div>
        );
      })}

      {/* Postmail watermark in center */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: visibleCount > 8 ? 0 : 0.04,
          transition: "opacity 1s ease",
        }}
      >
        <span className="font-logo text-[10rem] md:text-[14rem] italic select-none">
          postmail
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Check if intro was already shown this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("postmail-intro-seen")) {
        setSkipIntro(true);
        setIntroComplete(true);
      }
    }
  }, []);

  // Start typing after intro completes
  useEffect(() => {
    if (!introComplete) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(HERO_TEXT.slice(0, i));
      if (i >= HERO_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => setShowCursor(false), 1500);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [introComplete]);

  const handleIntroComplete = () => {
    setIntroComplete(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("postmail-intro-seen", "1");
    }
  };

  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-paper">
      {/* Intro animation overlay */}
      {!skipIntro && !introComplete && (
        <IntroAnimation onComplete={handleIntroComplete} />
      )}

      {/* ============ MASTHEAD ============ */}
      <header className="mb-4">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-5">
          <div className="airmail-border mb-6">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-5">
                <h1 className="font-logo text-5xl md:text-6xl tracking-tight italic ink-bleed-heavy">
                  postmail
                </h1>
              </div>
              <nav className="flex gap-5 items-baseline">
                <Link
                  href="/login"
                  className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors hover-underline"
                >
                  sign in
                </Link>
                <Link
                  href="/onboarding"
                  className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-all duration-300"
                >
                  get started
                </Link>
              </nav>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] text-ink-muted">{today}</p>
            <div className="flex-1 mx-4 border-b border-dashed border-rule-light" />
            <p className="font-mono text-[11px] text-ink-muted italic">your intellectual daily digest</p>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section>
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 w-full">
          <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl italic ink-bleed-heavy leading-[0.95] mb-10 max-w-5xl">
            {typedText}
            {showCursor && (
              <span className="inline-block w-[3px] h-[0.8em] bg-ink ml-1 align-baseline animate-pulse" />
            )}
          </h2>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <p className="font-body text-base md:text-lg text-ink-light leading-relaxed max-w-md">
              a personal research assistant that reads books, papers, and
              lectures — then writes you original long-form essays with real
              sources. not summaries. real writing.
            </p>
            <div className="flex items-center gap-6 shrink-0">
              <Link
                href="/onboarding"
                className="font-mono text-[12px] lowercase bg-ink text-paper px-8 py-4 btn-ink-spread transition-colors"
              >
                start reading — it&apos;s free
              </Link>
              <div
                className="postage-stamp stamp-wobble hidden md:block"
                style={{ transform: "rotate(3deg)" }}
              >
                <span className="postage-stamp-value">No. 1</span>
                <span className="postage-stamp-label">edition</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHAT YOU GET ============ */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="rule-double mb-6" style={{ borderColor: "#c41e3a" }} />
          <p className="section-label mb-10">what arrives in your digest</p>

          <div className="grid md:grid-cols-3 gap-0">
            <div className="pr-8 md:border-r md:border-rule-light pb-8 md:pb-0">
              <p className="font-headline text-2xl italic ink-bleed mb-3">
                deep essays
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                5–8 minute reads with original arguments, not regurgitated
                content. each essay has a thesis, sources, and a point of view.
              </p>
            </div>
            <div className="px-0 md:px-8 md:border-r md:border-rule-light py-8 md:py-0 border-t md:border-t-0 border-rule-light">
              <p className="font-headline text-2xl italic ink-bleed mb-3">
                curated links
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                the best writing from across the web on your topics — summarized
                so you know what&apos;s worth your time before you click.
              </p>
            </div>
            <div className="pl-0 md:pl-8 pt-8 md:pt-0 border-t md:border-t-0 border-rule-light">
              <p className="font-headline text-2xl italic ink-bleed mb-3">
                your growing library
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                every edition is saved and searchable. bookmark what resonates.
                build an intellectual archive that&apos;s uniquely yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="bg-paper-warm">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="section-label mb-12">how it works</p>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                {i > 0 && i % 2 === 0 && (
                  <div className="envelope-fold absolute -top-6 left-0 right-0" />
                )}
                <div className="flex gap-6 items-start">
                  <span className="font-logo text-6xl italic opacity-[0.15] leading-none select-none shrink-0 -mt-2">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="font-headline text-lg italic ink-bleed mb-2">
                      {step.title}
                    </h3>
                    <p className="font-body text-sm text-ink-light leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TOPICS PREVIEW ============ */}
      <section className="overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="section-label mb-3">topics people explore</p>
          <p className="font-body text-sm text-ink-muted mb-10">
            choose from dozens of domains, or write your own.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 px-4 pb-20 max-w-5xl mx-auto">
          {SAMPLE_TOPICS.map((topic, i) => (
            <span
              key={topic}
              className={`font-mono text-[11px] lowercase px-4 py-2 border transition-colors cursor-default ${
                i === 2 || i === 7
                  ? "border-accent-red text-accent-red"
                  : i === 5
                    ? "border-accent-blue text-accent-blue"
                    : "border-rule-light text-ink-muted hover:border-ink hover:text-ink"
              }`}
              style={{ transform: `rotate(${TOPIC_ROTATIONS[i]}deg)` }}
            >
              {topic}
            </span>
          ))}
          <span
            className="font-mono text-[11px] lowercase px-4 py-2 text-ink-muted italic"
            style={{ transform: "rotate(1deg)" }}
          >
            + anything you type...
          </span>
        </div>
      </section>

      {/* ============ SAMPLE ESSAY PREVIEW ============ */}
      <section>
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="rule-double mb-8" />
          <p className="section-label mb-8">a taste of what you&apos;ll read</p>

          <div className="bg-paper px-6 md:px-10 py-10 border border-ink">
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-[11px] lowercase px-1.5 py-0.5 bg-tint-lavender text-ink-light">
                cognitive science
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                8 min read
              </span>
            </div>
            <h3 className="font-headline text-3xl md:text-4xl italic ink-bleed-heavy leading-[1.05] mb-4">
              the archaeology of attention
            </h3>
            <p className="font-body text-sm text-ink-muted italic mb-8">
              how our ancestors focused — and what we lost along the way
            </p>
            <div className="envelope-fold mb-8" />
            <p className="font-body text-[15px] md:text-base leading-[1.85] text-ink-light">
              <span className="font-headline text-[3.2rem] leading-none float-left mr-3 mt-1 italic">
                i
              </span>
              n the sixth century, benedictine monks developed a radical
              technology for managing attention. they called it the{" "}
              <em>horarium</em> — a strict schedule that divided the day into
              periods of prayer, work, and contemplation. every hour had its
              purpose. every moment was accounted for...
            </p>
            <p className="font-mono text-[10px] text-ink-muted mt-8 italic">
              — continues for 1,800 words, with 3 sources
            </p>
          </div>
          <div className="rule-double mt-8" />
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-headline text-4xl md:text-5xl italic ink-bleed-heavy mb-6 leading-tight">
            your morning read,<br />tailored to you.
          </h2>
          <p className="font-body text-lg text-ink-light mb-10 max-w-lg mx-auto">
            like having a brilliant friend who reads everything and tells you
            the good parts.
          </p>
          <Link
            href="/onboarding"
            className="inline-block font-mono text-[12px] lowercase bg-ink text-paper px-8 py-4 hover:bg-ink-light transition-colors"
          >
            get started — it&apos;s free
          </Link>
          <div className="airmail-border mt-16" />
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="airmail-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="font-logo text-lg italic ink-bleed">postmail</p>
          <nav className="flex gap-5">
            <Link
              href="/login"
              className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors"
            >
              sign in
            </Link>
            <Link
              href="/onboarding"
              className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors"
            >
              get started
            </Link>
          </nav>
          <p className="font-mono text-[10px] text-ink-muted hidden md:block">
            built by aariya gage
          </p>
        </div>
      </footer>
    </main>
  );
}
