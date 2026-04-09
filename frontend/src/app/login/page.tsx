"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Masthead from "@/components/Masthead";
import InlineError from "@/components/InlineError";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, check if onboarded and redirect
  useEffect(() => {
    if (!authUser) return;

    api
      .getUser()
      .then(() => {
        router.push("/");
      })
      .catch((err) => {
        // Only redirect to onboarding if user truly doesn't exist (404)
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("404") || msg.includes("not found") || msg.includes("onboarding")) {
          router.push("/onboarding");
        }
        // For other errors (network, 500, etc.) stay on login page — don't re-onboard
      });
  }, [authUser, router]);

  async function handleGoogleSignIn() {
    try {
      setError(null);
      await signInWithGoogle("/");  // Returning user — go to home, not onboarding
    } catch (err) {
      setError(err instanceof Error ? err.message : "google sign-in failed");
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    setError(null);

    try {
      await signInWithEmail(email, password);
      // The useEffect above will handle redirect once authUser updates
    } catch (err) {
      const message = err instanceof Error ? err.message : "sign in failed";
      if (message.includes("Invalid login credentials")) {
        setError("invalid email or password. please try again.");
      } else if (message.includes("Email not confirmed")) {
        setError("please check your email and confirm your account before signing in.");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-paper">
        <Masthead />
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <p className="font-body text-lg text-ink-muted">loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="font-headline text-5xl mb-4 italic ink-bleed-heavy">
            welcome back
          </h1>
          <p className="font-body text-lg text-ink-light max-w-xl mx-auto">
            sign in to continue reading your daily digest.
          </p>
        </div>
        <div className="rule-thick mb-8" />

        {error && <InlineError message={error} />}

        <div className="max-w-md mx-auto">
          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-rule px-6 py-3 font-mono text-sm lowercase hover:bg-paper-warm transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            continue with google
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-rule-light" />
            <span className="font-mono text-xs lowercase text-ink-muted">or</span>
            <div className="flex-1 h-px bg-rule-light" />
          </div>

          {/* Email/Password Sign-In */}
          <form className="space-y-4" onSubmit={handleEmailSignIn}>
            <div>
              <label className="section-label block mb-2">
                email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-rule px-4 py-3 font-body text-lg bg-paper focus:border-ink"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="section-label block mb-2">
                password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-rule px-4 py-3 font-body text-lg bg-paper focus:border-ink"
                placeholder="your password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-paper px-6 py-3 font-mono text-[12px] lowercase hover:bg-ink-light transition-colors disabled:opacity-40"
            >
              {submitting ? "signing in..." : "sign in"}
            </button>
          </form>

          <p className="text-center font-body text-sm text-ink-muted mt-6">
            don&apos;t have an account?{" "}
            <a
              href="/onboarding"
              className="text-ink underline underline-offset-2 hover:text-ink-light"
            >
              sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
