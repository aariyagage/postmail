import type { Metadata } from "next";
import { Inter, IM_Fell_DW_Pica, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const imFell = IM_Fell_DW_Pica({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});


export const metadata: Metadata = {
  title: "Postmail — Your Intellectual Daily Digest",
  description:
    "A personalized daily digest of curated essays and thought-starters, drawn from books, papers, and lectures.",
  openGraph: {
    title: "Postmail — Your Intellectual Daily Digest",
    description:
      "A personalized daily digest of curated essays and thought-starters.",
    type: "website",
    siteName: "Postmail",
  },
  twitter: {
    card: "summary",
    title: "Postmail — Your Intellectual Daily Digest",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${imFell.variable} ${sourceSerif.variable} ${inter.variable} ${mono.variable}`}
    >
      <body className="bg-paper text-ink font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
