import { getTopicTint } from "@/lib/topicColors";

interface TopicTagProps {
  topic: string;
  size?: "sm" | "md";
}

export default function TopicTag({ topic, size = "md" }: TopicTagProps) {
  const tint = getTopicTint(topic);
  return (
    <span
      className={`font-mono lowercase ${
        size === "sm" ? "text-[10px] px-1 py-0.5" : "text-[11px] px-1.5 py-0.5"
      }`}
      style={{ backgroundColor: tint.bg, color: "var(--color-ink-light)" }}
    >
      {topic}
    </span>
  );
}
