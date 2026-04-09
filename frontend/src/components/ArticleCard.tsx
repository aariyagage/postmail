import Link from "next/link";
import BookmarkButton from "./BookmarkButton";
import TopicTag from "./TopicTag";

interface ArticleCardProps {
  id?: string;
  title: string;
  summary: string;
  source: string;
  category?: string;
  href: string;
  variant?: "sm" | "lg";
}

export default function ArticleCard({
  id,
  title,
  summary,
  source,
  category,
  href,
  variant = "lg",
}: ArticleCardProps) {
  return (
    <article className="py-4 group transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-paper-warm/40">
      <div className="flex items-center gap-2 mb-1.5">
        {category && <TopicTag topic={category} />}
        <span className="font-mono text-[11px] text-ink-muted">
          via {source}
        </span>
      </div>
      <Link href={href}>
        <h3
          className={
            variant === "sm"
              ? "font-body text-sm leading-snug mb-1 group-hover:text-ink-light transition-colors"
              : "font-headline text-lg leading-snug mb-1.5 group-hover:text-ink-light transition-colors"
          }
        >
          {title}
        </h3>
      </Link>
      <p
        className={
          variant === "sm"
            ? "font-body text-xs text-ink-muted leading-relaxed mb-2 line-clamp-2"
            : "font-body text-sm text-ink-muted leading-relaxed mb-2 line-clamp-2"
        }
      >
        {summary}
      </p>
      {id && <BookmarkButton contentType="article" contentId={id} />}
      <div className="border-b border-dashed border-rule-light mt-4" />
    </article>
  );
}
