"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import PageShell from "@/components/PageShell";
import TopicTag from "@/components/TopicTag";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { ReadingStats, User } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getUser().then((u) => setUser(u)),
      api
        .getReadingStats()
        .then((s) => setStats(s))
        .catch(() => {}),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12 animate-pulse">
          <div className="h-3 w-16 bg-ink/10 mb-8" />
          <div className="h-6 w-32 bg-ink/10 mb-4" />
          <div className="h-3 w-48 bg-ink/10" />
        </div>
      </main>
    );
  }

  return (
    <PageShell>
        <p className="section-label mb-2">profile</p>

        {/* Identity */}
        <div className="mb-10">
          <h2 className="font-headline text-3xl font-medium ink-bleed-heavy mb-1">{user?.name}</h2>
          <p className="font-mono text-[11px] text-ink-muted">{user?.email}</p>
        </div>

        {/* Topics with depth */}
        <div className="mb-10">
          <p className="section-label mb-3">your topics</p>
          <div className="space-y-2 mb-3">
            {user?.interests.map((interest) => {
              return (
                <div key={interest.id} className="flex items-center gap-2">
                  <TopicTag topic={interest.topic} />
                  {interest.description && (
                    <span className="font-mono text-[10px] text-ink-muted">
                      ({interest.description})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href="/"
            className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink underline decoration-dashed underline-offset-2"
          >
            edit topics on home
          </Link>
        </div>

        {/* Reading stats */}
        {stats && (
          <div className="mb-10">
            <p className="section-label mb-4">reading</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <span className={`font-headline text-3xl block leading-none ink-bleed ${stats.current_streak > 0 ? "text-accent-gold" : ""}`}>
                  {stats.current_streak}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  day streak
                </span>
              </div>
              <div>
                <span className="font-headline text-3xl block leading-none">
                  {stats.total_essays_read}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  essays read
                </span>
              </div>
              <div>
                <span className="font-headline text-3xl block leading-none">
                  {stats.essays_this_week}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  this week
                </span>
              </div>
              <div>
                <span className="font-headline text-3xl block leading-none">
                  {stats.total_reading_time_minutes}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  minutes read
                </span>
              </div>
              <div>
                <span className="font-headline text-3xl block leading-none">
                  {stats.topics_explored.length}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  topics explored
                </span>
              </div>
              <div>
                <span className="font-headline text-3xl block leading-none">
                  {stats.longest_streak}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  longest streak
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Topics explored list */}
        {stats && stats.topics_explored.length > 0 && (
          <div className="mb-10">
            <p className="section-label mb-3">topics you&apos;ve explored</p>
            <div className="flex flex-wrap gap-2">
              {stats.topics_explored.map((topic) => (
                <span
                  key={topic}
                  className="font-mono text-[11px] lowercase text-ink-muted"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border-b border-dashed border-rule-light mb-10" />

        {/* Danger zone */}
        <div>
          <p className="section-label mb-3">account</p>
          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink underline decoration-dashed underline-offset-2"
          >
            sign out
          </button>
        </div>
    </PageShell>
  );
}
