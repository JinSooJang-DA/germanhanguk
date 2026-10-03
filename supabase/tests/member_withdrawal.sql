-- Run after the member withdrawal migration; fixtures always roll back.
BEGIN;
DO $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); p bigint; c uuid := gen_random_uuid(); r uuid := gen_random_uuid(); m uuid := gen_random_uuid(); mode text;
BEGIN
  IF to_regprocedure('public.withdraw_member(uuid,text)') IS NOT NULL THEN RAISE EXCEPTION 'Targeted RPC still exists'; END IF;
  IF NOT has_function_privilege('authenticated','public.withdraw_member(text)','EXECUTE')
    OR has_function_privilege('anon','public.withdraw_member(text)','EXECUTE')
    OR has_function_privilege('service_role','public.withdraw_member(text)','EXECUTE')
    THEN RAISE EXCEPTION 'Incorrect RPC grants'; END IF;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.withdraw_member('remove');
    RAISE EXCEPTION 'Anonymous withdrawal allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.withdraw_member('preserve');
    RAISE EXCEPTION 'Missing identity accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Invalid withdrawal request' THEN RAISE; END IF;
  END;
  RESET ROLE;
  FOREACH mode IN ARRAY ARRAY['preserve','remove'] LOOP
    a := gen_random_uuid(); b := gen_random_uuid(); c := gen_random_uuid(); r := gen_random_uuid(); m := gen_random_uuid();
    INSERT INTO auth.users(id) VALUES(a),(b);
    INSERT INTO public.profiles(id,display_name) VALUES(a,'closing'),(b,'remaining') ON CONFLICT(id) DO NOTHING;
    INSERT INTO public.posts(author_id,author_name,title,content,category) VALUES(a,'closing','original title','original body','free') RETURNING id INTO p;
    INSERT INTO public.comments(id,post_id,author_id,author_name,content) VALUES(c,p,a,'closing','original comment');
    INSERT INTO public.comments(id,post_id,parent_id,author_id,author_name,content) VALUES(r,p,c,b,'remaining','reply');
    INSERT INTO public.messages(id,sender_id,receiver_id,body) VALUES(m,a,b,'private message');
    INSERT INTO public.messages(sender_id,receiver_id,body) VALUES(b,a,'outgoing message');
    INSERT INTO public.post_likes(post_id,user_id) VALUES(p,a),(p,b);
    INSERT INTO public.profile_private_details(user_id) VALUES(a) ON CONFLICT DO NOTHING;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.withdraw_member('invalid');
      RAISE EXCEPTION 'Invalid mode accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'Invalid withdrawal request' THEN RAISE; END IF;
    END;
    BEGIN
      PERFORM public.withdraw_member(NULL);
      RAISE EXCEPTION 'Null mode accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'Invalid withdrawal request' THEN RAISE; END IF;
    END;
    -- A rolled-back withdrawal must restore every relational change.
    BEGIN
      PERFORM public.withdraw_member(mode);
      RAISE EXCEPTION 'Rollback fixture';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'Rollback fixture' THEN RAISE; END IF;
    END;
    RESET ROLE;
    IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=a)
      OR NOT EXISTS(SELECT 1 FROM public.posts WHERE id=p AND author_id=a AND content='original body')
      OR NOT EXISTS(SELECT 1 FROM public.comments WHERE id=c AND author_id=a AND content='original comment')
      OR NOT EXISTS(SELECT 1 FROM public.messages WHERE id=m AND sender_id=a) THEN RAISE EXCEPTION 'Rollback failed'; END IF;
    SET LOCAL ROLE authenticated;
    PERFORM public.withdraw_member(mode);
    RESET ROLE;
    IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=b) THEN RAISE EXCEPTION 'Other account deleted'; END IF;
    IF EXISTS(SELECT 1 FROM auth.users WHERE id=a) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=a) THEN RAISE EXCEPTION 'Identity retained'; END IF;
    IF EXISTS(SELECT 1 FROM public.profile_private_details WHERE user_id=a)
      OR EXISTS(SELECT 1 FROM public.community_reputation WHERE user_id=a)
      OR EXISTS(SELECT 1 FROM public.reputation_events WHERE user_id=a)
      OR EXISTS(SELECT 1 FROM public.guide_read_rewards WHERE user_id=a)
      OR EXISTS(SELECT 1 FROM public.post_likes WHERE user_id=a)
      OR EXISTS(SELECT 1 FROM public.notifications WHERE actor_id=a OR recipient_id=a)
      THEN RAISE EXCEPTION 'Account-scoped data retained'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.post_likes WHERE post_id=p AND user_id=b)
      THEN RAISE EXCEPTION 'Other member like lost'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.comments WHERE id=r AND parent_id=c AND content='reply' AND author_id=b) THEN RAISE EXCEPTION 'Reply lost'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.messages WHERE id=m AND sender_id IS NULL AND receiver_id=b AND body='private message') THEN RAISE EXCEPTION 'Mailbox lost'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.messages WHERE sender_id=b AND receiver_id IS NULL AND body='outgoing message') THEN RAISE EXCEPTION 'Sent mailbox lost'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.posts WHERE id=p AND author_id IS NULL AND ((mode='preserve' AND content='original body') OR (mode='remove' AND content<>'original body'))) THEN RAISE EXCEPTION 'Retention failed'; END IF;
    UPDATE public.messages SET read_at=now() WHERE id=m;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    IF NOT EXISTS(SELECT 1 FROM public.messages WHERE id=m) THEN RAISE EXCEPTION 'Survivor cannot read history'; END IF;
    PERFORM set_config('germanhanguk.withdrawal','on',true);
    BEGIN
      UPDATE public.messages SET receiver_id=NULL WHERE id=m;
      RAISE EXCEPTION 'Client can detach participant';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM='Client can detach participant' THEN RAISE; END IF;
    END;
    PERFORM set_config('germanhanguk.withdrawal','off',true);
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    IF EXISTS(SELECT 1 FROM public.messages WHERE id=m) THEN RAISE EXCEPTION 'Unrelated member can read history'; END IF;
    RESET ROLE;
    BEGIN
      UPDATE public.messages SET body='tampered' WHERE id=m;
      RAISE EXCEPTION 'Message protection failed';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM='Message protection failed' THEN RAISE; END IF;
    END;
  END LOOP;
  -- Evaluate the actual Storage policy predicates without editing storage metadata.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
