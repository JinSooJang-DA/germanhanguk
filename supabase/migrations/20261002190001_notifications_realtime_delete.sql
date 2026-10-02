-- Include the previous row in notification DELETE changes so recipient-filtered
-- Realtime subscriptions can react immediately when a comment/like is removed.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
