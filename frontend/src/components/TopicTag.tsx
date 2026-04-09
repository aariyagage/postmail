import { getTopicTint } from "@/lib/topicColors";

interface TopicTagProps {
  topic: string;
  size?: "sm" | "md";
}

export default function TopicTag({ topic, size = "md" }: TopicTagProps) {
  const tint = getTopicTint(topic);
  return (
    <span
      className={`font-mono lowercase transition-all duration-200 hover:scale-105 ${
        size === "sm" ? "text-[10px] px-1 py-0.5" : "text-[11px] px-1.5 py-0.5"
      }`}
      style={{ backgroundColor: tint.bg, color: "#4a4a4a" }}
    >
      {topic}
    </span>
  );
}
