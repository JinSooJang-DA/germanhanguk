-- ==============================================================================
-- Migration: Phase 4 - 생활정보 에디토리얼 가이드 시스템 (Phase 4 Editorial Guides)
-- Description:
--   1. public.profiles 테이블에 role 컬럼 추가 (에디터/관리자 권한 관리용, 기본값 'user')
--   2. public.guides 테이블 생성 (슬러그 고유화, 상태 관리, 다국어 준비, 출처 보관, 검증일 관리)
--   3. 조회수 증가 및 카테고리 필터 검색 성능 향상용 다중 인덱스 생성
--   4. RLS 정책 수립: 일반 사용자/익명은 오직 published 가이드만 읽기 가능, 수정/삭제는 오직 'admin' 등급만 허용 (보안 위조 원천 방지)
--   5. [보안 강화] 일반 사용자 및 악의적인 클라이언트가 본인의 role을 임의로 'admin'으로 변조할 수 없도록 방어하는 DB 트리거 구현 (위조 방지)
--
-- 주의사항:
--   - 이 파일은 로컬 설계 전용이며, Supabase DB에 직접 실행하지 마십시오.
--   - "PHASE 4 MIGRATION HAS NOT BEEN EXECUTED"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1. profiles 테이블에 권한 컬럼 추가 (admin / user 등급 수립)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'user';

COMMENT ON COLUMN public.profiles.role IS '사용자 권한 등급 (admin: 에디토리얼 관리자, user: 일반 커뮤니티 회원)';

-- ------------------------------------------------------------------------------
-- STEP 2. profiles 테이블 role 컬럼 임의 조작 방지 트리거 구현 (권한 상승 취약점 방어)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_role_update()
RETURNS trigger AS $$
BEGIN
  -- 클라이언트가 PostgREST API를 통해 'authenticated' 또는 'anon' 역할로 요청을 보낸 경우에만 검증
  -- (Supabase 대시보드 SQL 에디터 및 서비스 롤(postgres, service_role)을 통한 합법적인 권한 조정은 원활히 허용)
  IF current_setting('role', true) IN ('authenticated', 'anon') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION '일반 클라이언트/사용자는 본인의 권한 등급(role)을 직접 임의 변경할 수 없습니다.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 트리거 함수에 대해 불필요한 PUBLIC 직접 실행 차단
REVOKE ALL ON FUNCTION public.protect_profile_role_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role_update();

COMMENT ON FUNCTION public.protect_profile_role_update() IS '악의적인 사용자가 본인의 profiles.role 컬럼을 admin으로 격상하여 쓰기 권한을 탈취하는 권한 상승 공격을 데이터베이스단에서 완벽 차단하는 보안 트리거';

-- ------------------------------------------------------------------------------
-- STEP 3. guides 테이블 생성 (공식 에디토리얼 가이드 데이터베이스)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(255) NOT NULL,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  content text NOT NULL, -- 마크다운 또는 서식화된 긴 본문 내용 보관
  category varchar(100) NOT NULL, -- 'insurance', 'visa', 'jobs' 등
  language varchar(10) NOT NULL DEFAULT 'ko', -- 'ko' (한국어), 'de' (독일어), 'en' (영어)
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  last_verified_at timestamptz NULL, -- 정보 유효성 최종 검증일
  seo_title varchar(255) NULL,
  seo_description varchar(500) NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb, -- 공식 출처 URL 및 타이틀 리스트

  -- 제약조건
  CONSTRAINT unique_guide_slug UNIQUE (slug)
);

COMMENT ON TABLE public.guides IS '공식 생활정보 에디토리얼 가이드 테이블';
COMMENT ON COLUMN public.guides.slug IS 'SEO 친화적 고유 URL 식별자 (예: german-health-insurance)';
COMMENT ON COLUMN public.guides.status IS '가이드 게시 상태 (draft: 초안, published: 게시됨)';
COMMENT ON COLUMN public.guides.last_verified_at IS '정보 유효성이 공인 부처나 법령 기준으로 마지막 검증된 일자';
COMMENT ON COLUMN public.guides.sources IS '공식 정보 출처 및 링크 정보 보관용 JSONB (예: [{"title": "공식처", "url": "https://..."}])';

-- ------------------------------------------------------------------------------
-- STEP 4. 가이드 성능 인덱스 수립
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_guides_slug ON public.guides (slug);
CREATE INDEX IF NOT EXISTS idx_guides_category_status ON public.guides (category, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_guides_lang_status ON public.guides (language, status);

-- ------------------------------------------------------------------------------
-- STEP 5. RLS (Row Level Security) 설정 및 초정밀 보안 제어
-- ------------------------------------------------------------------------------
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

-- [조회 정책 1: 일반 및 익명 사용자] - 오직 status = 'published' 상태의 게시물만 조회 가능 (초안 보호)
DROP POLICY IF EXISTS "guides_public_select_policy" ON public.guides;
CREATE POLICY "guides_public_select_policy"
  ON public.guides
  FOR SELECT
  TO public
  USING ( status = 'published' );

-- [조회 정책 2: 어드민 에디터] - 어드민은 draft 초안 가이드도 조회/미리보기 가능
DROP POLICY IF EXISTS "guides_admin_select_policy" ON public.guides;
CREATE POLICY "guides_admin_select_policy"
  ON public.guides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- [쓰기 정책: INSERT] - 오직 profiles.role = 'admin'인 사용자만 작성 허용
DROP POLICY IF EXISTS "guides_admin_insert_policy" ON public.guides;
CREATE POLICY "guides_admin_insert_policy"
  ON public.guides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- [수정 정책: UPDATE] - 오직 profiles.role = 'admin'인 사용자만 수정 허용
DROP POLICY IF EXISTS "guides_admin_update_policy" ON public.guides;
CREATE POLICY "guides_admin_update_policy"
  ON public.guides
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
DROP POLICY IF EXISTS "guides_admin_delete_policy" ON public.guides;
CREATE POLICY "guides_admin_delete_policy"
  ON public.guides
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
