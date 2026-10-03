BEGIN;
-- Deliberately anonymous: no account key, free-form JSON or identifying metadata.
CREATE TABLE public.member_lifecycle_events (
  event_type text NOT NULL CHECK (event_type IN ('signup','withdrawal')),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    metadata = '{}'::jsonb OR (event_type='withdrawal' AND metadata IN ('{"mode":"preserve"}'::jsonb,'{"mode":"remove"}'::jsonb)))
);
CREATE INDEX member_lifecycle_time_idx ON public.member_lifecycle_events(created_at);
CREATE TABLE public.member_lifecycle_tracking (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  started_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.member_lifecycle_tracking DEFAULT VALUES;
ALTER TABLE public.member_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_lifecycle_tracking ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_lifecycle_events, public.member_lifecycle_tracking FROM PUBLIC, anon, authenticated, service_role;
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
  INSERT INTO public.member_lifecycle_events(event_type) VALUES ('signup');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
CREATE FUNCTION public.require_admin() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Admin access required';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.require_admin() FROM PUBLIC, anon, authenticated, service_role;

-- Match hasCommunityIdentity without returning auth metadata or private details.
CREATE FUNCTION public.admin_profile_complete(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT coalesce(
  length(btrim(p.display_name)) BETWEEN 2 AND 30 AND p.display_name !~ '[[:cntrl:]]' AND
  CASE WHEN jsonb_typeof(u.raw_user_meta_data->'community_profile_completed')='boolean'
    THEN (u.raw_user_meta_data->>'community_profile_completed')::boolean
    WHEN (coalesce(u.raw_app_meta_data->>'provider','') <> 'google' AND
          nullif(btrim(u.raw_user_meta_data->>'display_name'),'') IS NOT NULL)
          OR nullif(btrim(p.region),'') IS NOT NULL THEN true
    ELSE btrim(p.display_name) <> ALL(ARRAY[
      coalesce(btrim(u.raw_user_meta_data->>'display_name'),''),coalesce(btrim(u.raw_user_meta_data->>'full_name'),''),
      coalesce(btrim(u.raw_user_meta_data->>'name'),''),coalesce(btrim(u.raw_user_meta_data->>'nickname'),''),
      coalesce(btrim(u.raw_user_meta_data->>'preferred_username'),''),coalesce(split_part(u.email,'@',1),''),
      U&'\D68C\C6D0-' || left(u.id::text,8)]) END,false)
FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.id=p_id;
$$;
REVOKE ALL ON FUNCTION public.admin_profile_complete(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admin_dashboard() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; day_start timestamptz := date_trunc('day',now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin';
BEGIN
  PERFORM public.require_admin();
  SELECT jsonb_build_object(
    'tracked_since',(SELECT started_at FROM public.member_lifecycle_tracking),
    'active_members',(SELECT count(*) FROM public.profiles),
    'tandem_enabled',(SELECT count(*) FROM public.profiles WHERE tandem_enabled),
    'lifecycle',(SELECT jsonb_agg(jsonb_build_object('days',w.days,'signups',
      (SELECT count(*) FROM public.member_lifecycle_events WHERE event_type='signup' AND created_at>=w.since),
      'withdrawals',(SELECT count(*) FROM public.member_lifecycle_events WHERE event_type='withdrawal' AND created_at>=w.since)))
      FROM (VALUES(1,day_start),(7,now()-interval '7 days'),(30,now()-interval '30 days')) w(days,since)),
    'activity',(SELECT jsonb_agg(jsonb_build_object('days',w.days,
      'posts',(SELECT count(*) FROM public.posts WHERE created_at>=w.since),
      'comments',(SELECT count(*) FROM public.comments WHERE created_at>=w.since)))
      FROM (VALUES(1,day_start),(7,now()-interval '7 days')) w(days,since)),
    'articles',(SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='draft' AND review_status='pending'),
      'draft',count(*) FILTER(WHERE status='draft'),'approved',count(*) FILTER(WHERE review_status='approved'),'published',count(*) FILTER(WHERE status='published'),'rejected',count(*) FILTER(WHERE status='draft' AND review_status='rejected')) FROM public.articles),
    'contacts',(SELECT jsonb_build_object('new',count(*) FILTER(WHERE status='new'),
      'open',count(*) FILTER(WHERE status IN ('new','in_progress')),'in_progress',count(*) FILTER(WHERE status='in_progress'),'closed',count(*) FILTER(WHERE status='closed')) FROM public.contact_requests WHERE delete_after>now()),
    'recent_signups',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM
      (SELECT id,display_name,created_at FROM public.profiles ORDER BY created_at DESC,id LIMIT 8) r)
  ) INTO result;
  RETURN result;
END $$;

CREATE FUNCTION public.admin_members(p_search text DEFAULT '',p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.require_admin();
  IF p_page IS NULL OR p_page<1 OR p_page>100000 OR p_search IS NULL OR length(p_search)>100 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid pagination';
  END IF;
  WITH filtered AS (SELECT id,display_name,created_at,role,tandem_enabled FROM public.profiles
    WHERE strpos(lower(coalesce(display_name,'')),lower(btrim(p_search)))>0 OR btrim(p_search)=''),
  page AS (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25),
  rows AS (SELECT p.*,public.admin_profile_complete(p.id) AS profile_complete,
    (SELECT count(*) FROM public.posts WHERE author_id=p.id) AS posts,
    (SELECT count(*) FROM public.comments WHERE author_id=p.id) AS comments FROM page p)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'rows',
    (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY created_at DESC,id),'[]'::jsonb) FROM rows r)) INTO result;
  RETURN result;
