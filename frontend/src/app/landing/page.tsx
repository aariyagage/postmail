"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme";

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


export default function LandingPage() {
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <main className="min-h-screen bg-paper">
      {/* ============ MASTHEAD ============ */}
      <header className="mb-4">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-5">
          <div className="airmail-border mb-6">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-5">
                <h1 className="font-headline text-5xl tracking-tight italic ink-bleed-heavy">
                  Postmail
                </h1>
              </div>
              <nav className="flex gap-5 items-baseline">
                <button
                  onClick={toggleTheme}
                  className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors"
                  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                >
                  {theme === "light" ? "dark" : "light"}
                </button>
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
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-20">
        {/* Hero text */}
        <div className="max-w-2xl">
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

        {/* Decorative postage stamp */}
        <div className="hidden md:block float-right -mt-48 mr-8">
          <div className="postage-stamp" style={{ transform: "rotate(3deg)" }}>
            <span className="postage-stamp-value">No. 001</span>
            <span className="postage-stamp-label">first edition</span>
          </div>
        </div>
      </section>

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
      <section className="bg-paper-warm">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="section-label mb-10">how it works</p>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-10">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-5">
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

      {/* ============ TOPICS PREVIEW ============ */}
      <section>
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="section-label mb-3">topics people explore</p>
          <p className="font-body text-sm text-ink-muted mb-8">
            Choose from dozens of domains, or write your own. You&apos;re not limited to what we suggest.
          </p>
          <div className="flex flex-wrap gap-2 mb-10">
            {SAMPLE_TOPICS.map((topic) => (
              <span
                key={topic}
                className="font-mono text-[11px] lowercase px-3 py-1.5 border border-rule-light text-ink-muted hover:border-ink hover:text-ink transition-colors cursor-default"
              >
                {topic}
              </span>
            ))}
            <span className="font-mono text-[11px] lowercase px-3 py-1.5 text-ink-muted italic">
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
          <div className="bg-paper px-8 py-8 border border-rule-light">

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
      <section className="border-t border-dashed border-rule-light">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
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
        </div>
      </footer>
    </main>
  );
}
