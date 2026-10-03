-- Add the German Hanguk operations account as a co-administrator.
-- Existing administrators are intentionally left unchanged.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('germanhanguk@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'German Hanguk admin account has not signed up yet';
  END IF;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'German Hanguk admin profile was not found';
  END IF;
END;
$$;
