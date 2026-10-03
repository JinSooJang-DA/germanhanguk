-- Additive and repeatable. No existing community/member data is modified.
BEGIN;
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('general','content','privacy','technical')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 160),
  name text CHECK (char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254 AND email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','closed')),
  delete_after timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);
CREATE INDEX IF NOT EXISTS contact_requests_delete_after_idx ON public.contact_requests(delete_after);
CREATE TABLE IF NOT EXISTS public.contact_rate_limits (
  key_hash text PRIMARY KEY,
  window_started timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.contact_rate_secret (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  secret text NOT NULL DEFAULT (gen_random_uuid()::text || gen_random_uuid()::text)
);
INSERT INTO public.contact_rate_secret(singleton) VALUES(true) ON CONFLICT DO NOTHING;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_rate_secret ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_requests, public.contact_rate_limits, public.contact_rate_secret FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_contact(
  p_category text, p_subject text, p_name text, p_email text,
  p_message text, p_privacy_ack boolean, p_website text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_subject text := btrim(p_subject);
  v_name text := nullif(btrim(p_name),'');
  v_message text := btrim(p_message);
  v_secret text;
  v_hash text;
  v_key text;
  v_attempts integer;
  v_start timestamptz;
  v_now timestamptz := clock_timestamp();
  v_window interval;
  v_limit integer;
  i integer;
BEGIN
  IF p_privacy_ack IS DISTINCT FROM true
    OR p_category IS NULL OR p_category NOT IN ('general','content','privacy','technical')
    OR v_subject IS NULL OR char_length(v_subject) NOT BETWEEN 3 AND 160
    OR (v_name IS NOT NULL AND char_length(v_name) > 100)
    OR v_email IS NULL OR char_length(v_email) NOT BETWEEN 3 AND 254
    OR v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
    OR v_message IS NULL OR char_length(v_message) NOT BETWEEN 10 AND 5000
    OR p_website IS NULL OR p_website <> ''
    OR octet_length(coalesce(p_subject,'')) > 640
    OR octet_length(coalesce(p_name,'')) > 400
    OR octet_length(coalesce(p_email,'')) > 254
    OR octet_length(coalesce(p_message,'')) > 20000
  THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid contact request'; END IF;

  SELECT secret INTO STRICT v_secret FROM public.contact_rate_secret WHERE singleton;
  v_hash := encode(sha256(convert_to(v_secret || ':' || v_email,'UTF8')),'hex');
  DELETE FROM public.contact_rate_limits WHERE expires_at <= v_now;
  -- Global hourly cap also bounds attempts using rotating email addresses.
  -- Atomic UPSERTs serialize parallel requests; no raw IP/account identifiers.
  FOR i IN 1..3 LOOP
    v_key := CASE i WHEN 1 THEN 'global' WHEN 2 THEN 'hour:' || v_hash ELSE 'day:' || v_hash END;
    v_window := CASE WHEN i = 3 THEN interval '1 day' ELSE interval '1 hour' END;
    v_limit := CASE i WHEN 1 THEN 100 WHEN 2 THEN 3 ELSE 10 END;
    INSERT INTO public.contact_rate_limits AS limits(key_hash, window_started, attempts, expires_at)
      VALUES(v_key,v_now,1,v_now + v_window)
      ON CONFLICT(key_hash) DO UPDATE SET
        attempts = CASE WHEN limits.window_started + v_window <= v_now THEN 1 ELSE limits.attempts + 1 END,
        window_started = CASE WHEN limits.window_started + v_window <= v_now THEN v_now ELSE limits.window_started END,
        expires_at = CASE WHEN limits.window_started + v_window <= v_now THEN v_now + v_window ELSE limits.expires_at END
      RETURNING attempts, window_started INTO v_attempts, v_start;
    IF v_attempts > v_limit THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Contact rate limit exceeded';
    END IF;
  END LOOP;
  INSERT INTO public.contact_requests(category,subject,name,email,message)
    VALUES(p_category,v_subject,v_name,v_email,v_message);
END;
$$;
ALTER FUNCTION public.submit_contact(text,text,text,text,text,boolean,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_contact(text,text,text,text,text,boolean,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_contact(text,text,text,text,text,boolean,text) TO anon, authenticated;

-- Operator-only maintenance. Schedule with the database owner after approving
-- retention/backup policy. Never expose as a visitor RPC or run during tests.
CREATE OR REPLACE FUNCTION public.purge_expired_contacts() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  DELETE FROM public.contact_requests WHERE delete_after <= now();
  DELETE FROM public.contact_rate_limits WHERE expires_at <= now();
$$;
ALTER FUNCTION public.purge_expired_contacts() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.purge_expired_contacts() FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