END $$;

CREATE FUNCTION public.admin_community() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN jsonb_build_object('categories',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM
    (SELECT p.category,count(*) AS posts,count(*) FILTER(WHERE p.author_id IS NULL) AS withdrawn_posts,
      sum((SELECT count(*) FROM public.comments c WHERE c.post_id=p.id)) AS comments FROM public.posts p GROUP BY p.category ORDER BY p.category) r),
    'recent_posts',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM
      (SELECT id,title,category,created_at,author_id IS NULL AS withdrawn FROM public.posts ORDER BY created_at DESC,id DESC LIMIT 20) r),
    'withdrawn_posts',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM
      (SELECT p.id,p.title,p.created_at,NOT EXISTS(SELECT 1 FROM public.comments c WHERE c.post_id=p.id AND c.author_id IS NOT NULL) AS cleanup_eligible
       FROM public.posts p WHERE author_id IS NULL ORDER BY created_at DESC,id DESC LIMIT 50) r));
END $$;

CREATE FUNCTION public.admin_contacts(p_page integer DEFAULT 1,p_status text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM public.require_admin();
  IF p_page IS NULL OR p_page<1 OR p_page>100000 OR p_status IS NULL OR p_status NOT IN ('','new','in_progress','closed') THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid pagination';
  END IF;
  RETURN jsonb_build_object('total',(SELECT count(*) FROM public.contact_requests WHERE delete_after>now() AND (p_status='' OR status=p_status)),
    'rows',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM
      (SELECT id,category,status,created_at FROM public.contact_requests WHERE delete_after>now() AND (p_status='' OR status=p_status)
       ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25) r));
END $$;
CREATE FUNCTION public.admin_contact_detail(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.require_admin();
  SELECT jsonb_build_object('id',id,'category',category,'subject',subject,'name',name,'email',email,'message',message,'status',status,'created_at',created_at)
    INTO result FROM public.contact_requests WHERE id=p_id AND delete_after>now();
  IF result IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Contact not found'; END IF;
  RETURN result;
END $$;
CREATE FUNCTION public.admin_contact_status(p_id uuid,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM public.require_admin();
  IF p_status IS NULL OR p_status NOT IN ('new','in_progress','closed') THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid status';
  END IF;
  UPDATE public.contact_requests SET status=p_status WHERE id=p_id AND delete_after>now();
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Contact not found'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.withdraw_member(p_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p_user_id uuid := auth.uid();
BEGIN
  IF p_user_id IS NULL OR p_mode IS NULL OR p_mode NOT IN ('preserve', 'remove') THEN
    RAISE EXCEPTION 'Invalid withdrawal request';
  END IF;
  PERFORM 1 FROM auth.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account does not exist'; END IF;
  -- Block concurrent inserts/updates until detachment and account deletion end.
  LOCK TABLE public.posts, public.comments, public.messages,
    public.post_likes, public.notifications IN SHARE ROW EXCLUSIVE MODE;
  UPDATE public.posts SET author_id = NULL,
    author_name = '탈퇴한 회원 / Ehemaliges Mitglied',
    title = CASE WHEN p_mode = 'remove' THEN '삭제된 글 / Gelöschter Beitrag' ELSE title END,
    content = CASE WHEN p_mode = 'remove' THEN '탈퇴한 회원이 삭제한 내용입니다. / Vom ehemaligen Mitglied entfernt.' ELSE content END,
    region = CASE WHEN p_mode = 'remove' THEN NULL ELSE region END,
    city = CASE WHEN p_mode = 'remove' THEN NULL ELSE city END,
    target_field = CASE WHEN p_mode = 'remove' THEN NULL ELSE target_field END
    WHERE author_id = p_user_id;
  UPDATE public.comments SET author_id = NULL,
    author_name = '탈퇴한 회원 / Ehemaliges Mitglied',
    content = CASE WHEN p_mode = 'remove' THEN '탈퇴한 회원이 삭제한 내용입니다. / Vom ehemaligen Mitglied entfernt.' ELSE content END
    WHERE author_id = p_user_id;
  PERFORM set_config('germanhanguk.withdrawal', 'on', true);
  UPDATE public.messages SET
    sender_id = CASE WHEN sender_id = p_user_id THEN NULL ELSE sender_id END,
    receiver_id = CASE WHEN receiver_id = p_user_id THEN NULL ELSE receiver_id END
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  PERFORM set_config('germanhanguk.withdrawal', 'off', true);
  DELETE FROM public.post_likes WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE recipient_id = p_user_id OR actor_id = p_user_id;
  -- Private details, reputation ledger/totals and read rewards cascade only
  -- from this profile. Editorial guides retain their existing SET NULL FK.
  INSERT INTO public.member_lifecycle_events(event_type,metadata) VALUES('withdrawal',jsonb_build_object('mode',p_mode));
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
ALTER FUNCTION public.withdraw_member(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.withdraw_member(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_member(text) TO authenticated;

ALTER FUNCTION public.admin_dashboard() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_dashboard() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_dashboard() TO authenticated;
ALTER FUNCTION public.admin_members(text,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_members(text,integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_members(text,integer) TO authenticated;
ALTER FUNCTION public.admin_community() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_community() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_community() TO authenticated;
ALTER FUNCTION public.admin_contacts(integer,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_contacts(integer,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_contacts(integer,text) TO authenticated;
ALTER FUNCTION public.admin_contact_detail(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_contact_detail(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_contact_detail(uuid) TO authenticated;
ALTER FUNCTION public.admin_contact_status(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_contact_status(uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_contact_status(uuid,text) TO authenticated;
COMMIT;
