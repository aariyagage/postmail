"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-headline text-3xl mb-4">— something broke</h2>
          <p className="font-body text-lg text-ink-light mb-6">
            an unexpected error occurred. try refreshing the page.
          </p>
          <p className="font-mono text-[11px] text-ink-muted mb-6">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="bg-ink text-paper px-8 py-3 font-mono text-[11px] lowercase tracking-widest hover:bg-ink-light transition-colors"
          >
            reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
