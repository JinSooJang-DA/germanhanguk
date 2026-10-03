"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getKCultureEmbed, K_CULTURE_CATEGORY, K_CULTURE_TOPICS, type KCultureTopic } from "@/lib/kCulture";

const MAX_TITLE = 120;
const MAX_INTRO = 700;

export default function NewKCulturePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState(""); const [intro, setIntro] = useState(""); const [url, setUrl] = useState("");
  const [topic, setTopic] = useState<KCultureTopic>("k-pop"); const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => { if (!session) router.replace("/auth"); else setLoading(false); }).catch(() => setMessage("Deine Anmeldung konnte nicht geprüft werden.")); }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const cleanTitle = title.trim(); const cleanIntro = intro.trim(); const embed = getKCultureEmbed(url);
    if (!cleanTitle || cleanTitle.length > MAX_TITLE) return setMessage(`Bitte gib einen Titel mit höchstens ${MAX_TITLE} Zeichen ein.`);
    if (!cleanIntro || cleanIntro.length > MAX_INTRO) return setMessage(`Bitte schreibe eine Einführung mit höchstens ${MAX_INTRO} Zeichen.`);
    if (!embed) return setMessage("Bitte nutze einen gültigen YouTube-, Instagram- oder TikTok-Link.");
    setSubmitting(true); setMessage(""); const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", session.user.id).single();
    const authorName = profile?.display_name || session.user.email?.split("@")[0] || "Mitglied";
    const { data, error } = await supabase.from("posts").insert({ title: cleanTitle, content: `${embed.sourceUrl}\n\n${cleanIntro}`, category: K_CULTURE_CATEGORY, sub_category: topic, region: null, author_id: session.user.id, author_name: authorName, media_url: embed.sourceUrl, media_platform: embed.provider }).select("id").single();
    if (error) { setMessage("Der Beitrag konnte nicht veröffentlicht werden: " + error.message); setSubmitting(false); return; }
    router.push(`/posts/${data.id}?returnTo=${encodeURIComponent("/k-culture")}`); router.refresh();
  }
  if (loading) return <main className="kculture-page"><p>Deine Anmeldung wird geprüft …</p></main>;
  return <main className="kculture-page kculture-compose"><Link href="/k-culture" className="back-link">← Zurück zum Feed</Link><h1>Etwas aus Korea teilen</h1><p>Teile einen Link und erzähle kurz, warum er sehenswert ist. Videos werden nicht auf German Hanguk hochgeladen.</p><form onSubmit={submit} className="post-form" noValidate>
    <label>Link <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" required /></label><small>Unterstützt: YouTube, Instagram und TikTok. Externe Inhalte werden nur nach deiner Zustimmung geladen.</small>
    <label>Kategorie <select value={topic} onChange={(e) => setTopic(e.target.value as KCultureTopic)}>{K_CULTURE_TOPICS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
    <label>Titel <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_TITLE} required /></label><label>Kurz vorgestellt <textarea value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={MAX_INTRO} rows={5} required placeholder="Was macht diesen Beitrag besonders?" /></label>
    {message && <p className="form-message">{message}</p>}<button className="submit-btn" disabled={submitting}>{submitting ? "Wird veröffentlicht …" : "Im Feed teilen"}</button>
  </form></main>;
}
