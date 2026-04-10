"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Masthead from "@/components/Masthead";
import InlineError from "@/components/InlineError";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const CURATED_TOPICS = [
  { topic: "Philosophy", description: "Ethics, metaphysics, existentialism" },
  { topic: "Cognitive Science", description: "How the mind works and why it fails" },
  { topic: "AI & Machine Learning", description: "Intelligence, artificial and otherwise" },
  { topic: "Economics", description: "Markets, incentives, behavioral economics" },
  { topic: "History", description: "Turning points, forgotten stories, patterns" },
  { topic: "Psychology", description: "Biases, habits, decision-making" },
  { topic: "Physics", description: "Quantum mechanics, cosmology, time" },
  { topic: "Literature", description: "Fiction, storytelling, the written word" },
  { topic: "Neuroscience", description: "Brains, consciousness, perception" },
  { topic: "Political Theory", description: "Power, governance, ideology" },
  { topic: "Sociology", description: "Culture, identity, social structures" },
  { topic: "Mathematics", description: "Logic, patterns, beautiful proofs" },
  { topic: "Biology & Evolution", description: "Life, adaptation, genetics" },
  { topic: "Art & Design", description: "Aesthetics, creativity, visual culture" },
  { topic: "Technology", description: "Software, hardware, the digital world" },
  { topic: "Linguistics", description: "Language, meaning, communication" },
  { topic: "Climate & Environment", description: "Earth systems, sustainability" },
  { topic: "Space & Astronomy", description: "Stars, planets, the universe" },
];

const MIN_TOPICS = 3;
const MAX_TOPICS = 7;

