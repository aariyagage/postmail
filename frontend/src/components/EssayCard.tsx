import Link from "next/link";
import BookmarkButton from "./BookmarkButton";
import TopicTag from "./TopicTag";
import { getTopicTint } from "@/lib/topicColors";

interface EssayCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  topic: string;
  readingTime: number;
  lengthTier?: string;
  href: string;
  variant?: "default" | "tinted" | "bordered";
}

export default function EssayCard({
  id,
  title,
  subtitle,
  topic,
  readingTime,
  lengthTier,
  href,
  variant = "default",
}: EssayCardProps) {
  const isQuickRead = lengthTier === "quick_read";
  const tint = getTopicTint(topic);

  const wrapperClass =
    variant === "tinted"
      ? "py-5 px-5 group -mx-5"
      : variant === "bordered"
        ? "py-5 pl-4 group border-l-2"
        : "py-5 group";

  return (
    <article
      className={wrapperClass}
      style={
        variant === "tinted"
          ? { backgroundColor: tint.bg }
          : variant === "bordered"
            ? { borderColor: tint.border }
            : undefined
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <TopicTag topic={topic} />
        <span className="text-ink-muted text-[11px]">&#183;</span>
        <span className="font-mono text-[11px] text-ink-muted">
          {readingTime} min
        </span>
        {isQuickRead && (
          <>
            <span className="text-ink-muted text-[11px]">&#183;</span>
            <span className="font-mono text-[11px] text-ink-muted italic">
              quick read
            </span>
          </>
        )}
      </div>
      <Link href={href} className="block">
        <h2
          className={`font-headline leading-snug mb-1.5 group-hover:text-ink-light transition-colors italic ink-bleed ${
            isQuickRead ? "text-lg" : "text-xl"
          }`}
        >
          {title}
        </h2>
      </Link>
      {subtitle && (
        <p className="font-body text-sm text-ink-muted italic mb-2 line-clamp-2">
          {subtitle}
        </p>
      )}
      {id && (
        <div className="flex items-center gap-2 mt-2">
          <BookmarkButton contentType="essay" contentId={id} />
        </div>
      )}
      {variant === "default" && (
        <div className="border-b border-dashed border-rule-light mt-5" />
      )}
      {variant === "tinted" && <div className="mt-4" />}
      {variant === "bordered" && (
        <div className="border-b border-dashed border-rule-light mt-5 -ml-4" />
      )}
    </article>
  );
}