END $$;

DO $$
DECLARE policy record; candidate record; allowed boolean; own_id text := auth.uid()::text; other_id text := gen_random_uuid()::text; policies integer := 0;
BEGIN
  FOR policy IN SELECT * FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND policyname IN ('Member image cleanup select', 'Member image cleanup delete') LOOP
    policies := policies + 1;
    IF policy.roles <> ARRAY['authenticated']::name[] OR policy.cmd NOT IN ('SELECT','DELETE')
      THEN RAISE EXCEPTION 'Incorrect storage policy role or command'; END IF;
    FOR candidate IN SELECT * FROM (VALUES
      ('avatars', own_id || '-avatar.webp', true),
      ('post-images', own_id || '/image.webp', true),
      ('post-images', own_id || '/nested/image.webp', true),
      ('avatars', other_id || '-avatar.webp', false),
      ('post-images', other_id || '/image.webp', false),
      ('avatars', own_id || 'suffix-avatar.webp', false),
      ('post-images', own_id || 'suffix/image.webp', false),
      ('other-bucket', own_id || '/image.webp', false)
    ) AS v(bucket_id, name, expected) LOOP
      EXECUTE 'SELECT ' || policy.qual || ' FROM (SELECT $1::text AS bucket_id, $2::text AS name, NULL::text AS owner_id) objects'
        INTO allowed USING candidate.bucket_id, candidate.name;
      IF allowed IS DISTINCT FROM candidate.expected THEN RAISE EXCEPTION 'Storage prefix isolation failed: %', candidate.name; END IF;
    END LOOP;
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', true);
    EXECUTE 'SELECT ' || policy.qual || ' FROM (SELECT ''avatars''::text AS bucket_id, $1::text AS name) objects'
      INTO allowed USING own_id || '-avatar.webp';
    IF allowed IS TRUE THEN RAISE EXCEPTION 'Storage accepts missing identity'; END IF;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', own_id, 'role', 'authenticated')::text, true);
  END LOOP;
  IF policies <> 2 THEN RAISE EXCEPTION 'Missing storage cleanup policies'; END IF;
END $$;
ROLLBACK;
