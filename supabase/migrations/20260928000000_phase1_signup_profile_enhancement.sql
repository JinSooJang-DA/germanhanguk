-- ==============================================================================
-- Migration: Phase 1 - 회원가입 및 프로필 시스템 개선 (Phase 1 Signup & Profile Enhancement)
-- Description:
--   1. 기존 데이터 무결성 검증 (Orphan 검사 쿼리 - Read-Only)
--   2. public.profiles 테이블 컬럼 확장 (bio text, updated_at timestamptz)
--   3. auth.users ↔ public.profiles 간 Foreign Key 제약 조건 추가 (안전 조건부 생성)
--   4. 회원가입 트리거 함수 public.handle_new_user() 개선 (display_name, region, email 동기화)
--
-- 주의사항:
--   - 이 파일은 실제 실행용 초안이며, Supabase DB에 직접 실행하지 마십시오.
--   - 기존 테이블이나 데이터를 DROP / DELETE 하지 않는 비파괴적 스크립트입니다.
--   - role 권한 모델 및 posts/comments author FK, RLS 정책 재정의는 향후 Phase에서 다룹니다.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1. 기존 데이터 정합성 사전 검증 (Read-Only)
-- 아래 쿼리들은 변경 작업을 수행하지 않는 읽기 전용 검증 쿼리입니다.
-- Supabase SQL Editor에서 먼저 단독 실행하여 데이터 정합성을 확인하십시오.
-- ------------------------------------------------------------------------------

/*
-- [검증 1] auth.users에 존재하지 않는 고아 프로필(Orphan profile) 확인
SELECT p.id, p.display_name, p.email, p.region, p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- [참고 검증 2] profiles에 존재하지 않는 posts 작성자 확인 (Read-Only 참고용)
SELECT p.id AS post_id, p.title, p.author_id, p.author_name, p.created_at
FROM public.posts p
LEFT JOIN public.profiles pr ON p.author_id = pr.id
WHERE p.author_id IS NOT NULL AND pr.id IS NULL;

-- [참고 검증 3] profiles에 존재하지 않는 comments 작성자 확인 (Read-Only 참고용)
SELECT c.id AS comment_id, c.post_id, c.author_id, c.author_name, c.created_at
FROM public.comments c
LEFT JOIN public.profiles pr ON c.author_id = pr.id
WHERE c.author_id IS NOT NULL AND pr.id IS NULL;
*/

-- ------------------------------------------------------------------------------
-- STEP 2. public.profiles 신규 컬럼 추가 (bio, updated_at)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.profiles.bio IS '사용자 자기소개 (한 줄 소개)';
COMMENT ON COLUMN public.profiles.updated_at IS '프로필 최종 수정 일시';

-- ------------------------------------------------------------------------------
-- STEP 3. auth.users ↔ public.profiles 관계 (Foreign Key) 추가
-- STEP 1의 [검증 1] 결과에서 고아 데이터가 0건일 때 안전하게 추가됩니다.
-- 고아 데이터가 존재하는 경우 강제로 삭제하지 않고 생성을 건너뜁니다.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- profiles.id -> auth.users.id FK가 없을 경우에만 생성
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_auth_user'
  ) THEN
    -- 고아 데이터가 없는지 확인 후 추가
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      LEFT JOIN auth.users u ON p.id = u.id
      WHERE u.id IS NULL
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT fk_profiles_auth_user
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE 'fk_profiles_auth_user 외래키 제약조건이 성공적으로 추가되었습니다.';
    ELSE
      RAISE WARNING 'auth.users에 존재하지 않는 고아 profiles 데이터가 발견되어 외래키를 추가하지 않았습니다. STEP 1 검증 쿼리를 확인하세요.';
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 4. 회원가입 트리거 함수 public.handle_new_user() 개선
-- 기존 on_auth_user_created 트리거는 절대 삭제/재생성하지 않고 유지하며,
-- 함수 정의만 CREATE OR REPLACE FUNCTION으로 교체하여 하위 호환성을 완벽히 유지합니다.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_display_name text;
  v_region text;
BEGIN
  -- 1. 메타데이터(options.data)에서 display_name 추출 (없으면 이메일 아이디 사용)
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1)
  );

  -- 2. 메타데이터(options.data)에서 region 추출
  v_region := nullif(trim(new.raw_user_meta_data->>'region'), '');

  -- 3. profiles 테이블에 신규 사용자 프로필 생성 (ON CONFLICT id로 멱등성 보장)
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    region,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    v_display_name,
    v_region,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    region = COALESCE(public.profiles.region, EXCLUDED.region),
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ==============================================================================
-- End of Migration
-- ==============================================================================
