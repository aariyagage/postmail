"use client";

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
];

const STEPS = [
  {
    num: "01",
    title: "Choose your curiosities",
    desc: "Pick 3\u20137 topics that fascinate you. Anything from quantum mechanics to political philosophy.",
  },
  {
    num: "02",
    title: "We research overnight",
    desc: "Our AI pipeline scours books, papers, lectures, and podcasts \u2014 assembling a research dossier on each topic.",
  },
  {
    num: "03",
    title: "Original essays, written for you",
    desc: "Every morning, a fresh edition lands: long-form essays with real sources, not summaries or listicles.",
  },
  {
    num: "04",
    title: "Your library grows",
    desc: "Every edition is saved. Bookmark what resonates. Search across everything. Watch your intellectual map expand.",
  },
];

// Scattered keywords for the hero watermark
const WATERMARK_WORDS = [
  { text: "consciousness", x: 68, y: 12, size: 14, opacity: 0.06, rotate: -8 },
  { text: "entropy", x: 82, y: 28, size: 18, opacity: 0.07, rotate: 5 },
  { text: "rhetoric", x: 72, y: 45, size: 12, opacity: 0.05, rotate: -3 },
  { text: "game theory", x: 60, y: 62, size: 16, opacity: 0.06, rotate: 7 },
  { text: "evolution", x: 78, y: 75, size: 15, opacity: 0.07, rotate: -5 },
  { text: "metaphysics", x: 65, y: 88, size: 13, opacity: 0.05, rotate: 4 },
  { text: "neural networks", x: 85, y: 55, size: 11, opacity: 0.04, rotate: -6 },
  { text: "epistemology", x: 55, y: 35, size: 12, opacity: 0.05, rotate: 9 },
  { text: "causality", x: 90, y: 8, size: 13, opacity: 0.06, rotate: -4 },
  { text: "symbiosis", x: 75, y: 92, size: 14, opacity: 0.05, rotate: 2 },
];

// Typographic constellation nodes
const CONSTELLATION_NODES = [
  { symbol: "§", x: 15, y: 20, color: "#c0564e" },
  { symbol: "¶", x: 45, y: 12, color: "#6b8e6b" },
  { symbol: "†", x: 75, y: 25, color: "#5b7fa5" },
  { symbol: "∴", x: 30, y: 50, color: "#c4a43e" },
  { symbol: "◊", x: 60, y: 45, color: "#c0564e" },
  { symbol: "∞", x: 85, y: 55, color: "#6b8e6b" },
  { symbol: "※", x: 20, y: 75, color: "#5b7fa5" },
  { symbol: "‡", x: 50, y: 70, color: "#c4a43e" },
  { symbol: "∮", x: 80, y: 80, color: "#c0564e" },
];

// Connections between constellation nodes (indices)
const CONSTELLATION_EDGES = [
  [0, 1], [1, 2], [0, 3], [3, 4], [4, 5],
  [2, 5], [3, 6], [6, 7], [7, 8], [4, 7], [1, 4],
];

