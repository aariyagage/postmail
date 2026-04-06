"use client";

import { useBookmarks } from "@/contexts/BookmarkContext";

interface BookmarkButtonProps {
  contentType: "essay" | "article";
  contentId: string;
  size?: number;
}

export default function BookmarkButton({ contentType, contentId, size = 14 }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const saved = isBookmarked(contentType, contentId);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleBookmark(contentType, contentId);
    } catch (err) {
      console.error("Bookmark toggle failed:", err);
    }
  }

  return (
    <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
      <button
        onClick={handleClick}
        className="font-mono text-[11px] lowercase text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
        aria-label={saved ? "remove bookmark" : "save"}
        title={saved ? "remove bookmark" : "save for later"}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={saved ? "0" : "1.5"} className={saved ? "text-ink" : ""}>
          <path d="M5 2h14a1 1 0 0 1 1 1v19.143a.5.5 0 0 1-.766.424L12 18.03l-7.234 4.536A.5.5 0 0 1 4 22.143V3a1 1 0 0 1 1-1z" />
        </svg>
        {saved ? "saved" : "save"}
      </button>
    </div>
  );
}
