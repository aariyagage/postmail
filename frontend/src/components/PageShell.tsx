import Masthead from "@/components/Masthead";

const MAX_WIDTH_MAP = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: "2xl" | "3xl" | "4xl" | "6xl";
}

export default function PageShell({ children, maxWidth = "2xl" }: PageShellProps) {
  return (
    <main className="min-h-screen bg-paper">
      <Masthead />
      <div className={`${MAX_WIDTH_MAP[maxWidth]} mx-auto px-6 py-8`}>
        {children}
      </div>
    </main>
  );
}
