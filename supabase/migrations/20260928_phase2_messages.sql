-- ==============================================================================
-- Migration: Phase 2-2 - 사용자 간 1:1 메시지(쪽지) 시스템 (Phase 2-2 Messages)
-- Description:
--   1. public.messages 테이블 생성 (본인 전송 금지, 1~2000자 제약조건)
--   2. Foreign Key: sender_id, receiver_id -> public.profiles(id) ON DELETE CASCADE
--   3. 성능 최적화 인덱스 생성 (받은쪽지함, 보낸쪽지함, unread 부분 인덱스)
--   4. BEFORE UPDATE 불변 필드 보호 및 read_at 단방향 갱신 검증 트리거
--   5. RLS 활성화 및 세분화 정책 (SELECT, INSERT, UPDATE - DELETE는 전면 불허)
--
-- 주의사항:
--   - 이 파일은 실제 실행용 초안이며, Supabase DB에 직접 실행하지 마십시오.
--   - 기존 profiles, posts, comments, auth 및 기존 RLS 정책을 일절 수정하지 않습니다.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1. public.messages 테이블 생성
-- ------------------------------------------------------------------------------
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL DEFAULT NULL,

  -- [제약조건 1] 본인에게 메시지 전송 금지
  CONSTRAINT check_messages_not_self
    CHECK (sender_id <> receiver_id),

  -- [제약조건 2] 공백 제외 1자 이상, 최대 2000자 제한
  CONSTRAINT check_messages_body_length
    CHECK (char_length(trim(body)) >= 1 AND char_length(body) <= 2000),

  -- [외래키 제약조건] profiles.id 참조 (v1 삭제 정책: ON DELETE CASCADE)
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 테이블 및 주요 컬럼 코멘트
COMMENT ON TABLE public.messages IS '사용자 간 1:1 쪽지(메시지) 테이블';
COMMENT ON COLUMN public.messages.id IS '메시지 고유 ID (UUID)';
COMMENT ON COLUMN public.messages.sender_id IS '발신자 profile ID';
COMMENT ON COLUMN public.messages.receiver_id IS '수신자 profile ID';
COMMENT ON COLUMN public.messages.body IS '메시지 본문 내용 (1~2000자)';
COMMENT ON COLUMN public.messages.created_at IS '메시지 전송 일시';
COMMENT ON COLUMN public.messages.read_at IS '수신자 최초 열람 일시 (NULL: 안읽음)';

-- ------------------------------------------------------------------------------
-- STEP 2. 조회 성능 최적화 인덱스 생성
-- ------------------------------------------------------------------------------
-- [인덱스 1] 받은 쪽지함 목록 조회: 수신자 기준 최신순 정렬
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created
  ON public.messages (receiver_id, created_at DESC);

-- [인덱스 2] 보낸 쪽지함 목록 조회: 발신자 기준 최신순 정렬
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON public.messages (sender_id, created_at DESC);

-- [인덱스 3] 안 읽은 메시지(unread) 빠른 조회 및 카운트 (부분 인덱스)
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON public.messages (receiver_id)
  WHERE read_at IS NULL;

-- ------------------------------------------------------------------------------
-- STEP 3. 메시지 불변 필드 보호 및 read_at 검증 트리거 함수
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_message_update_protection()
RETURNS trigger AS $$
BEGIN
  -- 1. 불변 필드 보호: id, sender_id, receiver_id, body, created_at은 생성 후 변경 절대 불가
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '메시지 본문, 발신자, 수신자 및 생성일시는 수정할 수 없습니다.';
  END IF;

  -- 2. read_at 단방향 전이 및 DB 서버 시간 강제 적용 규칙
  -- (1) 이미 읽음 처리된 메시지(OLD.read_at IS NOT NULL):
  --     이후 read_at을 변경하거나 초기화(NULL)하는 모든 변경 시도를 차단합니다.
  IF OLD.read_at IS NOT NULL THEN
    IF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
      RAISE EXCEPTION '이미 읽음 처리된 메시지의 읽음 일시는 변경하거나 초기화할 수 없습니다.';
    END IF;
  ELSE
    -- (2) 아직 안 읽은 메시지(OLD.read_at IS NULL):
    --     수신자가 읽음 처리 신호(NEW.read_at IS NOT NULL)를 보냈을 때만 허용하며,
    --     클라이언트가 전달한 임의의 timestamp 대신 PostgreSQL DB 서버의 현재 시각(now())으로 강제 설정합니다.
    IF NEW.read_at IS NOT NULL THEN
      NEW.read_at := now();
    ELSE
      RAISE EXCEPTION '메시지 읽음 처리를 위해서는 read_at 값을 지정해야 합니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 기존 트리거가 있다면 삭제 후 재생성
DROP TRIGGER IF EXISTS trg_message_update_protection ON public.messages;
CREATE TRIGGER trg_message_update_protection
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_update_protection();

-- ------------------------------------------------------------------------------
-- STEP 4. RLS (Row Level Security) 활성화 및 세분화 정책 정의
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- [정책 1: SELECT] 발신자 본인이거나 수신자 본인만 조회 가능 (제3자 완전 차단)
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id
  );

-- [정책 2: INSERT] 로그인 사용자 본인만 발신자로 메시지 작성 가능 (사칭 차단)
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND sender_id <> receiver_id
  );

-- [정책 3: UPDATE] 수신자 본인만 자신이 받은 메시지를 수정(읽음 처리) 가능
-- (실제 필드 변경은 STEP 3 트리거에 의해 read_at 외 모두 원천 차단됨)
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = receiver_id
  )
  WITH CHECK (
    (select auth.uid()) = receiver_id
  );

-- [정책 4: DELETE] 일반 사용자 DELETE 차단
-- DELETE 정책을 일절 등록하지 않음으로써 authenticated 및 anon 사용자의 DELETE는
-- RLS에 의해 기본적으로 전면 거부(DENY)됩니다.
