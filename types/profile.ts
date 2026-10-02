export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  region: string | null;
  avatar_url: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
  germany_since?: string | null;
  show_community_level?: boolean;
  show_germany_tenure?: boolean;
  show_reputation_stats?: boolean;
  reputation_xp?: number;
  activity_score?: number;
  knowledge_score?: number;
  communication_score?: number;
  helpful_score?: number;
}

export interface PublicProfile {
  id: string;
  display_name: string | null;
  region: string | null;
  avatar_url: string | null;
  bio?: string | null;
  created_at: string;
  germany_since?: string | null;
  show_community_level?: boolean;
  show_germany_tenure?: boolean;
  show_reputation_stats?: boolean;
  reputation_xp?: number;
  activity_score?: number;
  knowledge_score?: number;
  communication_score?: number;
  helpful_score?: number;
}

export interface ProfileUpdateInput {
  display_name?: string;
  region?: string;
  bio?: string;
  avatar_url?: string;
  germany_since?: string | null;
  show_community_level?: boolean;
  show_germany_tenure?: boolean;
  show_reputation_stats?: boolean;
}
