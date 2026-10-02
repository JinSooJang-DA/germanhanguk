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
  reputation_xp?: number | null;
  activity_score?: number | null;
  knowledge_score?: number | null;
  communication_score?: number | null;
  helpful_score?: number | null;
}

export interface PublicProfile {
  id: string;
  display_name: string | null;
  region: string | null;
  avatar_url: string | null;
  bio?: string | null;
  created_at: string;
  tenure_value?: number | null;
  tenure_unit?: string | null;
  show_community_level?: boolean;
  show_germany_tenure?: boolean;
  show_reputation_stats?: boolean;
  reputation_xp?: number | null;
  activity_score?: number | null;
  knowledge_score?: number | null;
  communication_score?: number | null;
  helpful_score?: number | null;
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
