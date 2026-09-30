-- ==============================================================================
-- Migration: Phase 5 - 기사 및 소식 시스템 (Phase 5 Articles)
-- Description:
--   1. public.articles 테이블 생성 (슬러그 고유화, 상태 관리, 출처 보관, 검증일 관리, 피처드 지정)
--   2. 정렬 및 필터 검색 성능 향상용 다중 인덱스 생성
--   3. RLS 정책 수립: 일반 사용자/익명은 published 기사만 읽기 가능, 관리자는 draft 포함 전체 기사 관리 가능
--   4. Data API table privilege 및 updated_at 자동 갱신 트리거 구성
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1. articles 테이블 생성 (공식 기사 및 소식 테이블)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(255) NOT NULL,
  title varchar(255) NOT NULL,
  summary text NULL,
  content text NOT NULL, -- 기사 본문
  category varchar(100) NOT NULL, -- '교통', '생활', '정책' 등
  image_url text NULL,
  source_urls jsonb NOT NULL DEFAULT '[]'::jsonb, -- 출처 링크 리스트
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- AI 자동화 메타데이터 수립
  ai_generated boolean NOT NULL DEFAULT false,
  source_checked_at timestamptz NULL,
  review_status varchar(50) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),

  -- 제약조건
  CONSTRAINT unique_article_slug UNIQUE (slug),
  CONSTRAINT articles_published_at_required_when_published
    CHECK (status != 'published' OR published_at IS NOT NULL),
  CONSTRAINT articles_review_approved_when_published
    CHECK (status != 'published' OR review_status = 'approved')
);

COMMENT ON TABLE public.articles IS 'GermanHanguk 기사 및 최신 소식 테이블';
COMMENT ON COLUMN public.articles.slug IS 'SEO 친화적 고유 URL 식별자 (예: deutschland-ticket-updates)';
COMMENT ON COLUMN public.articles.status IS '기사 게시 상태 (draft: 초안, published: 게시됨)';
COMMENT ON COLUMN public.articles.is_featured IS '메인 Hero에 강조 게재할 기사 여부';
COMMENT ON COLUMN public.articles.source_urls IS '출처 URL 및 타이틀 리스트 JSONB (예: [{"title": "ADAC", "url": "https://..."}])';

-- ------------------------------------------------------------------------------
-- STEP 2. 기사 성능 인덱스 수립
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_articles_status_featured_published ON public.articles (status, is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles (published_at DESC);

-- ------------------------------------------------------------------------------
-- STEP 3. updated_at 자동 갱신 트리거
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_articles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_articles_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_articles_updated_at ON public.articles;
CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_articles_updated_at();

-- ------------------------------------------------------------------------------
-- STEP 4. Data API table privileges 및 RLS 설정
-- ------------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE public.articles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.articles FROM authenticated;
GRANT SELECT ON TABLE public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.articles TO authenticated;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- [조회 정책 1: 일반 및 익명 사용자] - 오직 status = 'published' 상태의 기사만 조회 가능
DROP POLICY IF EXISTS "articles_public_select_policy" ON public.articles;
CREATE POLICY "articles_public_select_policy"
  ON public.articles
  FOR SELECT
  TO public
  USING ( status = 'published' );

-- [조회 정책 2: 관리자] - 관리자만 draft를 포함한 모든 기사 조회 가능
DROP POLICY IF EXISTS "articles_admin_select_policy" ON public.articles;
CREATE POLICY "articles_admin_select_policy"
  ON public.articles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- [쓰기 정책: INSERT] - 오직 profiles.role = 'admin'인 사용자만 삽입 허용
DROP POLICY IF EXISTS "articles_admin_insert_policy" ON public.articles;
CREATE POLICY "articles_admin_insert_policy"
  ON public.articles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- [수정 정책: UPDATE] - 오직 profiles.role = 'admin'인 사용자만 수정 허용
DROP POLICY IF EXISTS "articles_admin_update_policy" ON public.articles;
CREATE POLICY "articles_admin_update_policy"
  ON public.articles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- [삭제 정책: DELETE] - 오직 profiles.role = 'admin'인 사용자만 삭제 허용
DROP POLICY IF EXISTS "articles_admin_delete_policy" ON public.articles;
CREATE POLICY "articles_admin_delete_policy"
  ON public.articles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
