import type { Metadata } from "next";

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Server-side fetch: use internal API URL (not NEXT_PUBLIC_ which is for browser)
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${apiUrl}/api/essays/${params.id}`, {
      cache: "no-store",
      headers: { "X-Server-Fetch": "1" },
    });
    if (!res.ok) throw new Error("not found");
    const essay = await res.json();

    return {
      title: `${essay.title} — Postmail`,
      description: essay.subtitle || essay.thesis || `An essay about ${essay.topic}`,
      openGraph: {
        title: essay.title,
        description: essay.subtitle || essay.thesis || `An essay about ${essay.topic}`,
        type: "article",
        siteName: "Postmail",
      },
      twitter: {
        card: "summary",
        title: essay.title,
        description: essay.subtitle || essay.thesis,
      },
    };
  } catch {
    return {
      title: "Essay — Postmail",
    };
  }
}

export default function EssayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
