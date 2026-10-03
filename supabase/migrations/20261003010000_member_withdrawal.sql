-- Reviewed against the linked database: comments -> auth.users CASCADE,
-- posts -> auth.users NO ACTION, messages -> profiles CASCADE. Never delete
-- posts/comments: their child foreign keys cascade to other members' replies.
BEGIN;

ALTER TABLE public.comments ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.comments DROP CONSTRAINT comments_author_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.posts DROP CONSTRAINT posts_author_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;
ALTER TABLE public.messages DROP CONSTRAINT fk_messages_sender;
ALTER TABLE public.messages DROP CONSTRAINT fk_messages_receiver;
ALTER TABLE public.messages ADD CONSTRAINT fk_messages_sender
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD CONSTRAINT fk_messages_receiver
  FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Only withdrawal's transaction may detach participants. JWT roles and client
-- session settings cannot impersonate the function's PostgreSQL owner.
CREATE OR REPLACE FUNCTION public.handle_message_update_protection()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user = 'postgres'
     AND current_setting('germanhanguk.withdrawal', true) = 'on'
     AND NEW.id = OLD.id AND NEW.body = OLD.body
     AND NEW.created_at = OLD.created_at
     AND NEW.read_at IS NOT DISTINCT FROM OLD.read_at
     AND (NEW.sender_id IS NOT DISTINCT FROM OLD.sender_id OR NEW.sender_id IS NULL)
     AND (NEW.receiver_id IS NOT DISTINCT FROM OLD.receiver_id OR NEW.receiver_id IS NULL)
  THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Message fields are immutable';
  END IF;
  IF OLD.read_at IS NOT NULL THEN
    IF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
      RAISE EXCEPTION 'Read receipt is immutable';
    END IF;
  ELSIF NEW.read_at IS NOT NULL THEN NEW.read_at := now();
  ELSE RAISE EXCEPTION 'Read receipt is required';
  END IF;
  RETURN NEW;
END;
$$;

-- Service role only; the server derives p_user_id from auth.getUser(token).
-- Account deletion and all relational cleanup commit together or roll back.
CREATE FUNCTION public.withdraw_member(p_user_id uuid, p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_user_id IS NULL OR p_mode IS NULL OR p_mode NOT IN ('preserve', 'remove') THEN
    RAISE EXCEPTION 'Invalid withdrawal request';
  END IF;
  PERFORM 1 FROM auth.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account does not exist'; END IF;
  -- Block concurrent inserts/updates until detachment and account deletion end.
  LOCK TABLE public.posts, public.comments, public.messages,
    public.post_likes, public.notifications IN SHARE ROW EXCLUSIVE MODE;
  UPDATE public.posts SET author_id = NULL,
    author_name = '탈퇴한 회원 / Ehemaliges Mitglied',
    title = CASE WHEN p_mode = 'remove' THEN '삭제된 글 / Gelöschter Beitrag' ELSE title END,
    content = CASE WHEN p_mode = 'remove' THEN '탈퇴한 회원이 삭제한 내용입니다. / Vom ehemaligen Mitglied entfernt.' ELSE content END,
    region = CASE WHEN p_mode = 'remove' THEN NULL ELSE region END,
    city = CASE WHEN p_mode = 'remove' THEN NULL ELSE city END,
    target_field = CASE WHEN p_mode = 'remove' THEN NULL ELSE target_field END
    WHERE author_id = p_user_id;
  UPDATE public.comments SET author_id = NULL,
    author_name = '탈퇴한 회원 / Ehemaliges Mitglied',
    content = CASE WHEN p_mode = 'remove' THEN '탈퇴한 회원이 삭제한 내용입니다. / Vom ehemaligen Mitglied entfernt.' ELSE content END
    WHERE author_id = p_user_id;
  PERFORM set_config('germanhanguk.withdrawal', 'on', true);
  UPDATE public.messages SET
    sender_id = CASE WHEN sender_id = p_user_id THEN NULL ELSE sender_id END,
    receiver_id = CASE WHEN receiver_id = p_user_id THEN NULL ELSE receiver_id END
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  PERFORM set_config('germanhanguk.withdrawal', 'off', true);
  DELETE FROM public.post_likes WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE recipient_id = p_user_id OR actor_id = p_user_id;
  -- Private details, reputation ledger/totals and read rewards cascade only
  -- from this profile. Editorial guides retain their existing SET NULL FK.
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
ALTER FUNCTION public.withdraw_member(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.withdraw_member(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_member(uuid, text) TO service_role;
COMMIT;
