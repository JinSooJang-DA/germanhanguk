-- Persist the preferred UI language supplied during email signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_display_name text;
  v_region text;
  v_ui_language text;
BEGIN
  v_display_name := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1));
  v_region := nullif(trim(new.raw_user_meta_data->>'region'), '');
  v_ui_language := CASE WHEN new.raw_user_meta_data->>'ui_language' = 'de' THEN 'de' ELSE 'ko' END;

  INSERT INTO public.profiles (id, email, display_name, region, ui_language, created_at, updated_at)
  VALUES (new.id, new.email, v_display_name, v_region, v_ui_language, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    region = COALESCE(public.profiles.region, EXCLUDED.region),
    ui_language = COALESCE(public.profiles.ui_language, EXCLUDED.ui_language),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';