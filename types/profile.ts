export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  region: string | null;
  avatar_url: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PublicProfile {
  id: string;
  display_name: string | null;
  region: string | null;
  avatar_url: string | null;
  bio?: string | null;
  created_at: string;
}

export interface ProfileUpdateInput {
  display_name?: string;
  region?: string;
  bio?: string;
  avatar_url?: string;
}
