-- Self-only withdrawal: relational cleanup commits together or rolls back.
BEGIN;
DROP FUNCTION IF EXISTS public.withdraw_member(uuid, text);
CREATE OR REPLACE FUNCTION public.withdraw_member(p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p_user_id uuid := auth.uid();
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
ALTER FUNCTION public.withdraw_member(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.withdraw_member(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_member(text) TO authenticated;

-- Admin-uploaded images have no member owner_id. Authorize cleanup by the
-- server-assigned UUID name prefix, independent of the uploading role.
DROP POLICY IF EXISTS "Member image cleanup select" ON storage.objects;
CREATE POLICY "Member image cleanup select" ON storage.objects
  FOR SELECT TO authenticated USING (
    (bucket_id = 'avatars' AND starts_with(name, (SELECT auth.uid())::text || '-'))
    OR (bucket_id = 'post-images' AND starts_with(name, (SELECT auth.uid())::text || '/'))
  );
DROP POLICY IF EXISTS "Member image cleanup delete" ON storage.objects;
CREATE POLICY "Member image cleanup delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    (bucket_id = 'avatars' AND starts_with(name, (SELECT auth.uid())::text || '-'))
    OR (bucket_id = 'post-images' AND starts_with(name, (SELECT auth.uid())::text || '/'))
  );
COMMIT;
