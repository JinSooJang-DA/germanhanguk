-- Isolated fixtures and all changes roll back, including retention checks.
BEGIN;
DO $$
DECLARE
  role_name text; table_name text; privilege_name text;
  fixture_email text := 'contact-test-' || gen_random_uuid()::text || '@example.invalid';
  before_count bigint; i integer;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    FOREACH table_name IN ARRAY ARRAY['contact_requests','contact_rate_limits','contact_rate_secret'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(role_name,'public.' || table_name,privilege_name) THEN RAISE EXCEPTION 'Unexpected table privilege: % % %', role_name,table_name,privilege_name; END IF;
      END LOOP;
      IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.' || table_name)::regclass) THEN RAISE EXCEPTION 'Missing RLS'; END IF;
    END LOOP;
    IF has_function_privilege(role_name,'public.purge_expired_contacts()','EXECUTE') THEN RAISE EXCEPTION 'Public retention access'; END IF;
  END LOOP;
  IF NOT has_function_privilege('anon','public.submit_contact(text,text,text,text,text,boolean,text)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.submit_contact(text,text,text,text,text,boolean,text)','EXECUTE')
    OR has_function_privilege('service_role','public.submit_contact(text,text,text,text,text,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'Incorrect submission grants'; END IF;
  -- Fixture-only rate state isolation is transactional; restore on rollback.
  DELETE FROM public.contact_rate_limits;
  SELECT count(*) INTO before_count FROM public.contact_requests;
  SET LOCAL ROLE anon;
  BEGIN PERFORM * FROM public.contact_requests; RAISE EXCEPTION 'Direct read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.contact_requests(category,subject,email,message) VALUES('general','test',fixture_email,'test message'); RAISE EXCEPTION 'Direct write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  FOR i IN 1..14 LOOP
    BEGIN
      PERFORM public.submit_contact(
        CASE WHEN i=1 THEN 'invalid' WHEN i=2 THEN NULL ELSE 'general' END,
        CASE WHEN i=3 THEN '  ' WHEN i=4 THEN repeat('x',161) WHEN i=5 THEN NULL ELSE 'Test subject' END,
        CASE WHEN i=6 THEN repeat('n',101) ELSE '' END,
        CASE WHEN i=7 THEN 'invalid' WHEN i=8 THEN 'a@b' WHEN i=9 THEN NULL ELSE fixture_email END,
        CASE WHEN i=10 THEN 'short' WHEN i=11 THEN repeat('x',5001) WHEN i=12 THEN NULL ELSE 'Test message body' END,
        CASE WHEN i=13 THEN false ELSE true END,
        CASE WHEN i=14 THEN 'bot' ELSE '' END);
      RAISE EXCEPTION 'Invalid request accepted: %',i;
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
  END LOOP;
  PERFORM public.submit_contact('general','  Test subject  ',' ',upper(fixture_email),'  Test message body  ',true,'');
  PERFORM public.submit_contact('privacy','Test subject',NULL,fixture_email,'Test message body',true,'');
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  PERFORM public.submit_contact('content','Test subject','Test name',fixture_email,'Test message body',true,'');
  BEGIN
    PERFORM public.submit_contact('technical','Test subject','',fixture_email,'Test message body',true,'');
    RAISE EXCEPTION 'Hourly rate limit bypassed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Contact rate limit exceeded' THEN RAISE; END IF; END;
  RESET ROLE;
  IF (SELECT count(*) FROM public.contact_requests) <> before_count + 3 THEN RAISE EXCEPTION 'Unexpected submission count'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contact_requests WHERE email=fixture_email AND name IS NULL AND subject='Test subject' AND message='Test message body' AND status='new' AND delete_after > created_at + interval '89 days') THEN RAISE EXCEPTION 'Normalization or retention failed'; END IF;
  IF EXISTS(SELECT 1 FROM public.contact_rate_limits WHERE key_hash LIKE '%' || fixture_email || '%') THEN RAISE EXCEPTION 'Raw rate identifier stored'; END IF;
  -- Daily and global limits, with accepted fixtures expired to start new hours.
  FOR i IN 1..7 LOOP
    UPDATE public.contact_rate_limits SET window_started=now()-interval '2 hours',expires_at=now()+interval '1 hour' WHERE key_hash LIKE 'hour:%' OR key_hash='global';
    PERFORM public.submit_contact('general','Test subject','',fixture_email,'Test message body',true,'');
  END LOOP;
  UPDATE public.contact_rate_limits SET window_started=now()-interval '2 hours' WHERE key_hash LIKE 'hour:%';
  BEGIN PERFORM public.submit_contact('general','Test subject','',fixture_email,'Test message body',true,''); RAISE EXCEPTION 'Daily limit bypassed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Contact rate limit exceeded' THEN RAISE; END IF; END;
  UPDATE public.contact_rate_limits SET attempts=100,window_started=now() WHERE key_hash='global';
  BEGIN PERFORM public.submit_contact('general','Test subject','', 'other-' || fixture_email,'Test message body',true,''); RAISE EXCEPTION 'Global limit bypassed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Contact rate limit exceeded' THEN RAISE; END IF; END;
  -- Test deletion only on fixtures; production rows are protected by a subtransaction
  -- and its mandatory rollback, including if the assertions fail.
  BEGIN
    UPDATE public.contact_requests SET delete_after=now()-interval '1 day' WHERE email=fixture_email;
    PERFORM public.purge_expired_contacts();
    IF EXISTS(SELECT 1 FROM public.contact_requests WHERE email=fixture_email) THEN RAISE EXCEPTION 'Purge failed'; END IF;
    RAISE EXCEPTION 'Fixture rollback';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Fixture rollback' THEN RAISE; END IF; END;
END;
$$;
ROLLBACK;