// Envelope wireframe (box-drawing characters)
const ENVELOPE_ART = `┌─────────────────────────────┐
│╲                           ╱│
│  ╲                       ╱  │
│    ╲                   ╱    │
│      ╲               ╱      │
│        ╲           ╱        │
│          ╲       ╱          │
│            ╲   ╱            │
│              ╳              │
│            ╱   ╲            │
│          ╱       ╲          │
│                             │
│                             │
└─────────────────────────────┘`;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 pb-20">
        {/* Scattered keyword watermarks — floating behind hero text */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {WATERMARK_WORDS.map((w, i) => (
            <span
              key={i}
              className="absolute font-headline italic select-none landing-float"
              style={{
                left: `${w.x}%`,
                top: `${w.y}%`,
                fontSize: `${w.size}px`,
                opacity: w.opacity,
                transform: `rotate(${w.rotate}deg)`,
                color: "#1a1a1a",
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${8 + (i % 4) * 2}s`,
              }}
            >
              {w.text}
            </span>
          ))}
        </div>

        {/* Airmail top bar */}
        <div className="airmail-border pb-6 mb-12 relative z-10">
          <div className="flex items-baseline justify-between">
            <h1 className="font-headline text-5xl md:text-6xl italic ink-bleed-heavy tracking-tight">
              Postmail
            </h1>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors"
              >
                sign in
              </Link>
              <Link
                href="/onboarding"
                className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors"
              >
                get started
              </Link>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="max-w-2xl relative z-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted mb-6">
            your intellectual daily digest
          </p>
          <h2 className="font-headline text-3xl md:text-4xl italic ink-bleed leading-snug mb-6">
            Original essays on the topics you love — researched, written, and delivered every morning.
          </h2>
          <p className="font-body text-lg text-ink-light leading-relaxed mb-8">
            Postmail is a personal research assistant that reads books, papers, and lectures
            on your behalf, then writes you original long-form essays. Not summaries. Not
            links. Real writing, with real sources, tailored to what you actually care about.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="font-mono text-[12px] lowercase bg-ink text-paper px-6 py-3 hover:bg-ink-light transition-colors"
            >
              start reading
            </Link>
            <span className="font-mono text-[10px] text-ink-muted">
              free — no credit card
            </span>
          </div>
        </div>

        {/* Envelope wireframe — faint watermark */}
        <div className="hidden lg:block absolute right-0 top-32 pointer-events-none select-none" aria-hidden="true">
          <pre
            className="font-mono text-[10px] leading-[1.4] landing-envelope-fade"
            style={{ color: "rgba(26, 26, 26, 0.06)" }}
          >
            {ENVELOPE_ART}
          </pre>
        </div>

        {/* Decorative postage stamp */}
        <div className="hidden md:block absolute right-12 top-48 z-10">
          <div className="postage-stamp landing-stamp-enter" style={{ transform: "rotate(3deg)" }}>
            <span className="postage-stamp-value">No. 001</span>
            <span className="postage-stamp-label">first edition</span>
          </div>
        </div>
      </section>

      {/* ============ CONSTELLATION DIVIDER ============ */}
      <div className="relative h-32 max-w-5xl mx-auto" aria-hidden="true">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Dashed connection lines */}
          {CONSTELLATION_EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={CONSTELLATION_NODES[a].x}
              y1={CONSTELLATION_NODES[a].y}
              x2={CONSTELLATION_NODES[b].x}
              y2={CONSTELLATION_NODES[b].y}
              stroke="#c4b8a8"
              strokeWidth="0.15"
              strokeDasharray="0.8 0.6"
              className="landing-line-draw"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </svg>
        {/* Symbol nodes */}
        {CONSTELLATION_NODES.map((node, i) => (
          <span
            key={i}
            className="absolute font-headline text-lg select-none landing-node-pulse"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: "translate(-50%, -50%)",
              color: node.color,
              opacity: 0.3,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            {node.symbol}
          </span>
        ))}
      </div>

      {/* ============ WHAT YOU GET ============ */}
      <section className="border-t border-dashed border-rule-light">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="section-label mb-3">what arrives in your digest</p>
          <div className="envelope-fold mb-10" />

          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <p className="font-headline text-xl italic ink-bleed mb-3">
                Deep essays
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                5–8 minute reads with original arguments, not
                regurgitated content. Each essay has a thesis, sources,
                and a point of view.
              </p>
            </div>
            <div>
              <p className="font-headline text-xl italic ink-bleed mb-3">
                Curated links
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                The best writing from across the web on your topics — summarized
                so you know what&apos;s worth your time before you click.
              </p>
            </div>
            <div>
              <p className="font-headline text-xl italic ink-bleed mb-3">
                Your growing library
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                Every edition is saved and searchable. Bookmark
                what resonates. Build an intellectual archive that&apos;s
                uniquely yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="relative bg-paper-warm overflow-hidden">
        {/* Faint binary rain background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, col) => (
            <div
              key={col}
              className="absolute top-0 landing-binary-rain font-mono text-[9px] leading-[1.8] select-none"
              style={{
                left: `${8 + col * 8}%`,
                color: "rgba(26, 26, 26, 0.04)",
                animationDelay: `${col * 1.2}s`,
                animationDuration: `${18 + (col % 3) * 4}s`,
              }}
            >
              {Array.from({ length: 30 }).map((_, row) => (
                <div key={row}>{((col * 7 + row * 13) % 2) ? "1" : "0"}</div>
              ))}
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16 relative z-10">
          <p className="section-label mb-10">how it works</p>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-10">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex gap-5 landing-step-enter" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="postage-stamp flex-shrink-0 self-start">
                  <span className="postage-stamp-value">{step.num}</span>
                  <span className="postage-stamp-label">step</span>
                </div>
                <div>
                  <h3 className="font-headline text-lg italic ink-bleed mb-2">
                    {step.title}
                  </h3>
                  <p className="font-body text-sm text-ink-light leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONSTELLATION DIVIDER 2 ============ */}
      <div className="relative h-20 max-w-5xl mx-auto flex items-center justify-center" aria-hidden="true">
        <div className="flex items-center gap-6">
          {["◊", "—", "—", "—", "※", "—", "—", "—", "◊"].map((s, i) => (
            <span
              key={i}
              className="font-headline text-sm select-none"
              style={{ color: i === 4 ? "#c0564e" : "#c4b8a8", opacity: i === 4 ? 0.5 : 0.25 }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ============ TOPICS PREVIEW ============ */}
      <section>
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="section-label mb-3">topics people explore</p>
          <p className="font-body text-sm text-ink-muted mb-8">
            Choose from dozens of domains, or write your own. You&apos;re not limited to what we suggest.
          </p>
          <div className="flex flex-wrap gap-2 mb-10">
            {SAMPLE_TOPICS.map((topic, i) => (
              <span
                key={topic}
                className="font-mono text-[11px] lowercase px-3 py-1.5 border border-rule-light text-ink-muted landing-topic-enter hover:border-ink hover:text-ink transition-colors cursor-default"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {topic}
              </span>
            ))}
            <span className="font-mono text-[11px] lowercase px-3 py-1.5 text-ink-muted italic landing-topic-enter" style={{ animationDelay: "0.8s" }}>
              + anything you type...
            </span>
          </div>
        </div>
      </section>

      {/* ============ SAMPLE ESSAY PREVIEW ============ */}
      <section className="bg-paper-warm">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="section-label mb-6">a taste of what you&apos;ll read</p>

          {/* Faux essay card */}
          <div className="bg-paper px-8 py-8 border border-rule-light relative">
            {/* Decorative corner marks */}
            <span className="absolute top-2 left-3 font-mono text-[18px] text-rule-light select-none" aria-hidden="true">&#x231C;</span>
            <span className="absolute top-2 right-3 font-mono text-[18px] text-rule-light select-none" aria-hidden="true">&#x231D;</span>
            <span className="absolute bottom-2 left-3 font-mono text-[18px] text-rule-light select-none" aria-hidden="true">&#x231E;</span>
            <span className="absolute bottom-2 right-3 font-mono text-[18px] text-rule-light select-none" aria-hidden="true">&#x231F;</span>

            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 bg-tint-lavender text-ink-light">
                cognitive science
              </span>
              <div className="postage-stamp">
                <span className="postage-stamp-value">8</span>
                <span className="postage-stamp-label">min read</span>
              </div>
            </div>
            <h3 className="font-headline text-2xl md:text-3xl italic ink-bleed-heavy leading-snug mb-3">
              The Archaeology of Attention
            </h3>
            <p className="font-body text-sm text-ink-muted italic mb-6">
              How our ancestors focused — and what we lost along the way
            </p>
            <div className="envelope-fold mb-6" />
            <p className="font-body text-[15px] leading-[1.8] text-ink-light">
              In the sixth century, Benedictine monks developed a radical technology
              for managing attention. They called it the <em>horarium</em> — a strict
              schedule that divided the day into periods of prayer, work, and
              contemplation. Every hour had its purpose. Every moment was accounted for...
            </p>
            <p className="font-mono text-[10px] text-ink-muted mt-6 italic">
              — continues for 1,800 words, with 3 sources
            </p>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative border-t border-dashed border-rule-light overflow-hidden">
        {/* Faint constellation behind CTA */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {["§", "∞", "◊", "¶", "†"].map((s, i) => (
            <span
              key={i}
              className="absolute font-headline text-2xl select-none landing-node-pulse"
              style={{
                left: `${15 + i * 18}%`,
                top: `${30 + (i % 2) * 40}%`,
                color: "#c4b8a8",
                opacity: 0.1,
                animationDelay: `${i * 0.5}s`,
              }}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="max-w-3xl mx-auto px-6 py-20 text-center relative z-10">
          <h2 className="font-headline text-3xl md:text-4xl italic ink-bleed-heavy mb-4">
            Your morning read, tailored to you.
          </h2>
          <p className="font-body text-lg text-ink-light mb-8 max-w-lg mx-auto">
            Like having a brilliant friend who reads everything
            and tells you the good parts.
          </p>
          <Link
            href="/onboarding"
            className="inline-block font-mono text-[12px] lowercase bg-ink text-paper px-8 py-3 hover:bg-ink-light transition-colors"
          >
            get started — it&apos;s free
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="airmail-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="font-headline text-lg italic ink-bleed">Postmail</p>
          <p className="font-mono text-[10px] text-ink-muted">
            a portfolio project by aariya gage
          </p>
        </div>
      </footer>
    </main>
  );
}
