import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTopicTint } from "@/lib/topicColors";

interface EssayReaderProps {
  title: string;
  subtitle?: string;
  topic: string;
  bodyMarkdown: string;
  readingTime: number;
  hideHeader?: boolean;
}

export default function EssayReader({
  title,
  subtitle,
  topic,
  bodyMarkdown,
  readingTime,
  hideHeader,
}: EssayReaderProps) {
  const cleanBody = bodyMarkdown
    .replace(/PULL_QUOTE:\s*["']?(.+?)["']?\s*$/gm, "> $1")
    .replace(/\n{3,}/g, "\n\n");

  const tint = getTopicTint(topic);

  if (hideHeader) {
    return (
      <div style={{ "--pull-quote-color": tint.border } as React.CSSProperties}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanBody}</ReactMarkdown>
      </div>
    );
  }

  return (
    <article className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="font-mono text-[11px] lowercase px-1.5 py-0.5"
          style={{ backgroundColor: tint.bg, color: "#4a4a4a" }}
        >
          {topic}
        </span>
        <span className="text-rule-light">&#183;</span>
        <span className="font-mono text-[11px] text-ink-muted">
          {readingTime} min
        </span>
      </div>
      <h1 className="font-headline text-3xl leading-snug mb-3 text-balance">
        {title}
      </h1>
      {subtitle && (
        <p className="font-body text-sm text-ink-muted italic mb-4 max-w-md">
          {subtitle}
        </p>
      )}
      <div className="w-12 mb-8" style={{ borderBottom: `2px solid ${tint.border}` }} />
      <div
        className="font-body text-[15px] leading-[1.8] drop-cap prose prose-base max-w-none prose-headings:font-headline prose-headings:text-ink prose-a:text-ink prose-a:underline prose-a:decoration-dashed prose-a:underline-offset-2 prose-blockquote:pull-quote prose-strong:text-ink prose-p:mb-4"
        style={{ "--pull-quote-color": tint.border } as React.CSSProperties}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {cleanBody}
        </ReactMarkdown>
      </div>
    </article>
  );
}
