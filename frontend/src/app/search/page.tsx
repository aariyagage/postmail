"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import TopicTag from "@/components/TopicTag";
import { api } from "@/lib/api";
import type { SearchResult } from "@/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const data = (await api.search(query.trim())) as SearchResult[];
      setResults(data);
    } catch {
      setResults([]);
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <PageShell>
        <p className="section-label mb-2">search</p>
        <h1 className="font-headline text-3xl italic ink-bleed-heavy mb-6">search</h1>

        <div className="flex items-center gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="essays about free will, consciousness, game theory..."
            className="flex-1 border-b-2 border-rule-light px-0 py-2 font-mono text-base bg-transparent focus:border-ink placeholder:text-ink-muted"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            {loading ? "searching..." : "search"}
          </button>
        </div>

        {loading && (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-2 w-16 bg-ink/10 mb-2" />
                <div className="h-5 w-3/4 bg-ink/10" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="font-mono text-xs text-accent-red">
            -- {error}
          </p>
        )}

        {!loading && searched && !error && results.length === 0 && (
          <p className="font-mono text-xs text-ink-muted">
            -- no results for &ldquo;{query}&rdquo;
          </p>
        )}

        {!loading && results.length > 0 && (
          <div>
            <p className="font-mono text-[11px] text-ink-muted mb-6">
              {results.length} results
            </p>
            {results.map((r) => {
              const href =
                r.type === "essay"
                  ? `/essay/${r.id}`
                  : `/article/${r.id}`;

              return (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={href}
                  className="block py-4 group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[11px] text-ink-muted">
                      {r.type}
                    </span>
                    {r.topic && <TopicTag topic={r.topic} />}
                    {r.reading_time_minutes && (
                      <span className="font-mono text-[11px] text-ink-muted">
                        {r.reading_time_minutes} min
                      </span>
                    )}
                    {r.source_name && (
                      <span className="font-mono text-[11px] text-ink-muted">
                        via {r.source_name}
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline text-base leading-snug group-hover:text-ink-light transition-colors italic ink-bleed">
                    {r.title}
                  </h3>
                  {r.subtitle && (
                    <p className="font-body text-xs text-ink-muted italic mt-0.5">
                      {r.subtitle}
                    </p>
                  )}
                  {r.summary && (
                    <p className="font-body text-xs text-ink-muted mt-0.5 line-clamp-2">
                      {r.summary}
                    </p>
                  )}
                  <div className="border-b border-dashed border-rule-light mt-4" />
                </Link>
              );
            })}
          </div>
        )}

        {!searched && (
          <p className="font-mono text-xs text-ink-muted">
            -- semantic search across all your essays and articles
          </p>
        )}
    </PageShell>
  );
}
