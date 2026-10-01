-- =============================================================================
-- Phase 7: Messe event calendar foundation
-- Official trade-fair schedules are kept separate from editorial articles.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider varchar(100) NOT NULL,
  source_event_id text NOT NULL,
  source_url text NOT NULL,
  title varchar(255) NOT NULL,
  summary text NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  city varchar(120) NOT NULL,
  venue varchar(255) NOT NULL,
  official_url text NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT messe_events_source_identity_unique UNIQUE (source_provider, source_event_id),
  CONSTRAINT messe_events_source_provider_not_blank CHECK (length(btrim(source_provider)) > 0),
  CONSTRAINT messe_events_source_event_id_not_blank CHECK (length(btrim(source_event_id)) > 0),
  CONSTRAINT messe_events_source_url_https CHECK (source_url LIKE 'https://%'),
  CONSTRAINT messe_events_date_order CHECK (ends_on >= starts_on)
);

COMMENT ON TABLE public.messe_events IS
  '공식 Messe 운영사 일정 피드에서 동기화한 전시회/행사 일정';
COMMENT ON COLUMN public.messe_events.source_event_id IS
  '공식 source가 제공하는 안정적인 event identity (Messe Düsseldorf ICS UID 등)';

CREATE INDEX IF NOT EXISTS idx_messe_events_active_starts_on
  ON public.messe_events (is_active, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_messe_events_city_starts_on
  ON public.messe_events (city, starts_on);

CREATE OR REPLACE FUNCTION public.set_messe_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_messe_events_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_messe_events_updated_at ON public.messe_events;
CREATE TRIGGER trg_messe_events_updated_at
  BEFORE UPDATE ON public.messe_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_messe_events_updated_at();

REVOKE ALL PRIVILEGES ON TABLE public.messe_events FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.messe_events FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.messe_events FROM authenticated;
GRANT SELECT ON TABLE public.messe_events TO anon;
GRANT SELECT ON TABLE public.messe_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messe_events TO service_role;

ALTER TABLE public.messe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messe_events_public_select_policy" ON public.messe_events;
CREATE POLICY "messe_events_public_select_policy"
  ON public.messe_events
  FOR SELECT
  TO public
  USING (is_active = true);

COMMENT ON COLUMN public.messe_events.is_active IS
  '공식 source에서 현재 유효한 일정인지 나타내며 공개 조회는 active 일정만 허용';
COMMENT ON COLUMN public.messe_events.last_seen_at IS
  '최근 성공한 source sync에서 해당 event를 다시 확인한 시각';
COMMENT ON COLUMN public.messe_events.last_synced_at IS
  '해당 row의 source metadata를 마지막으로 동기화한 시각';
