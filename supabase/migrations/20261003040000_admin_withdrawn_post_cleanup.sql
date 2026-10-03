BEGIN;

CREATE OR REPLACE FUNCTION public.admin_cleanup_withdrawn_post(p_post_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;

  SELECT author_id INTO v_author_id
  FROM public.posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Post not found';
  END IF;

  IF v_author_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Post author is still active';
  END IF;

  PERFORM 1 FROM public.comments
  WHERE post_id = p_post_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.comments
    WHERE post_id = p_post_id AND author_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Other member comments exist';
  END IF;

  DELETE FROM public.comments WHERE post_id = p_post_id;
  DELETE FROM public.posts WHERE id = p_post_id;
END;
$$;

ALTER FUNCTION public.admin_cleanup_withdrawn_post(bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_cleanup_withdrawn_post(bigint) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cleanup_withdrawn_post(bigint) TO authenticated;

COMMIT;
