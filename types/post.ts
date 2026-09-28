export interface Post {
  id: number; // Verified from DB that posts.id is a numeric type (serial/bigint)
  title: string;
  content: string;
  category: string;
  region: string | null;
  author_id: string | null;
  author_name: string;
  author_avatar?: string | null;
  created_at: string;
  views: number;
  sub_category?: string | null;
  target_field?: string | null;
  city?: string | null;

  // Phase 3 fields:
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export interface Comment {
  id: string; // Verified from DB that comments.id is a UUID (string)
  post_id: number; // Verified from DB that comments.post_id is a number referencing posts.id
  parent_id?: string | null; // For one-level nested replies referencing comments.id (string)
  author_id: string;
  author_name: string;
  author_avatar?: string | null;
  content: string;
  created_at: string;
  replies?: Comment[]; // For rendering nested replies in UI
}

export interface PostLike {
  id: string;
  post_id: number;
  user_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  actor_name?: string;
  actor_avatar?: string;
  type: "COMMENT" | "REPLY" | "POST_LIKE";
  reference_id: string; // Reference to trigger item (e.g. comment_id, or post_id)
  post_id: number; // Target post ID for navigation
  is_read: boolean;
  created_at: string;
  post_title?: string;
}