export default function OnboardingPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, signInWithGoogle, signUpWithEmail } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [topicDepths, setTopicDepths] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"auth" | "interests">("auth");
  const [confirmationSent, setConfirmationSent] = useState(false);

  // When user signs in, check if they already have a backend account
  useEffect(() => {
    if (!authUser) return;

    setName(authUser.user_metadata?.full_name || authUser.user_metadata?.name || "");
    setEmail(authUser.email || "");

    // Check if this user already completed onboarding
    api
      .getUser()
      .then((existingUser) => {
        // User already exists with interests — skip onboarding entirely
        if (existingUser.interests && existingUser.interests.length > 0) {
          router.push("/");
          return;
        }
        // User exists but no interests — show interests step
        setStep("interests");
      })
      .catch(() => {
        // No backend user yet — show interests step for new user
        setStep("interests");
      });
  }, [authUser, router]);

  async function handleGoogleSignIn() {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "google sign-in failed");
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !name) return;

    setAuthSubmitting(true);
    setError(null);

    try {
      const data = await signUpWithEmail(email, password);

      // If Supabase requires email confirmation
      if (data.user && !data.session) {
        setConfirmationSent(true);
        return;
      }

      // If auto-confirmed (e.g. Supabase email confirmations disabled), proceed
      if (data.session) {
        setStep("interests");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "sign up failed";
      setError(message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((t) => t !== topic);
      }
      if (prev.length >= MAX_TOPICS) return prev;
      return [...prev, topic];
    });
  }

  function addCustomTopic() {
    const trimmed = customTopic.trim();
    if (!trimmed || selectedTopics.includes(trimmed) || selectedTopics.length >= MAX_TOPICS) return;
    setSelectedTopics((prev) => [...prev, trimmed]);
    setCustomTopic("");
  }

  async function handleSubmit() {
    if (selectedTopics.length < MIN_TOPICS) return;
    setSubmitting(true);
    setError(null);

    const effectiveName = name || authUser?.user_metadata?.full_name || "";

    const interests = selectedTopics.map((topic) => ({
      topic,
      description: topicDepths[topic] || null,
    }));

    try {
      await api.createUser({
        name: effectiveName,
        interests,
      });

      // Auto-trigger digest generation so the user doesn't hit an empty home page
      try {
        await api.triggerDigest();
      } catch {
        // Non-critical — digest can be generated later
      }

      router.push("/pressroom");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "failed to create account"
      );
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

        {step === "auth" && !authUser && (
          <div className="relative">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 font-headline text-[12rem] italic opacity-[0.03] pointer-events-none select-none leading-none">
              P
            </span>
            <div className="text-center mb-10">
              <h1 className="font-headline text-5xl mb-4 font-medium ink-bleed-heavy">
                your morning read,<br />tailored to you
              </h1>
              <p className="font-body text-lg text-ink-light max-w-xl mx-auto">
                postmail curates daily essays on the topics you love — synthesized
                from books, papers, and lectures. like having a brilliant friend
                who reads everything and tells you the good parts.
              </p>
            </div>
            <div className="rule-thick mb-8" />

            {error && <InlineError message={error} />}

            {confirmationSent ? (
              <div className="max-w-md mx-auto text-center py-8">
                <h2 className="font-headline text-2xl mb-3">check your email</h2>
                <p className="font-body text-base text-ink-light mb-4">
                  we sent a confirmation link to <span className="font-bold text-ink">{email}</span>.
                  click the link to verify your account and continue.
                </p>
                <button
                  onClick={() => setConfirmationSent(false)}
                  className="font-mono text-xs lowercase text-ink-muted hover:text-ink underline"
                >
                  use a different email
                </button>
              </div>
            ) : (
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

                {/* Email/Password Sign-Up */}
                <form className="space-y-4" onSubmit={handleEmailSignUp}>
                  <div>
                    <label className="section-label block mb-2">
                      name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full border border-rule px-4 py-3 font-body text-lg bg-paper focus:border-ink"
                      placeholder="your name"
                    />
                  </div>
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
                      minLength={6}
                      className="w-full border border-rule px-4 py-3 font-body text-lg bg-paper focus:border-ink"
                      placeholder="at least 6 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full bg-ink text-paper px-6 py-3 font-mono text-[12px] lowercase hover:bg-ink-light transition-colors disabled:opacity-40"
                  >
                    {authSubmitting ? "creating account..." : "create account"}
                  </button>
                </form>

                <p className="text-center font-body text-sm text-ink-muted mt-6">
                  already have an account?{" "}
                  <a
                    href="/login"
                    className="text-ink underline underline-offset-2 hover:text-ink-light"
                  >
                    sign in
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {step === "interests" && (
          <>
            <div className="text-center mb-10">
              <h1 className="font-headline text-4xl mb-3 font-medium ink-bleed-heavy">
                what fascinates you?
              </h1>
              <p className="font-body text-lg text-ink-light">
                pick {MIN_TOPICS}-{MAX_TOPICS} topics. we&apos;ll write essays just for you.
              </p>
            </div>

            {error && <InlineError message={error} />}

            {authUser && (
              <div className="mb-8 p-3 bg-paper-warm border border-rule-light text-center">
                <p className="font-mono text-sm text-ink-muted">
                  signed in as <span className="text-ink font-bold">{authUser.email}</span>
                </p>
              </div>
            )}

            {/* Topic list — editorial table of contents */}
            <div className="max-w-2xl mx-auto mb-8">
              {CURATED_TOPICS.map(({ topic, description }) => {
                const isSelected = selectedTopics.includes(topic);
                const isDisabled = !isSelected && selectedTopics.length >= MAX_TOPICS;
                return (
                  <div key={topic}>
                    <button
                      onClick={() => toggleTopic(topic)}
                      disabled={isDisabled}
                      className={`w-full text-left py-4 flex items-baseline justify-between gap-4 transition-all ${
                        isSelected
                          ? "bg-paper-warm border-l-[3px] border-accent-red pl-4 -ml-4 pr-4"
                          : isDisabled
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-paper-warm/50"
                      }`}
                    >
                      <div>
                        <p className="font-headline text-lg font-medium ink-bleed">
                          {topic}
                        </p>
                        <p className="font-body text-xs text-ink-muted mt-0.5">
                          {description}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted shrink-0">
                        {isSelected ? (
                          <span className="text-accent-red">&#10003;</span>
                        ) : (
                          "add"
                        )}
                      </span>
                    </button>
                    {/* Inline depth selector */}
                    {isSelected && (
                      <div className="pl-4 -ml-4 pb-3 border-l-[3px] border-accent-red bg-paper-warm pr-4">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] text-ink-muted mr-2">depth:</span>
                          {[
                            { key: "beginner", label: "new to this" },
                            { key: "intermediate", label: "know the basics" },
                            { key: "advanced", label: "go deep" },
                          ].map(({ key, label }) => (
                            <button
                              key={key}
                              onClick={() => setTopicDepths((prev) => ({
                                ...prev,
                                [topic]: prev[topic] === key ? "" : key,
                              }))}
                              className={`font-mono text-[10px] lowercase px-2 py-0.5 border transition-all ${
                                topicDepths[topic] === key
                                  ? "border-ink bg-ink text-paper"
                                  : "border-rule-light text-ink-muted hover:border-ink"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="border-b border-dashed border-rule-light" />
                  </div>
                );
              })}
            </div>

            {/* Custom topic input */}
            <div className="max-w-2xl mx-auto mb-8">
              <p className="section-label mb-2">
                don&apos;t see your thing?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTopic())}
                  placeholder="add your own topic..."
                  className="flex-1 border border-rule-light px-4 py-2 font-body text-base bg-paper focus:border-ink"
                />
                <button
                  onClick={addCustomTopic}
                  disabled={!customTopic.trim() || selectedTopics.length >= MAX_TOPICS}
                  className="px-4 py-2 border border-rule font-mono text-xs lowercase hover:bg-paper-warm transition-colors disabled:opacity-50"
                >
                  add
                </button>
              </div>
            </div>

            {/* Selected topics summary + submit */}
            <div className="max-w-2xl mx-auto border-t border-rule pt-6">
              {selectedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedTopics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-ink text-paper font-mono text-xs lowercase"
                    >
                      {topic}
                      <button
                        onClick={() => toggleTopic(topic)}
                        className="ml-1 text-paper/60 hover:text-paper"
                        aria-label={`Remove ${topic}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="font-mono text-xs lowercase text-ink-muted">
                    {selectedTopics.length} of {MIN_TOPICS}-{MAX_TOPICS} selected
                  </p>
                  {selectedTopics.length > 0 && (
                    <div className="postage-stamp">
                      <span className="postage-stamp-value">{selectedTopics.length}</span>
                      <span className="postage-stamp-label">topics</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedTopics.length < MIN_TOPICS}
                  className="bg-ink text-paper px-6 py-3 font-mono text-[12px] lowercase hover:bg-ink-light transition-colors disabled:opacity-40"
                >
                  {submitting ? "setting up..." : "build my digest"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
