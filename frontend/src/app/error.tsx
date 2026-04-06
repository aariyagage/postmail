"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-paper">
      <div className="max-w-2xl mx-auto px-6 py-20">
        <p className="font-mono text-[11px] text-ink-muted mb-6">
          -- something broke
        </p>
        <h1 className="font-headline text-2xl mb-3">
          An error occurred
        </h1>
        <p className="font-mono text-xs text-ink-muted mb-6 max-w-md">
          {error.message || "Something unexpected happened."}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="font-mono text-[11px] lowercase border border-ink px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors"
          >
            try again
          </button>
          <Link
            href="/"
            className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink underline decoration-dashed underline-offset-2"
          >
            go home
          </Link>
        </div>
      </div>
    </main>
  );
}
