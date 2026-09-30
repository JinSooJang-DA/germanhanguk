-- ==============================================================================
-- Migration: Phase 6 - Article Source Reservation Foundation
-- Description:
--   1. 공식 source 후보의 deterministic fingerprint를 보관하는 private 테이블 생성
--   2. UNIQUE fingerprint를 통한 동시 실행 안전 reservation 기반 구성
--   3. automation source 처리 상태와 public articles lifecycle 분리
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1. automation source persistence 테이블
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint varchar(64) NOT NULL,
  source_provider varchar(100) NOT NULL,
  external_id text NULL,
  canonical_url text NOT NULL,
  source_title text NOT NULL,
  source_published_at timestamptz NULL,
  relevance_classification varchar(20) NOT NULL,
  processing_status varchar(20) NOT NULL DEFAULT 'reserved',
  article_id uuid NULL REFERENCES public.articles(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT article_sources_fingerprint_unique UNIQUE (fingerprint),
  CONSTRAINT article_sources_fingerprint_sha256_format
    CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT article_sources_source_provider_not_blank
    CHECK (length(btrim(source_provider)) > 0),
  CONSTRAINT article_sources_canonical_url_https
    CHECK (canonical_url LIKE 'https://%'),
  CONSTRAINT article_sources_relevance_classification_valid
    CHECK (relevance_classification IN ('relevant', 'uncertain')),
  CONSTRAINT article_sources_processing_status_valid
    CHECK (processing_status IN ('reserved', 'processing', 'processed', 'failed'))
);

COMMENT ON TABLE public.article_sources IS
  '자동화가 발견한 외부 기사 source의 중복 방지 및 처리 상태 추적 테이블';
COMMENT ON COLUMN public.article_sources.fingerprint IS
  'source_provider + external_id 또는 normalized canonical_url 기반 SHA-256 identity';
COMMENT ON COLUMN public.article_sources.processing_status IS
  'automation source 처리 상태이며 public.articles의 발행 lifecycle과 별개';
COMMENT ON COLUMN public.article_sources.article_id IS
  '향후 생성될 public.articles 행 연결용 nullable FK';

-- The UNIQUE constraint supplies the fingerprint lookup index. This index is
-- only for a future worker that selects pending reservations by status.
CREATE INDEX IF NOT EXISTS idx_article_sources_processing_status_created_at
  ON public.article_sources (processing_status, created_at);

-- ------------------------------------------------------------------------------
-- STEP 2. updated_at 자동 갱신
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_article_sources_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_article_sources_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_article_sources_updated_at ON public.article_sources;
CREATE TRIGGER trg_article_sources_updated_at
  BEFORE UPDATE ON public.article_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_article_sources_updated_at();

-- ------------------------------------------------------------------------------
-- STEP 3. private Data API surface
-- ------------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE public.article_sources FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.article_sources FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.article_sources FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.article_sources TO service_role;

ALTER TABLE public.article_sources ENABLE ROW LEVEL SECURITY;

-- No anon, authenticated, or admin-browser RLS policies are created. The
-- server-side service role is the only intended automation access boundary.
