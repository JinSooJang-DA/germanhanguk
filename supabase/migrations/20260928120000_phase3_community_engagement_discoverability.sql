-- ==============================================================================
-- Migration: Phase 3 - 커뮤니티 활성화 및 검색성 개선 (Phase 3 Community Engagement & Discoverability)
-- Description:
--   1. comments 테이블에 parent_id 컬럼 추가 (대댓글 기능 - 1단계 깊이 제한)
--   2. post_likes 테이블 생성 (중복 방지, RLS 구현, 외래키 캐스케이드)
--   3. notifications 테이블 생성 (알림 시스템, RLS 구현)
--   4. 조회수 증가를 위한 원자적 RPC 함수 increment_page_view 생성 (클라이언트 임의 조작 방지)
--   5. 댓글 작성/삭제 및 좋아요 클릭/취소 시 알림을 자동 관리하는 DB 트리거 구현 (위조 방지)
--   6. 대댓글 깊이를 무조건 최대 1단계로만 유지하는 DB 트리거 구현 (보안 및 DB 강제 적용)
--   7. 알림 수정 시 오직 읽음 상태(is_read)만 수정할 수 있도록 제한하는 보호 트리거 구현 (위조 방지)
--   8. 조회 성능 최적화용 다중 인덱스 생성
--
-- 주의사항:
--   - 이 파일은 로컬 설계 전용이며, Supabase DB에 직접 실행하지 마십시오.
--   - "MIGRATION CREATED BUT NOT EXECUTED"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1. comments 테이블 변경 (parent_id 추가)
-- ------------------------------------------------------------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL;

-- self-referencing foreign key 추가 (대댓글)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_comments_parent'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT fk_comments_parent
      FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON COLUMN public.comments.parent_id IS '부모 댓글 ID (대댓글 구현용, NULL이면 원댓글)';

-- ------------------------------------------------------------------------------
-- STEP 2. post_likes 테이블 생성 (게시글 좋아요)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id bigint NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- [외래키 제약조건]
  CONSTRAINT fk_likes_post
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_user
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- [제약조건] 1인 1게시글 1좋아요 보장
  CONSTRAINT unique_post_user_like
    UNIQUE (post_id, user_id)
);

COMMENT ON TABLE public.post_likes IS '게시글 좋아요 테이블';
COMMENT ON COLUMN public.post_likes.id IS '좋아요 고유 ID (UUID)';
COMMENT ON COLUMN public.post_likes.post_id IS '좋아요 대상 게시글 ID';
COMMENT ON COLUMN public.post_likes.user_id IS '좋아요를 누른 사용자 profile ID';
COMMENT ON COLUMN public.post_likes.created_at IS '좋아요 누른 일시';

-- ------------------------------------------------------------------------------
-- STEP 3. notifications 테이블 생성 (알림 시스템)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL, -- 알림 수신자
  actor_id uuid NOT NULL,     -- 행위 주체자
  type varchar(50) NOT NULL CHECK (type IN ('COMMENT', 'REPLY', 'POST_LIKE')),
  reference_id uuid NOT NULL, -- 알림을 트리거한 객체의 ID (comments.id 혹은 post_likes.id)
  post_id bigint NOT NULL,    -- 대상 게시글 ID (이동 편의용)
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- [외래키 제약조건]
  CONSTRAINT fk_notifications_recipient
    FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_post
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,

  -- [제약조건] 동일한 댓글/좋아요 행위에 대해 중복 알림 생성 방지 (ON CONFLICT DO NOTHING의 기반이 됨)
  CONSTRAINT unique_notification_reference
    UNIQUE (reference_id)
);

COMMENT ON TABLE public.notifications IS '사용자 알림 관리 테이블';
COMMENT ON COLUMN public.notifications.id IS '알림 고유 ID (UUID)';
COMMENT ON COLUMN public.notifications.recipient_id IS '알림을 받는 사용자 profile ID';
COMMENT ON COLUMN public.notifications.actor_id IS '알림을 발생시킨 행위자 profile ID';
COMMENT ON COLUMN public.notifications.type IS '알림 유형 (COMMENT: 게시글 댓글, REPLY: 대댓글, POST_LIKE: 게시글 좋아요)';
COMMENT ON COLUMN public.notifications.reference_id IS '참조 대상 ID (댓글 ID 또는 좋아요 ID)';
COMMENT ON COLUMN public.notifications.post_id IS '알림이 발생한 게시글 ID (이동 링크용)';
COMMENT ON COLUMN public.notifications.is_read IS '읽음 여부 (true: 읽음, false: 안읽음)';
COMMENT ON COLUMN public.notifications.created_at IS '알림 발생 일시';

