"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface BookmarkEntry {
  id: string;
  content_type: string;
  content_id: string;
}

interface BookmarkContextValue {
  isBookmarked: (contentType: string, contentId: string) => boolean;
  toggleBookmark: (contentType: string, contentId: string) => Promise<void>;
  removeBookmark: (bookmarkId: string) => Promise<void>;
  getBookmarkId: (contentType: string, contentId: string) => string | null;
  bookmarks: BookmarkEntry[];
  loaded: boolean;
}

const BookmarkContext = createContext<BookmarkContextValue>({
  isBookmarked: () => false,
  toggleBookmark: async () => {},
  removeBookmark: async () => {},
  getBookmarkId: () => null,
  bookmarks: [],
  loaded: false,
});

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoaded(true);
      return;
    }
    api
      .getBookmarks()
      .then((data) => setBookmarks(data))
      .catch(() => {
        // Expected if user hasn't completed onboarding yet
      })
      .finally(() => setLoaded(true));
  }, [isAuthenticated, authLoading]);

  const isBookmarked = useCallback(
    (contentType: string, contentId: string) =>
      bookmarks.some(
        (b) => b.content_type === contentType && b.content_id === contentId
      ),
    [bookmarks]
  );

  const getBookmarkId = useCallback(
    (contentType: string, contentId: string) => {
      const b = bookmarks.find(
        (b) => b.content_type === contentType && b.content_id === contentId
      );
      return b?.id ?? null;
    },
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (contentType: string, contentId: string) => {
      const existing = bookmarks.find(
        (b) => b.content_type === contentType && b.content_id === contentId
      );

      if (existing) {
        await api.deleteBookmark(existing.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
      } else {
        const res = await api.createBookmark(contentType, contentId);
        if (res.id) {
          setBookmarks((prev) => [
            { id: res.id!, content_type: contentType, content_id: contentId },
            ...prev,
          ]);
        }
      }
    },
    [bookmarks]
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      await api.deleteBookmark(bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    },
    []
  );

  return (
    <BookmarkContext.Provider
      value={{ isBookmarked, toggleBookmark, removeBookmark, getBookmarkId, bookmarks, loaded }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  return useContext(BookmarkContext);
}
