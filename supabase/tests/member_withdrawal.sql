-- Run after the member withdrawal migration; fixtures always roll back.
BEGIN;
DO $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); p bigint; c uuid := gen_random_uuid(); r uuid := gen_random_uuid(); m uuid := gen_random_uuid(); mode text;
BEGIN
  IF has_function_privilege('authenticated','public.withdraw_member(uuid,text)','EXECUTE') OR has_function_privilege('anon','public.withdraw_member(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'RPC exposed'; END IF;
  FOREACH mode IN ARRAY ARRAY['preserve','remove'] LOOP
    a := gen_random_uuid(); b := gen_random_uuid(); c := gen_random_uuid(); r := gen_random_uuid(); m := gen_random_uuid();
    INSERT INTO auth.users(id) VALUES(a),(b);
    INSERT INTO public.profiles(id,display_name) VALUES(a,'closing'),(b,'remaining') ON CONFLICT(id) DO NOTHING;
    INSERT INTO public.posts(author_id,author_name,title,content,category) VALUES(a,'closing','original title','original body','free') RETURNING id INTO p;
    INSERT INTO public.comments(id,post_id,author_id,author_name,content) VALUES(c,p,a,'closing','original comment');
    INSERT INTO public.comments(id,post_id,parent_id,author_id,author_name,content) VALUES(r,p,c,b,'remaining','reply');
    INSERT INTO public.messages(id,sender_id,receiver_id,body) VALUES(m,a,b,'private message');
    INSERT INTO public.messages(sender_id,receiver_id,body) VALUES(b,a,'outgoing message');
    PERFORM public.withdraw_member(a,mode);
    IF EXISTS(SELECT 1 FROM auth.users WHERE id=a) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=a) THEN RAISE EXCEPTION 'Identity retained'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.comments WHERE id=r AND parent_id=c AND content='reply' AND author_id=b) THEN RAISE EXCEPTION 'Reply lost'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.messages WHERE id=m AND sender_id IS NULL AND receiver_id=b AND body='private message') THEN RAISE EXCEPTION 'Mailbox lost'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.messages WHERE sender_id=b AND receiver_id IS NULL AND body='outgoing message') THEN RAISE EXCEPTION 'Sent mailbox lost'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.posts WHERE id=p AND author_id IS NULL AND ((mode='preserve' AND content='original body') OR (mode='remove' AND content<>'original body'))) THEN RAISE EXCEPTION 'Retention failed'; END IF;
    UPDATE public.messages SET read_at=now() WHERE id=m;
    BEGIN
      UPDATE public.messages SET body='tampered' WHERE id=m;
      RAISE EXCEPTION 'Message protection failed';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM='Message protection failed' THEN RAISE; END IF;
    END;
  END LOOP;
END $$;
ROLLBACK;
