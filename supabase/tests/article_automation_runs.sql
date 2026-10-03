BEGIN;
DO $$
DECLARE v_slot text := 'test-' || gen_random_uuid()::text;
BEGIN
  IF has_table_privilege('anon','public.article_automation_runs','SELECT')
     OR has_table_privilege('authenticated','public.article_automation_runs','SELECT')
     OR has_table_privilege('anon','public.article_automation_runs','INSERT')
     OR has_table_privilege('authenticated','public.article_automation_runs','INSERT') THEN
    RAISE EXCEPTION 'Automation runs exposed to clients';
  END IF;
  INSERT INTO public.article_automation_runs(slot_key,local_date,local_hour)
  VALUES(v_slot,current_date,8);
  BEGIN
    INSERT INTO public.article_automation_runs(slot_key,local_date,local_hour)
    VALUES(v_slot,current_date,8);
    RAISE EXCEPTION 'Duplicate slot accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
ROLLBACK;
