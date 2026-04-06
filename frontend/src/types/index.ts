export interface Interest {
  id: string;
  topic: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  onboarding_complete: boolean;
  interests: Interest[];
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  body_markdown?: string;
  source_name: string;
  source_url: string;
  category?: string;
  published_at?: string;
  quality_score?: number;
  relevance_score?: number;
}

export interface ResearchSource {
  source_type: string;
  title: string;
  author?: string;
  url?: string;
  excerpt?: string;
}

export interface Essay {
  id: string;
  title: string;
  subtitle?: string;
  body_markdown: string;
  thesis?: string;
  topic: string;
  word_count: number;
  reading_time_minutes: number;
  length_tier?: string; // "quick_read" or "deep_dive"
  sources: ResearchSource[];
}

export interface DigestSummary {
  id: string;
  edition_date: string;
  status: string;
  headline?: string;
  big_question?: string;
  article_count: number;
  essay_count: number;
}

export interface Digest {
  id: string;
  edition_date: string;
  status: string;
  headline?: string;
  big_question?: string;
  articles: Article[];
  essays: Essay[];
}

export interface ReadingStats {
  total_essays_read: number;
  total_articles_read: number;
  current_streak: number;
  longest_streak: number;
  topics_explored: string[];
  total_reading_time_minutes: number;
  essays_this_week: number;
}

export interface SSEStatus {
  stage: string;
  progress?: number;
  message?: string;
}

export interface SearchResult {
  type: "essay" | "article";
  id: string;
  title: string;
  subtitle?: string;
  topic?: string;
  summary?: string;
  reading_time_minutes?: number;
  source_name?: string;
}
