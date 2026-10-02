-- Kakao Login can legitimately return no email when account_email permission is unavailable.
-- Keep profiles compatible with that flow and derive a temporary display name safely.
ALTER TABLE public.profiles
  ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_display_name text;
  v_region text;
BEGIN
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
    nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '회원-' || left(new.id::text, 8)
  );

  v_region := nullif(trim(new.raw_user_meta_data->>'region'), '');

  INSERT INTO public.profiles (
    id, email, display_name, region, created_at, updated_at
  )
  VALUES (
    new.id, new.email, v_display_name, v_region, now(), now()
  )  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    region = COALESCE(public.profiles.region, EXCLUDED.region),
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
