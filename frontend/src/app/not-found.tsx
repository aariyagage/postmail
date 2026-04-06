import Link from "next/link";
import Masthead from "@/components/Masthead";

export default function NotFound() {
  return (
    <main className="min-h-screen">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="font-mono text-[11px] text-ink-muted tracking-widest mb-6">
          (error 404)
        </p>
        <h2 className="font-headline text-4xl mb-4">
          — page left intentionally blank
        </h2>
        <p className="font-body text-lg text-ink-light mb-8">
          nothing here. it may have wandered off, or never existed at all.
        </p>
        <div className="rule-thick mb-8 max-w-xs mx-auto" />
        <Link
          href="/"
          className="inline-block bg-ink text-paper px-8 py-3 font-mono text-[11px] lowercase tracking-widest hover:bg-ink-light transition-colors"
        >
          back to home
        </Link>
      </div>
    </main>
  );
}
