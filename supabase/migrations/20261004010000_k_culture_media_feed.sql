-- Shared posts table preserves existing RLS, moderation, comments, likes and notifications.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_platform text;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_k_culture_media_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_k_culture_media_check CHECK (
  category <> 'k-culture' OR (
    (media_platform = 'youtube' AND media_url ~* '^https?://(www\\.)?(youtube\\.com|m\\.youtube\\.com|youtu\\.be)/') OR
    (media_platform = 'instagram' AND media_url ~* '^https?://(www\\.)?(instagram\\.com|instagr\\.am)/') OR
    (media_platform = 'tiktok' AND media_url ~* '^https?://(www\\.)?(tiktok\\.com|m\\.tiktok\\.com|vm\\.tiktok\\.com|vt\\.tiktok\\.com)/')
  )
);
CREATE INDEX IF NOT EXISTS idx_posts_k_culture_feed ON public.posts (sub_category, created_at DESC) WHERE category = 'k-culture';
COMMENT ON COLUMN public.posts.media_url IS 'Validated external URL; German Hanguk does not host the media.';
COMMENT ON COLUMN public.posts.media_platform IS 'Validated provider: youtube, instagram, or tiktok.';
