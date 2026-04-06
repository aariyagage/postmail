"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Masthead() {
  const { isAuthenticated, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const today = mounted
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const dayOfYear = mounted
    ? Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
    : 0;

  function navClass(href: string) {
    const active = pathname === href;
    return `font-mono text-[11px] lowercase transition-colors ${
      active ? "text-ink" : "text-ink-muted hover:text-ink"
    }`;
  }

  return (
    <header className="mb-4">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-5">
        {/* Airmail stripe at top */}
        <div className="airmail-border mb-6">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-5">
              <Link href="/">
                <h1 className="font-headline text-5xl tracking-tight italic ink-bleed-heavy">
                  Postmail
                </h1>
              </Link>
              {mounted && (
                <div className="postage-stamp">
                  <span className="postage-stamp-value">{String(dayOfYear).padStart(3, "0")}</span>
                  <span className="postage-stamp-label">edition</span>
                </div>
              )}
            </div>
            <nav className="flex gap-5 items-baseline flex-wrap">
              <Link href="/" className={navClass("/")}>
                home
              </Link>
              <Link href="/library" className={navClass("/library")}>
                library
              </Link>
              <Link href="/search" className={navClass("/search")}>
                search
              </Link>
              <Link href="/saved" className={navClass("/saved")}>
                saved
              </Link>
              <Link href="/profile" className={navClass("/profile")}>
                profile
              </Link>
              {mounted && isAuthenticated && (
                <button
                  onClick={() => signOut()}
                  className="font-mono text-[11px] lowercase transition-colors text-ink-muted hover:text-ink"
                >
                  sign out
                </button>
              )}
            </nav>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] text-ink-muted">{today}</p>
          <div className="flex-1 mx-4 border-b border-dashed border-rule-light" />
          <p className="font-mono text-[11px] text-ink-muted italic">your daily digest</p>
        </div>
      </div>
    </header>
  );
}
