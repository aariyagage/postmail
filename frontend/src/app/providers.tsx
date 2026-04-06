"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import { ThemeProvider } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BookmarkProvider>{children}</BookmarkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
