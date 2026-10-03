-- Phase 9: bilingual onboarding and privacy-aware Tandem identity.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_language text NOT NULL DEFAULT 'ko' CHECK (ui_language IN ('ko', 'de')),
  ADD COLUMN IF NOT EXISTS tandem_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_nationality boolean NOT NULL DEFAULT false;

ALTER TABLE public.profile_private_details
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS native_language text,
  ADD COLUMN IF NOT EXISTS learning_language text,
  ADD COLUMN IF NOT EXISTS korea_relation text;

COMMENT ON COLUMN public.profiles.ui_language IS 'Preferred interface language: ko or de';
COMMENT ON COLUMN public.profiles.tandem_enabled IS 'User explicitly opts into Tandem discovery';
COMMENT ON COLUMN public.profiles.show_nationality IS 'User explicitly allows nationality to appear publicly';
COMMENT ON COLUMN public.profile_private_details.nationality IS 'Private nationality value; exposed only through privacy-aware RPC';
COMMENT ON COLUMN public.profile_private_details.native_language IS 'Private native language; exposed only when Tandem is enabled';
COMMENT ON COLUMN public.profile_private_details.learning_language IS 'Private learning language; exposed only when Tandem is enabled';
CREATE OR REPLACE FUNCTION public.get_public_tandem_identity(p_user_id uuid)
RETURNS TABLE (
  tandem_enabled boolean,
  nationality text,
  native_language text,
  learning_language text,
  korea_relation text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT
    p.tandem_enabled,
    CASE WHEN p.show_nationality THEN d.nationality ELSE NULL END,
    CASE WHEN p.tandem_enabled THEN d.native_language ELSE NULL END,
    CASE WHEN p.tandem_enabled THEN d.learning_language ELSE NULL END,
    CASE WHEN p.tandem_enabled THEN d.korea_relation ELSE NULL END
  FROM public.profiles p
  LEFT JOIN public.profile_private_details d ON d.user_id = p.id
  WHERE p.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_tandem_identity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tandem_identity(uuid) TO anon, authenticated;