-- ------------------------------------------------------------------------------
-- STEP 4. 조회 성능 최적화용 인덱스 생성
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (recipient_id) WHERE is_read = false;

-- ------------------------------------------------------------------------------
-- STEP 5. 안전한 조회수 증가 RPC 함수 및 권한 제어 (완전 스키마 자격요건 준수)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_page_view(post_id bigint)
RETURNS void AS $$
BEGIN
  UPDATE public.posts
  SET views = COALESCE(public.posts.views, 0) + 1
  WHERE public.posts.id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 기본 PUBLIC 실행 권한을 박탈하고, 오직 필요한 Supabase 역할군에만 명시적으로 권한 부여
REVOKE ALL ON FUNCTION public.increment_page_view(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_page_view(bigint) TO anon, authenticated;

COMMENT ON FUNCTION public.increment_page_view(bigint) IS '클라이언트 개입 없이 게시글 조회수를 1 증가시키는 원자적 함수';

-- ------------------------------------------------------------------------------
-- STEP 6. 대댓글 깊이 강제 제한 (1단계 제한 - BEFORE INSERT OR UPDATE 트리거)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_comment_depth()
RETURNS trigger AS $$
DECLARE
  v_parent_parent_id uuid;
BEGIN
  -- 답글(parent_id가 존재함)일 경우
  IF NEW.parent_id IS NOT NULL THEN
    -- 부모 댓글의 parent_id를 조회
    SELECT parent_id INTO v_parent_parent_id 
    FROM public.comments 
    WHERE id = NEW.parent_id;
    
    -- 만약 부모 댓글 또한 어떤 댓글의 답글(parent_id가 존재함)이라면, 
    -- 이 대댓글의 부모를 조부모(최상위 부모) 댓글로 강제 강등시켜서 1단계 깊이를 초과하지 못하게 정규화합니다.
    IF v_parent_parent_id IS NOT NULL THEN
      NEW.parent_id := v_parent_parent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 트리거 함수에 대해 불필요한 PUBLIC 직접 실행 차단
REVOKE ALL ON FUNCTION public.enforce_comment_depth() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_comment_depth ON public.comments;
CREATE TRIGGER trg_enforce_comment_depth
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_comment_depth();

COMMENT ON FUNCTION public.enforce_comment_depth() IS '대댓글의 깊이가 1단계를 초과할 때 최상위 조부모 댓글로 자동 강등하여 깊이를 고정하는 정규화 트리거 함수';

-- ------------------------------------------------------------------------------
-- STEP 7. 알림 수정 보안 강화 트리거 (is_read 컬럼만 수정 가능하게 데이터 변조 차단)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.harden_notification_update()
RETURNS trigger AS $$
BEGIN
  -- 알림의 중요 메타데이터나 내용 컬럼이 변경되었는지 검증 (모두 NOT NULL이므로 안전한 직접 비교)
  IF NEW.id <> OLD.id OR
     NEW.recipient_id <> OLD.recipient_id OR
     NEW.actor_id <> OLD.actor_id OR
     NEW.type <> OLD.type OR
     NEW.reference_id <> OLD.reference_id OR
     NEW.post_id <> OLD.post_id OR
     NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION '알림(notifications) 내역에 대해서는 오직 읽음 상태(is_read) 컬럼만 업데이트할 수 있습니다.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 트리거 함수에 대해 불필요한 PUBLIC 직접 실행 차단
REVOKE ALL ON FUNCTION public.harden_notification_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_harden_notification_update ON public.notifications;
CREATE TRIGGER trg_harden_notification_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.harden_notification_update();

COMMENT ON FUNCTION public.harden_notification_update() IS '클라이언트에서 알림 읽음 상태 외의 다른 수신자/타입/작성자 등의 필드를 오염 또는 위조하는 것을 원천 방지하는 보안 트리거';

-- ------------------------------------------------------------------------------
-- STEP 8. 알림 위조 방지용 DB 트리거 구현 (완전 스키마 자격요건 준수)
-- ------------------------------------------------------------------------------

-- (A) 댓글/대댓글 알림 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
  v_parent_comment_author_id uuid;
BEGIN
  -- 1. 게시글 작성자 ID 조회 (스키마 자격 완전 명시)
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;

  -- 2. 대댓글인 경우 (parent_id가 존재함)
  IF NEW.parent_id IS NOT NULL THEN
    -- 부모 댓글 작성자 ID 조회
    SELECT author_id INTO v_parent_comment_author_id FROM public.comments WHERE id = NEW.parent_id;

    -- 부모 댓글 작성자가 존재하고, 대댓글 작성자 본인이 아닐 때만 'REPLY' 알림 생성
    IF v_parent_comment_author_id IS NOT NULL AND v_parent_comment_author_id <> NEW.author_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, reference_id, post_id)
      VALUES (v_parent_comment_author_id, NEW.author_id, 'REPLY', NEW.id, NEW.post_id)
      ON CONFLICT (reference_id) DO NOTHING;
    END IF;
  ELSE
    -- 3. 일반 댓글인 경우
    -- 게시글 작성자가 존재하고, 댓글 작성자 본인이 아닐 때만 'COMMENT' 알림 생성
    IF v_post_author_id IS NOT NULL AND v_post_author_id <> NEW.author_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, reference_id, post_id)
      VALUES (v_post_author_id, NEW.author_id, 'COMMENT', NEW.id, NEW.post_id)
      ON CONFLICT (reference_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 트리거 함수에 대해 불필요한 PUBLIC 직접 실행 차단
REVOKE ALL ON FUNCTION public.handle_comment_notification() FROM PUBLIC;

-- (B) 댓글 삭제 시 알림 자동 삭제 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_comment_deletion_notification()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.notifications WHERE reference_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 트리거 함수에 대해 불필요한 PUBLIC 직접 실행 차단
REVOKE ALL ON FUNCTION public.handle_comment_deletion_notification() FROM PUBLIC;

-- (C) 좋아요 추가 시 알림 생성 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS trigger AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  -- 게시글 작성자 ID 조회
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;

  -- 게시글 작성자가 존재하고, 좋아요를 누른 본인이 아닐 때만 'POST_LIKE' 알림 생성
  IF v_post_author_id IS NOT NULL AND v_post_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, reference_id, post_id)
    VALUES (v_post_author_id, NEW.user_id, 'POST_LIKE', NEW.id, NEW.post_id)
    ON CONFLICT (reference_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 트리거 함수에 대해 불필요한 PUBLIC 직접 실행 차단
REVOKE ALL ON FUNCTION public.handle_like_notification() FROM PUBLIC;

-- (D) 좋아요 취소 시 알림 자동 삭제 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_like_deletion_notification()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.notifications WHERE reference_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- [보안 강화] 트리거 함수에 대해 불필요한 PUBLIC 직접 실행 차단
REVOKE ALL ON FUNCTION public.handle_like_deletion_notification() FROM PUBLIC;

-- 트리거 바인딩 (Comments)
DROP TRIGGER IF EXISTS trg_comment_notification ON public.comments;
CREATE TRIGGER trg_comment_notification
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_notification();

DROP TRIGGER IF EXISTS trg_comment_deletion_notification ON public.comments;
CREATE TRIGGER trg_comment_deletion_notification
  BEFORE DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_deletion_notification();

-- 트리거 바인딩 (Post Likes)
DROP TRIGGER IF EXISTS trg_like_notification ON public.post_likes;
CREATE TRIGGER trg_like_notification
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_like_notification();

DROP TRIGGER IF EXISTS trg_like_deletion_notification ON public.post_likes;
CREATE TRIGGER trg_like_deletion_notification
  BEFORE DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_like_deletion_notification();

-- ------------------------------------------------------------------------------
-- STEP 9. RLS (Row Level Security) 설정 및 세밀한 정책 정의
-- ------------------------------------------------------------------------------

-- [post_likes RLS 활성화]
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- 좋아요 조회: 모든 사용자 허용
DROP POLICY IF EXISTS "post_likes_select_policy" ON public.post_likes;
CREATE POLICY "post_likes_select_policy"
  ON public.post_likes
  FOR SELECT
  TO public
  USING (true);

-- 좋아요 추가: 로그인 사용자 본인의 것만 추가 허용
DROP POLICY IF EXISTS "post_likes_insert_policy" ON public.post_likes;
CREATE POLICY "post_likes_insert_policy"
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

-- 좋아요 취소: 로그인 사용자 본인의 것만 취소 허용
DROP POLICY IF EXISTS "post_likes_delete_policy" ON public.post_likes;
CREATE POLICY "post_likes_delete_policy"
  ON public.post_likes
  FOR DELETE
  TO authenticated
  USING ( (select auth.uid()) = user_id );


-- [notifications RLS 활성화]
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 알림 조회: 본인에게 전송된 알림만 조회 가능 (제3자 열람 차단)
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING ( (select auth.uid()) = recipient_id );

-- 알림 읽음 처리: 본인에게 전송된 알림만 수정 가능
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING ( (select auth.uid()) = recipient_id )
  WITH CHECK ( (select auth.uid()) = recipient_id );
