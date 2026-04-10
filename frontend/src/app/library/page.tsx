"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import PageShell from "@/components/PageShell";
import TopicTag from "@/components/TopicTag";
import { api } from "@/lib/api";
import type { Digest, DigestSummary } from "@/types";

export default function LibraryPage() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedDigest, setExpandedDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listDigests()
      .then((data) => {
        const list = data.filter(
          (d) => d.status === "complete" && d.essay_count > 0
        );
        setDigests(list);
      })
      .catch(() => {
        setError("Failed to load your library. Please try refreshing.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleExpand(digestId: string) {
    if (expanded === digestId) {
      setExpanded(null);
      setExpandedDigest(null);
      return;
    }
    setExpanded(digestId);
    try {
      const d = await api.getDigest(digestId);
      setExpandedDigest(d);
    } catch {
      setExpanded(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-3 w-16 bg-ink/10 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-2 w-24 bg-ink/10 mb-2" />
                <div className="h-5 w-2/3 bg-ink/10" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <PageShell>
        <p className="section-label mb-2">library</p>
        <h1 className="font-headline text-3xl italic ink-bleed-heavy mb-8">past editions</h1>

        {error ? (
          <div className="py-12">
            <p className="font-mono text-xs text-accent-red">-- {error}</p>
          </div>
        ) : digests.length === 0 ? (
          <div className="py-12">
            <p className="font-mono text-xs text-ink-muted mb-2">
              -- no past editions
            </p>
            <p className="font-body text-sm text-ink-muted">
              Your digests will appear here after generation.
            </p>
          </div>
        ) : (
          <div>
            {digests.map((d, idx) => {
              const isOpen = expanded === d.id;
              const dateStr = new Date(d.edition_date).toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric" }
              );

              return (
                <div key={d.id} className="mb-6">
                  <button
                    onClick={() => handleExpand(d.id)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-mono text-[11px] text-accent-gold">
                        no. {String(idx + 1).padStart(3, "0")}
                      </span>
                      <span className="font-mono text-[11px] text-ink-muted">
                        {d.essay_count} essays · {d.article_count} links
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-ink-muted mb-1">
                      {dateStr}
                    </p>
                    {d.headline && (
                      <h3 className="font-headline text-lg leading-snug group-hover:text-ink-light transition-colors italic ink-bleed">
                        {d.headline}
                      </h3>
                    )}
                  </button>

                  <div
                    className="transition-all duration-300 ease-in-out overflow-hidden"
                    style={{
                      maxHeight: isOpen ? "2000px" : "0",
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      {expandedDigest && (
                        <div className="mt-4 pl-4 border-l-2 border-rule-light">
                          {expandedDigest.essays.map((essay) => {
                            return (
                              <Link
                                key={essay.id}
                                href={`/essay/${essay.id}`}
                                className="block py-3 group/essay"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <TopicTag topic={essay.topic} />
                                  <span className="font-mono text-[11px] text-ink-muted">
                                    {essay.reading_time_minutes} min
                                  </span>
                                </div>
                                <h4 className="font-headline text-base leading-snug group-hover/essay:text-ink-light transition-colors">
                                  {essay.title}
                                </h4>
                                {essay.subtitle && (
                                  <p className="font-body text-xs text-ink-muted italic mt-0.5">
                                    {essay.subtitle}
                                  </p>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-b border-dashed border-rule-light mt-4" />
                </div>
              );
            })}
          </div>
        )}
    </PageShell>
  );
}
