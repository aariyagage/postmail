import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Postmail — Your Intellectual Daily Digest",
  description:
    "AI-curated essays written just for you, drawn from books, papers, and lectures. Like having a brilliant friend who reads everything and tells you the good parts.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
