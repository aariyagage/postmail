import type { Metadata } from "next";

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${apiUrl}/api/articles/${params.id}`, {
      cache: "no-store",
      headers: { "X-Server-Fetch": "1" },
    });
    if (!res.ok) throw new Error("not found");
    const article = await res.json();

    return {
      title: `${article.title} — Postmail`,
      description: article.summary,
      openGraph: {
        title: article.title,
        description: article.summary,
        type: "article",
        siteName: "Postmail",
      },
      twitter: {
        card: "summary",
        title: article.title,
        description: article.summary,
      },
    };
  } catch {
    return {
      title: "Article — Postmail",
    };
  }
}

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
