"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import { BookmarkProvider } from "@/contexts/BookmarkContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <BookmarkProvider>{children}</BookmarkProvider>
    </ErrorBoundary>
  );
}
