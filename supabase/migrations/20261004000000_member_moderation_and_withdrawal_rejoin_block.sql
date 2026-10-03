BEGIN;

-- Account status is deliberately separate from profiles.role.  It is used by
-- restrictive RLS policies as well as the server-side Auth ban.
CREATE TABLE public.member_moderation_states (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'active' AND expires_at IS NULL) OR status = 'suspended' OR status = 'banned')
);

CREATE TABLE public.member_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  moderator_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('suspend_7d', 'suspend_30d', 'ban_permanent', 'restore')),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_moderation_actions_target_time_idx
  ON public.member_moderation_actions(target_user_id, created_at DESC);

-- This stores only an HMAC, never an email address. The HMAC key must be
-- created manually in Supabase Vault as `withdrawal_rejoin_hmac_key` before
-- enabling the withdrawal flow or the Before User Created hook.
CREATE TABLE public.withdrawal_rejoin_blocks (
  email_hmac text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

ALTER TABLE public.member_moderation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_rejoin_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_moderation_states, public.member_moderation_actions, public.withdrawal_rejoin_blocks FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_member_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.member_moderation_states s
    WHERE s.user_id = auth.uid()
      AND (s.status = 'banned' OR (s.status = 'suspended' AND (s.expires_at IS NULL OR s.expires_at > now())))
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_set_member_moderation(p_target_user_id uuid, p_action text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_status text;
  v_expires_at timestamptz;
BEGIN
  PERFORM public.require_admin();
  IF p_target_user_id IS NULL OR p_action NOT IN ('suspend_7d', 'suspend_30d', 'ban_permanent', 'restore')
     OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Invalid moderation request';
  END IF;
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='An administrator cannot moderate themselves';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_target_user_id) THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Member not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=p_target_user_id AND role='admin') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Administrators cannot moderate another administrator';
  END IF;

  v_status := CASE p_action WHEN 'restore' THEN 'active' WHEN 'ban_permanent' THEN 'banned' ELSE 'suspended' END;
  v_expires_at := CASE p_action
    WHEN 'suspend_7d' THEN now() + interval '7 days'
    WHEN 'suspend_30d' THEN now() + interval '30 days'
    ELSE NULL
  END;
  INSERT INTO public.member_moderation_states(user_id,status,expires_at,updated_at)
  VALUES(p_target_user_id,v_status,v_expires_at,now())
  ON CONFLICT(user_id) DO UPDATE SET status=EXCLUDED.status, expires_at=EXCLUDED.expires_at, updated_at=EXCLUDED.updated_at;
  INSERT INTO public.member_moderation_actions(target_user_id,moderator_user_id,action,reason)
  VALUES(p_target_user_id,auth.uid(),p_action,btrim(p_reason));
  RETURN jsonb_build_object('status',v_status,'expires_at',v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_members(p_search text DEFAULT '',p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.require_admin();
  IF p_page IS NULL OR p_page<1 OR p_page>100000 OR p_search IS NULL OR length(p_search)>100 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid pagination';
  END IF;
  WITH filtered AS (
    SELECT p.id,p.display_name,p.created_at,p.role,p.tandem_enabled,
      coalesce(s.status,'active') AS moderation_status,s.expires_at AS moderation_expires_at
    FROM public.profiles p LEFT JOIN public.member_moderation_states s ON s.user_id=p.id
    WHERE strpos(lower(coalesce(p.display_name,'')),lower(btrim(p_search)))>0 OR btrim(p_search)=''
  ), page AS (
    SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25
  ), rows AS (
    SELECT p.*,public.admin_profile_complete(p.id) AS profile_complete,
      (SELECT count(*) FROM public.posts WHERE author_id=p.id) AS posts,
      (SELECT count(*) FROM public.comments WHERE author_id=p.id) AS comments FROM page p
  )
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'rows',
    (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY created_at DESC,id),'[]'::jsonb) FROM rows r)) INTO result;
  RETURN result;
END;
$$;

-- The Auth hook runs before a new Auth user and profile can be created.
CREATE OR REPLACE FUNCTION public.hook_block_recently_withdrawn_email(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_email text := lower(btrim(coalesce(event->'user'->>'email','')));
  v_secret text;
  v_hmac text;
BEGIN
  IF v_email = '' THEN RETURN '{}'::jsonb; END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='withdrawal_rejoin_hmac_key';
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'withdrawal rejoin block secret is not configured';
  END IF;
  v_hmac := encode(extensions.hmac(convert_to(v_email,'utf8'), convert_to(v_secret,'utf8'), 'sha256'),'hex');
  IF EXISTS (SELECT 1 FROM public.withdrawal_rejoin_blocks WHERE email_hmac=v_hmac AND expires_at>now()) THEN
    RETURN jsonb_build_object('error',jsonb_build_object('http_code',403,'message','This email cannot register yet.'));
  END IF;
  RETURN '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_withdrawal_rejoin_blocks()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.withdrawal_rejoin_blocks WHERE expires_at <= now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Block direct Data API access for moderated accounts. Existing permissive
-- owner/admin policies still decide what an active member may do.
CREATE POLICY "Moderated members cannot use profiles" ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.current_member_is_active())) WITH CHECK ((SELECT public.current_member_is_active()));
CREATE POLICY "Moderated members cannot use posts" ON public.posts AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.current_member_is_active())) WITH CHECK ((SELECT public.current_member_is_active()));
CREATE POLICY "Moderated members cannot use comments" ON public.comments AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.current_member_is_active())) WITH CHECK ((SELECT public.current_member_is_active()));
CREATE POLICY "Moderated members cannot use messages" ON public.messages AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.current_member_is_active())) WITH CHECK ((SELECT public.current_member_is_active()));
CREATE POLICY "Moderated members cannot use likes" ON public.post_likes AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.current_member_is_active())) WITH CHECK ((SELECT public.current_member_is_active()));
CREATE POLICY "Moderated members cannot use notifications" ON public.notifications AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.current_member_is_active())) WITH CHECK ((SELECT public.current_member_is_active()));

