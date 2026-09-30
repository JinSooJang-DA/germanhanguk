-- =============================================================================
-- Phase 6 follow-up: DB-clock source rediscovery touch
-- =============================================================================
-- Keeps last_seen_at authoritative to PostgreSQL rather than a worker clock.

CREATE OR REPLACE FUNCTION public.touch_article_source_last_seen(p_fingerprint text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_article_source_id uuid;
BEGIN
  UPDATE public.article_sources
  SET last_seen_at = clock_timestamp()
  WHERE fingerprint = p_fingerprint
  RETURNING id INTO v_article_source_id;

  RETURN v_article_source_id;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_article_source_last_seen(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_article_source_last_seen(text) FROM anon;
REVOKE ALL ON FUNCTION public.touch_article_source_last_seen(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.touch_article_source_last_seen(text) TO service_role;

COMMENT ON FUNCTION public.touch_article_source_last_seen(text) IS
  '서비스 역할 automation이 source 재발견 시 PostgreSQL 시계로 last_seen_at만 갱신';
