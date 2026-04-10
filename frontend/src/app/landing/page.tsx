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
  "Psychology",
  "Mathematics",
];

const STEPS = [
  {
    num: "01",
    title: "choose your curiosities",
    desc: "Pick 3\u20137 topics that fascinate you. Anything from quantum mechanics to political philosophy.",
  },
  {
    num: "02",
    title: "we research overnight",
    desc: "Our AI pipeline scours books, papers, lectures, and podcasts \u2014 assembling a research dossier on each topic.",
  },
  {
    num: "03",
    title: "original essays, written for you",
    desc: "Every morning, a fresh edition lands: long-form essays with real sources, not summaries or listicles.",
  },
  {
    num: "04",
    title: "your library grows",
    desc: "Every edition is saved. Bookmark what resonates. Search across everything. Watch your intellectual map expand.",
  },
];

const TOPIC_ROTATIONS = [-2, 1, -1, 2, 0, -1.5, 1.5, -0.5, 2, -2, 1, -1];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* ============ MASTHEAD ============ */}
      <header>
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
          <div className="airmail-border mb-4">
            <div className="flex items-baseline justify-between">
              <h1 className="font-logo text-5xl md:text-7xl lg:text-8xl tracking-tight italic ink-bleed-heavy">
                postmail
              </h1>
              <nav className="flex gap-5 items-baseline">
                <Link
                  href="/login"
                  className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors hover-underline"
                >
                  sign in
                </Link>
                <Link
                  href="/onboarding"
                  className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-all duration-300 hover:scale-105"
                >
                  get started
                </Link>
              </nav>
            </div>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-ink-muted">
            your intellectual daily digest
          </p>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="min-h-[65vh] flex items-end">
        <div className="max-w-6xl mx-auto px-6 pb-20 w-full">
          <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl italic ink-bleed-heavy leading-[0.95] mb-10 max-w-5xl">
            original essays written for you every morning.
          </h2>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <p className="font-body text-base md:text-lg text-ink-light leading-relaxed max-w-md">
              A personal research assistant that reads books, papers, and
              lectures — then writes you original long-form essays with real
              sources. Not summaries. Real writing.
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
                content. Each essay has a thesis, sources, and a point of view.
              </p>
            </div>
            <div className="px-0 md:px-8 md:border-r md:border-rule-light py-8 md:py-0 border-t md:border-t-0 border-rule-light">
              <p className="font-headline text-2xl italic ink-bleed mb-3">
                curated links
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                The best writing from across the web on your topics — summarized
                so you know what&apos;s worth your time before you click.
              </p>
            </div>
            <div className="pl-0 md:pl-8 pt-8 md:pt-0 border-t md:border-t-0 border-rule-light">
              <p className="font-headline text-2xl italic ink-bleed mb-3">
                your growing library
              </p>
              <p className="font-body text-sm text-ink-light leading-relaxed">
                Every edition is saved and searchable. Bookmark what resonates.
                Build an intellectual archive that&apos;s uniquely yours.
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
                  <span className="font-headline text-6xl italic opacity-[0.12] leading-none select-none shrink-0 -mt-2">
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
            Choose from dozens of domains, or write your own.
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
            <h3 className="font-headline text-3xl md:text-4xl lg:text-5xl italic ink-bleed-heavy leading-[1.05] mb-4">
              the archaeology of attention
            </h3>
            <p className="font-body text-sm text-ink-muted italic mb-8">
              how our ancestors focused — and what we lost along the way
            </p>
            <div className="envelope-fold mb-8" />
            <p className="font-body text-[15px] md:text-base leading-[1.85] text-ink-light">
              <span className="font-headline text-[3.2rem] leading-none float-left mr-3 mt-1 italic">
                I
              </span>
              n the sixth century, Benedictine monks developed a radical
              technology for managing attention. They called it the{" "}
              <em>horarium</em> — a strict schedule that divided the day into
              periods of prayer, work, and contemplation. Every hour had its
              purpose. Every moment was accounted for...
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
            Like having a brilliant friend who reads everything and tells you
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
