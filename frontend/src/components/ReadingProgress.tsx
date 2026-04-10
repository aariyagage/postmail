"use client";

import { useEffect, useState } from "react";

interface ReadingProgressProps {
  color?: string;
}

export default function ReadingProgress({ color = "var(--color-ink)" }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min(100, (scrollTop / docHeight) * 100));
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-transparent">
      <div
        className="h-full transition-[width] duration-100"
        style={{ width: `${progress}%`, backgroundColor: color }}
      />
    </div>
  );
}
