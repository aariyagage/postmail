"use client";

import { useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTopicTint } from "@/lib/topicColors";

interface CinematicReaderProps {
  bodyMarkdown: string;
  topic: string;
  thesis?: string;
  sources?: { source_type: string; title: string; author?: string; url?: string }[];
}

// Section layout modes cycle through these for visual variety
const SECTION_LAYOUTS = [
  "narrow",       // tight column, classic reading
  "wide-tinted",  // wider with tinted background
  "narrow-ruled", // narrow with ruled-paper background
  "wide",         // wider column, breathing room
  "narrow-offset",// narrow but shifted right
  "wide-tinted",  // repeat tinted
] as const;

type SectionLayout = (typeof SECTION_LAYOUTS)[number];

// Creative dividers between sections — all typographic, no images
const DIVIDERS = [
  "···",
  "—",
  "§",
  "//",
  "~",
  "※",
  "⁂",
  "∴",
];

interface Section {
  heading?: string;
  body: string;
  blockquoteBreakout?: string; // extracted blockquote for full-bleed treatment
  layout: SectionLayout;
  index: number;
}

function parseSections(markdown: string): Section[] {
  // Clean up the markdown
  const clean = markdown
    .replace(/PULL_QUOTE:\s*["']?(.+?)["']?\s*$/gm, "> $1")
    .replace(/\n{3,}/g, "\n\n");

  // Split by h2 headings (## )
  const parts = clean.split(/^(?=## )/m);
  const sections: Section[] = [];

  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    let heading: string | undefined;
    let body = trimmed;

    // Extract heading if present
    const headingMatch = trimmed.match(/^## (.+?)$/m);
    if (headingMatch) {
      heading = headingMatch[1].replace(/[*_#]/g, "").trim();
      body = trimmed.replace(/^## .+?\n/m, "").trim();
    }

    // Extract the first blockquote for potential breakout treatment
    let blockquoteBreakout: string | undefined;
    const bqMatch = body.match(/^> (.+?)$/m);
    if (bqMatch && bqMatch[1].length > 40) {
      blockquoteBreakout = bqMatch[1].replace(/^[""]|[""]$/g, "").trim();
      // Remove it from the body so it's not rendered twice
      body = body.replace(/^> .+?$/m, "").trim();
    }

    const sectionIndex = sections.length;
    sections.push({
      heading,
      body,
      blockquoteBreakout,
      layout: SECTION_LAYOUTS[sectionIndex % SECTION_LAYOUTS.length],
      index: sectionIndex,
    });
  });

  return sections;
}

function SectionDivider({ index, topic }: { index: number; topic: string }) {
  const tint = getTopicTint(topic);
  const symbol = DIVIDERS[index % DIVIDERS.length];

  return (
    <div className="cinematic-divider" aria-hidden="true">
      <span
        className="cinematic-divider-symbol"
        style={{ color: tint.border }}
      >
        {symbol}
      </span>
    </div>
  );
}

function BlockquoteBreakout({ text, topic }: { text: string; topic: string }) {
  const tint = getTopicTint(topic);

  return (
    <div
      className="cinematic-breakout scroll-reveal"
      style={{
        borderLeftColor: tint.border,
        backgroundColor: tint.bg + "40", // 25% opacity
      }}
    >
      <span className="cinematic-breakout-mark" style={{ color: tint.border }}>
        &ldquo;
      </span>
      <p className="cinematic-breakout-text">{text}</p>
      <span className="cinematic-breakout-mark cinematic-breakout-mark--end" style={{ color: tint.border }}>
        &rdquo;
      </span>
    </div>
  );
}

function SectionNumber({ num, topic }: { num: number; topic: string }) {
  const tint = getTopicTint(topic);
  return (
    <span
      className="cinematic-section-num"
      style={{ color: tint.border }}
      aria-hidden="true"
    >
      {String(num).padStart(2, "0")}
    </span>
  );
}

export default function CinematicReader({
  bodyMarkdown,
  topic,
  thesis,
  sources,
}: CinematicReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tint = getTopicTint(topic);

  const sections = useMemo(() => parseSections(bodyMarkdown), [bodyMarkdown]);

  // Scroll-driven reveal animations
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll(".scroll-reveal");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("scroll-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const layoutClass = (layout: SectionLayout) => {
    switch (layout) {
      case "narrow":
        return "cinematic-section cinematic-narrow";
      case "wide-tinted":
        return "cinematic-section cinematic-wide-tinted";
      case "narrow-ruled":
        return "cinematic-section cinematic-narrow-ruled";
      case "wide":
        return "cinematic-section cinematic-wide";
      case "narrow-offset":
        return "cinematic-section cinematic-narrow-offset";
      default:
        return "cinematic-section cinematic-narrow";
    }
  };

  return (
    <div ref={containerRef} className="cinematic-reader">
      {/* Thesis callout — the intellectual hook */}
      {thesis && (
        <div className="cinematic-thesis scroll-reveal">
          <span className="cinematic-thesis-label">thesis</span>
          <p className="cinematic-thesis-text">{thesis}</p>
          <div
            className="cinematic-thesis-rule"
            style={{ backgroundColor: tint.border }}
          />
        </div>
      )}

      {/* Sections — each with its own personality */}
      {sections.map((section, i) => (
        <div key={i}>
          {/* Divider between sections (not before first) */}
          {i > 0 && <SectionDivider index={i} topic={topic} />}

          <div
            className={`${layoutClass(section.layout)} scroll-reveal`}
            style={
              section.layout === "wide-tinted"
                ? { backgroundColor: tint.bg + "60" }
                : section.layout === "narrow-ruled"
                  ? { "--rule-color": tint.border + "30" } as React.CSSProperties
                  : undefined
            }
          >
            {/* Section number in margin */}
            {section.heading && (
              <div className="cinematic-heading-row">
                <SectionNumber num={i + 1} topic={topic} />
                <h2 className="cinematic-heading">{section.heading}</h2>
              </div>
            )}

            {/* Blockquote breakout — full-bleed moment */}
            {section.blockquoteBreakout && (
              <BlockquoteBreakout
                text={section.blockquoteBreakout}
                topic={topic}
              />
            )}

            {/* Section body */}
            <div
              className="cinematic-prose"
              style={{ "--pull-quote-color": tint.border } as React.CSSProperties}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.body}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {/* Inline sources — not a boring list, but a designed element */}
      {sources && sources.length > 0 && (
        <div className="cinematic-sources scroll-reveal">
          <div className="cinematic-sources-header">
            <span className="cinematic-sources-label">sources &amp; further reading</span>
            <div className="cinematic-sources-rule" style={{ backgroundColor: tint.border }} />
          </div>
          <div className="cinematic-sources-grid">
            {sources.map((source, i) => (
              <div key={i} className="cinematic-source-item">
                <span className="cinematic-source-type" style={{ color: tint.border }}>
                  [{source.source_type}]
                </span>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cinematic-source-title"
                  >
                    {source.title}
                  </a>
                ) : (
                  <span className="cinematic-source-title">{source.title}</span>
                )}
                {source.author && (
                  <span className="cinematic-source-author">— {source.author}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
