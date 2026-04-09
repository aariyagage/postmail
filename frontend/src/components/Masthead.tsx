"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Masthead() {
  const { isAuthenticated, signOut, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
                <h1 className="font-headline text-5xl md:text-6xl tracking-tight italic ink-bleed-heavy">
                  Postmail
                </h1>
              </Link>
              {mounted && (
                <div className="postage-stamp transition-transform duration-300 hover:rotate-6 cursor-default">
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
              {mounted && isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="w-7 h-7 flex items-center justify-center border border-rule-light text-[11px] font-mono lowercase text-ink-muted hover:text-ink hover:border-ink transition-all duration-200 hover:scale-110"
                    aria-label="Profile menu"
                  >
                    {user?.email?.[0]?.toUpperCase() || "?"}
                  </button>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 z-50 bg-paper border border-rule-light py-1 min-w-[120px]">
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 font-mono text-[11px] lowercase text-ink-muted hover:text-ink hover:bg-paper-warm transition-colors"
                        >
                          profile
                        </Link>
                        <button
                          onClick={() => { signOut(); setProfileOpen(false); }}
                          className="block w-full text-left px-4 py-2 font-mono text-[11px] lowercase text-ink-muted hover:text-ink hover:bg-paper-warm transition-colors"
                        >
                          sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
