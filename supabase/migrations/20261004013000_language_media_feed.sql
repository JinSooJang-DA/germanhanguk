-- Language media uses the same safe external-media columns and existing post RLS/moderation.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_k_culture_media_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_external_media_check CHECK (
  category NOT IN ('k-culture','language-media') OR (
    (media_platform = 'youtube' AND media_url ~* '^https?://(www\\.)?(youtube\\.com|m\\.youtube\\.com|youtu\\.be)/') OR
    (media_platform = 'instagram' AND media_url ~* '^https?://(www\\.)?(instagram\\.com|instagr\\.am)/') OR
    (media_platform = 'tiktok' AND media_url ~* '^https?://(www\\.)?(tiktok\\.com|m\\.tiktok\\.com|vm\\.tiktok\\.com|vt\\.tiktok\\.com)/')
  )
);
CREATE INDEX IF NOT EXISTS idx_posts_language_media_feed ON public.posts (sub_category, created_at DESC) WHERE category='language-media';
