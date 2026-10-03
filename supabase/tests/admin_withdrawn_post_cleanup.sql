BEGIN;
DO $$
DECLARE
  v_admin uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_active_post bigint;
  v_blocked_post bigint;
  v_clean_post bigint;
  v_unrelated_post bigint;
BEGIN
  IF NOT has_function_privilege('authenticated', 'public.admin_cleanup_withdrawn_post(bigint)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.admin_cleanup_withdrawn_post(bigint)', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.admin_cleanup_withdrawn_post(bigint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Incorrect cleanup RPC grants';
  END IF;

  INSERT INTO auth.users(id) VALUES (v_admin), (v_member), (v_other);
  UPDATE public.profiles SET display_name = 'cleanup-admin', role = 'admin' WHERE id = v_admin;
  UPDATE public.profiles SET display_name = 'cleanup-member', role = 'user' WHERE id = v_member;
  UPDATE public.profiles SET display_name = 'cleanup-other', role = 'user' WHERE id = v_other;

  INSERT INTO public.posts(author_id, author_name, title, content, category)
  VALUES (v_member, 'member', 'active author', 'fixture', 'community') RETURNING id INTO v_active_post;
  INSERT INTO public.posts(author_id, author_name, title, content, category)
  VALUES (NULL, '탈퇴한 회원 / Ehemaliges Mitglied', 'blocked', 'fixture', 'community') RETURNING id INTO v_blocked_post;
  INSERT INTO public.comments(post_id, author_id, author_name, content)
  VALUES (v_blocked_post, v_other, 'other', 'active member comment');
  INSERT INTO public.posts(author_id, author_name, title, content, category)
  VALUES (NULL, '탈퇴한 회원 / Ehemaliges Mitglied', 'eligible', 'fixture', 'community') RETURNING id INTO v_clean_post;
  INSERT INTO public.comments(post_id, author_id, author_name, content)
  VALUES (v_clean_post, NULL, '탈퇴한 회원 / Ehemaliges Mitglied', 'withdrawn comment');
  INSERT INTO public.posts(author_id, author_name, title, content, category)
  VALUES (v_other, 'other', 'unrelated', 'fixture', 'community') RETURNING id INTO v_unrelated_post;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_cleanup_withdrawn_post(v_clean_post);
    RAISE EXCEPTION 'Non-admin cleanup accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.admin_cleanup_withdrawn_post(v_active_post);
    RAISE EXCEPTION 'Active-author post accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Post author is still active' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.admin_cleanup_withdrawn_post(v_blocked_post);
    RAISE EXCEPTION 'Post with active comment accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Other member comments exist' THEN RAISE; END IF;
  END;

  PERFORM public.admin_cleanup_withdrawn_post(v_clean_post);
  RESET ROLE;

  IF EXISTS (SELECT 1 FROM public.posts WHERE id = v_clean_post) THEN
    RAISE EXCEPTION 'Eligible withdrawn post was not deleted';
  END IF;
  IF EXISTS (SELECT 1 FROM public.comments WHERE post_id = v_clean_post) THEN
    RAISE EXCEPTION 'Withdrawn comments were not deleted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = v_unrelated_post) THEN
    RAISE EXCEPTION 'Unrelated post was touched';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = v_blocked_post) THEN
    RAISE EXCEPTION 'Blocked post was touched';
  END IF;
END $$;
ROLLBACK;
