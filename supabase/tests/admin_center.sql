BEGIN;
DO $$
DECLARE a uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); before_admins bigint; before_events bigint; dashboard jsonb; members jsonb;
BEGIN
  SELECT count(*) INTO before_admins FROM public.profiles WHERE role='admin';
  SELECT count(*) INTO before_events FROM public.member_lifecycle_events;
  IF has_table_privilege('authenticated','public.member_lifecycle_events','SELECT') OR has_table_privilege('anon','public.member_lifecycle_events','SELECT') THEN RAISE EXCEPTION 'Lifecycle table exposed'; END IF;
  IF has_table_privilege('authenticated','public.contact_requests','SELECT') THEN RAISE EXCEPTION 'Contact table exposed'; END IF;
  IF NOT has_function_privilege('authenticated','public.admin_dashboard()','EXECUTE') OR has_function_privilege('anon','public.admin_dashboard()','EXECUTE') THEN RAISE EXCEPTION 'Dashboard grants incorrect'; END IF;
  INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES
    (a,'admin-fixture@example.invalid','{"display_name":"fixture-admin","community_profile_completed":true}'::jsonb,'{"provider":"email"}'::jsonb),
    (m,'member-fixture@example.invalid','{"display_name":"fixture-member","community_profile_completed":true}'::jsonb,'{"provider":"email"}'::jsonb);
  UPDATE public.profiles SET role='admin' WHERE id=a;
  IF (SELECT count(*) FROM public.member_lifecycle_events) <> before_events+2 THEN RAISE EXCEPTION 'Signup lifecycle not recorded'; END IF;
  IF EXISTS(SELECT 1 FROM public.member_lifecycle_events WHERE metadata ? 'email' OR metadata ? 'user_id' OR metadata ? 'display_name') THEN RAISE EXCEPTION 'Identity leaked into lifecycle'; END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',m,'role','authenticated')::text,true); SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.admin_dashboard(); RAISE EXCEPTION 'Non-admin dashboard allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true); SET LOCAL ROLE authenticated;
  dashboard:=public.admin_dashboard(); members:=public.admin_members('',1);
  IF (dashboard->>'active_members')::int < 2 OR jsonb_array_length(members->'rows') < 1 THEN RAISE EXCEPTION 'Admin RPC failed'; END IF;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',m,'role','authenticated')::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.withdraw_member('preserve'); RESET ROLE;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id=m) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=m) THEN RAISE EXCEPTION 'Withdrawal identity retained'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.member_lifecycle_events WHERE event_type='withdrawal' AND metadata='{"mode":"preserve"}'::jsonb) THEN RAISE EXCEPTION 'Withdrawal lifecycle missing'; END IF;
  IF EXISTS(SELECT 1 FROM public.member_lifecycle_events WHERE metadata ? 'email' OR metadata ? 'user_id' OR metadata ? 'display_name') THEN RAISE EXCEPTION 'Withdrawal lifecycle identifies member'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE role='admin') <> before_admins+1 THEN RAISE EXCEPTION 'Existing admins changed'; END IF;
END $$;
ROLLBACK;
