export interface ArticleSource {
  title: string;
  url: string;
  kind?: "article" | "image";
  photographer?: string;
  photographerUrl?: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  image_url: string | null;
  source_urls: ArticleSource[];
  status: "draft" | "published";
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  ai_generated: boolean;
  source_checked_at: string | null;
  review_status: "pending" | "approved" | "rejected";
}