-- Add the six-month re-registration block before permanently deleting Auth.
CREATE OR REPLACE FUNCTION public.withdraw_member(p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  p_user_id uuid := auth.uid();
  v_email text;
  v_secret text;
  v_hmac text;
BEGIN
  IF p_user_id IS NULL OR p_mode IS NULL OR p_mode NOT IN ('preserve','remove') THEN RAISE EXCEPTION 'Invalid withdrawal request'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND OR v_email IS NULL THEN RAISE EXCEPTION 'Account does not exist'; END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='withdrawal_rejoin_hmac_key';
  IF v_secret IS NULL OR v_secret='' THEN RAISE EXCEPTION 'Withdrawal rejoin block secret is not configured'; END IF;
  v_hmac := encode(extensions.hmac(convert_to(lower(btrim(v_email)),'utf8'), convert_to(v_secret,'utf8'), 'sha256'),'hex');
  INSERT INTO public.withdrawal_rejoin_blocks(email_hmac,expires_at)
  VALUES(v_hmac,now()+interval '6 months')
  ON CONFLICT(email_hmac) DO UPDATE SET expires_at=GREATEST(public.withdrawal_rejoin_blocks.expires_at,EXCLUDED.expires_at);
  LOCK TABLE public.posts, public.comments, public.messages, public.post_likes, public.notifications IN SHARE ROW EXCLUSIVE MODE;
  UPDATE public.posts SET author_id=NULL, author_name='탈퇴한 회원 / Ehemaliges Mitglied',
    title=CASE WHEN p_mode='remove' THEN '삭제된 글 / Gelöschter Beitrag' ELSE title END,
    content=CASE WHEN p_mode='remove' THEN '탈퇴한 회원이 삭제한 내용입니다. / Vom ehemaligen Mitglied entfernt.' ELSE content END,
    region=CASE WHEN p_mode='remove' THEN NULL ELSE region END, city=CASE WHEN p_mode='remove' THEN NULL ELSE city END,
    target_field=CASE WHEN p_mode='remove' THEN NULL ELSE target_field END WHERE author_id=p_user_id;
  UPDATE public.comments SET author_id=NULL, author_name='탈퇴한 회원 / Ehemaliges Mitglied',
    content=CASE WHEN p_mode='remove' THEN '탈퇴한 회원이 삭제한 내용입니다. / Vom ehemaligen Mitglied entfernt.' ELSE content END WHERE author_id=p_user_id;
  PERFORM set_config('germanhanguk.withdrawal','on',true);
  UPDATE public.messages SET sender_id=CASE WHEN sender_id=p_user_id THEN NULL ELSE sender_id END,
    receiver_id=CASE WHEN receiver_id=p_user_id THEN NULL ELSE receiver_id END WHERE sender_id=p_user_id OR receiver_id=p_user_id;
  PERFORM set_config('germanhanguk.withdrawal','off',true);
  DELETE FROM public.post_likes WHERE user_id=p_user_id;
  DELETE FROM public.notifications WHERE recipient_id=p_user_id OR actor_id=p_user_id;
  INSERT INTO public.member_lifecycle_events(event_type,metadata) VALUES('withdrawal',jsonb_build_object('mode',p_mode));
  DELETE FROM auth.users WHERE id=p_user_id;
END;
$$;

ALTER FUNCTION public.current_member_is_active() OWNER TO postgres;
ALTER FUNCTION public.admin_set_member_moderation(uuid,text,text) OWNER TO postgres;
ALTER FUNCTION public.hook_block_recently_withdrawn_email(jsonb) OWNER TO postgres;
ALTER FUNCTION public.purge_expired_withdrawal_rejoin_blocks() OWNER TO postgres;
ALTER FUNCTION public.withdraw_member(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.current_member_is_active(), public.admin_set_member_moderation(uuid,text,text), public.hook_block_recently_withdrawn_email(jsonb), public.purge_expired_withdrawal_rejoin_blocks() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_member_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_member_moderation(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_member(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hook_block_recently_withdrawn_email(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.purge_expired_withdrawal_rejoin_blocks() TO service_role;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
COMMIT;
