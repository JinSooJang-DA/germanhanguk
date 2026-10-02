-- Phase 9: production notification delivery
-- Enable notifications in Supabase Realtime so unread badges and the notification
-- center update across tabs/devices without requiring a page refresh.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;

-- Realtime UPDATE payloads only need the primary key plus changed columns.
-- DEFAULT replica identity is sufficient and avoids exposing old row contents.
ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;
