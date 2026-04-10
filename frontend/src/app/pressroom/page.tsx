"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import { useSSE } from "@/hooks/useSSE";
import { api } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  idle: "preparing your digest...",
  starting: "initializing...",
  fetcher: "finding interesting stories",
  extractor: "reading and summarizing",
  quality_filter: "evaluating depth",
  relevance_matcher: "matching to your interests",
  composer_dispatch: "curating links",
  research_agent: "researching essay topics",
  composer_essays: "writing your essays",
  digest_assembler: "assembling everything",
  complete: "your digest is ready",
  failed: "something went wrong",
};

const STAGE_ORDER = [
  "idle", "starting", "fetcher", "extractor", "quality_filter",
  "relevance_matcher", "composer_dispatch", "research_agent", "composer_essays",
  "digest_assembler", "complete",
];

export default function PressroomPage() {
  const router = useRouter();
  const { status, connect } = useSSE();
  const [pollComplete, setPollComplete] = useState(false);
  const [completedStages, setCompletedStages] = useState<string[]>([]);

  useEffect(() => {
    const disconnect = connect();
    return disconnect;
  }, [connect]);

  // track completed stages as they progress
  useEffect(() => {
    const currentIndex = STAGE_ORDER.indexOf(status.stage);
    if (currentIndex > 0) {
      const done = STAGE_ORDER.slice(0, currentIndex).filter(
        (s) => s !== "idle"
      );
      setCompletedStages(done);
    }
  }, [status.stage]);

  const checkDigestStatus = useCallback(async () => {
    try {
      const summaries = await api.listDigests();
      const today = new Date().toISOString().split("T")[0];
      const todayDigests = summaries.filter((d) => d.edition_date === today);
      const hasBuilding = todayDigests.some((d) => d.status === "pending" || d.status === "building");
      const complete = todayDigests.find((d) => d.status === "complete");
      // only declare done if there's a complete digest and nothing still building
      if (complete && !hasBuilding) {
        setPollComplete(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // delay first poll to let the backend create the digest record
    const initialTimeout = setTimeout(checkDigestStatus, 5000);
    const interval = setInterval(checkDigestStatus, 10000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkDigestStatus]);

  const isComplete = status.stage === "complete" || pollComplete;
  const isFailed = status.stage === "failed";

  useEffect(() => {
    if (!isComplete) return;
    const timeout = setTimeout(() => {
      router.push("/");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [isComplete, router]);

  const stageLabel = pollComplete && status.stage === "idle"
    ? STAGE_LABELS.complete
    : STAGE_LABELS[status.stage] || status.stage;

  // blend stage index with within-stage progress for smooth bar
  const stageIndex = STAGE_ORDER.indexOf(status.stage);
  const totalStages = STAGE_ORDER.length - 1;
  const withinStageProgress = status.progress ?? 0;
  const stageProgress = stageIndex >= 0
    ? Math.round(((stageIndex + withinStageProgress / 100) / totalStages) * 100)
    : (withinStageProgress || 0);
  const displayProgress = pollComplete ? 100 : Math.min(stageProgress, 99);

  // pick a flavor line deterministically from the day to avoid hydration mismatch
  const flavorText = useMemo(() => {
    const lines = [
      "the presses are running hot",
      "ink is drying on the page",
      "editors are arguing over headlines",
      "typesetting in progress",
      "the newsroom never sleeps",
      "somewhere, a printer hums",
      "fresh off the wire",
      "stop the presses — actually, don't",
    ];
    const dayIndex = Math.floor(Date.now() / 86400000) % lines.length;
    return lines[dayIndex];
  }, []);

  return (
    <main className="min-h-screen bg-paper dot-grid">
      <Masthead />

      <div className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        {/* header block */}
        <div className="mb-12">
          <p className="section-label mb-3">pressroom</p>

          <h2 className="font-headline text-3xl md:text-4xl text-ink leading-tight mb-3">
            {isComplete
              ? "edition complete."
              : isFailed
                ? "press jam."
                : "building your edition..."}
          </h2>
          <p className="font-mono text-[11px] text-ink-muted italic">
            {isComplete
              ? "redirecting to your digest..."
              : `— ${flavorText}`}
          </p>
        </div>

        {/* progress rule — pulsing thin line */}
        <div className="mb-10">
          <div className="w-full h-[2px] bg-rule-light relative overflow-hidden">
            <div
              className="bg-ink h-full transition-all duration-700 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
            {!isComplete && !isFailed && (
              <div
                className="absolute top-0 h-full w-8 pressroom-shimmer"
                style={{ left: `${Math.max(displayProgress - 4, 0)}%` }}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-mono text-[10px] text-ink-muted">
              {status.message || "working..."}
            </p>
            {!isComplete && !isFailed && (
              <p className="font-mono text-[10px] text-ink-muted">
                {displayProgress}%
              </p>
            )}
          </div>
        </div>

        {/* stage log — the heart of the redesign */}
        <div className="mb-12 ruled-lines py-2">
          {/* completed stages */}
          {completedStages.map((stage) => (
            <div key={stage} className="flex items-baseline gap-2 py-1">
              <span className="font-mono text-[11px] text-ink-muted/50 select-none shrink-0">
                —
              </span>
              <span className="font-mono text-[11px] text-ink-muted/50 line-through decoration-ink-muted/30">
                {STAGE_LABELS[stage] || stage}
              </span>
              <span className="font-mono text-[9px] text-ink-muted/40 ml-auto shrink-0">
                done
              </span>
            </div>
          ))}

          {/* current stage */}
          {!isComplete && !isFailed && (
            <div className="flex items-baseline gap-2 py-1">
              <span className="font-mono text-[11px] text-ink select-none shrink-0">
                →
              </span>
              <span className="font-mono text-[11px] text-ink font-bold">
                {stageLabel}
              </span>
              <span className="pressroom-cursor font-mono text-[11px] text-ink">
                ▌
              </span>
            </div>
          )}

          {/* complete state */}
          {isComplete && (
            <div className="flex items-baseline gap-2 py-1">
              <span className="font-mono text-[11px] text-ink select-none shrink-0">
                ✦
              </span>
              <span className="font-mono text-[11px] text-ink font-bold">
                {STAGE_LABELS.complete}
              </span>
            </div>
          )}

          {/* failed state */}
          {isFailed && (
            <div className="flex items-baseline gap-2 py-1">
              <span className="font-mono text-[11px] text-accent-red select-none shrink-0">
                ✕
              </span>
              <span className="font-mono text-[11px] text-accent-red">
                {status.message || "digest generation failed."}
              </span>
            </div>
          )}
        </div>

        {/* footer actions */}
        <div className="rule-hairline mb-8" />

        {isComplete && (
          <Link
            href="/"
            className="inline-block font-mono text-[11px] lowercase border border-ink px-5 py-2 hover:bg-ink hover:text-paper transition-colors"
          >
            → read your digest
          </Link>
        )}

        {isFailed && (
          <div>
            <p className="font-mono text-[10px] text-ink-muted mb-4">
              something broke in the pressroom. try again or come back later.
            </p>
            <Link
              href="/"
              className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink underline decoration-dashed underline-offset-4"
            >
              ← back to home
            </Link>
          </div>
        )}

        {!isComplete && !isFailed && (
          <p className="font-mono text-[10px] text-ink-muted/60 italic">
            your personalized essays are being written. usually takes 1–2 minutes.
          </p>
        )}
      </div>
    </main>
  );
}
