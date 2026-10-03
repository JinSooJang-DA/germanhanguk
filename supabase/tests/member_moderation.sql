-- Run after 20261004000000_member_moderation_and_withdrawal_rejoin_block.sql.
-- Fixtures roll back and never touch real members.
BEGIN;
DO $$
DECLARE a uuid:=gen_random_uuid(); m uuid:=gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES
    (a,'moderation-admin@example.invalid','{"display_name":"moderation-admin"}'::jsonb,'{"provider":"email"}'::jsonb),
    (m,'moderation-member@example.invalid','{"display_name":"moderation-member"}'::jsonb,'{"provider":"email"}'::jsonb);
  UPDATE public.profiles SET role='admin' WHERE id=a;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  PERFORM public.admin_set_member_moderation(m,'suspend_7d','fixture suspension');
  IF NOT EXISTS(SELECT 1 FROM public.member_moderation_states WHERE user_id=m AND status='suspended' AND expires_at>now()) THEN RAISE EXCEPTION 'Seven-day suspension missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.member_moderation_actions WHERE target_user_id=m AND moderator_user_id=a AND action='suspend_7d') THEN RAISE EXCEPTION 'Moderation audit missing'; END IF;
  PERFORM public.admin_set_member_moderation(m,'ban_permanent','fixture permanent ban');
  IF NOT EXISTS(SELECT 1 FROM public.member_moderation_states WHERE user_id=m AND status='banned' AND expires_at IS NULL) THEN RAISE EXCEPTION 'Permanent ban missing'; END IF;
  PERFORM public.admin_set_member_moderation(m,'restore','fixture restore');
  IF NOT EXISTS(SELECT 1 FROM public.member_moderation_states WHERE user_id=m AND status='active' AND expires_at IS NULL) THEN RAISE EXCEPTION 'Restore missing'; END IF;
  BEGIN
    PERFORM public.admin_set_member_moderation(a,'suspend_7d','self moderation');
    RAISE EXCEPTION 'Self moderation was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',m,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_set_member_moderation(a,'suspend_7d','non admin attempt');
    RAISE EXCEPTION 'Non-admin moderation was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;
ROLLBACK;
