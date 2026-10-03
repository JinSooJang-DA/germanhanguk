"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getKCultureEmbed, getKCultureTopicLabel, K_CULTURE_CATEGORY, K_CULTURE_TOPICS } from "@/lib/kCulture";
import type { Post } from "@/types/post";
import SocialEmbedCard from "@/components/SocialEmbedCard";
import { formatDate } from "@/lib/date";
type FeedPost = Post & { comments?: { count: number }[]; post_likes?: { count: number }[] };
export default function KCulturePage() {
  const [posts, setPosts] = useState<FeedPost[]>([]); const [topic, setTopic] = useState("all"); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  useEffect(() => { let current = true; const request = supabase.from("posts").select("*, comments(count), post_likes(count)").eq("category", K_CULTURE_CATEGORY).order("created_at", { ascending: false }).limit(36); if (topic !== "all") request.eq("sub_category", topic); request.then(({ data, error: requestError }) => { if (!current) return; setPosts((data || []) as FeedPost[]); setError(Boolean(requestError)); setLoading(false); }); return () => { current = false; }; }, [topic]);
  const cards = useMemo(() => posts.map((post) => ({ post, embed: getKCultureEmbed(post.media_url || post.content.match(/https?:\/\/[^\s]+/)?.[0] || "") })), [posts]);
  return <main className="kculture-page"><section className="kculture-hero kculture-feed-hero"><span className="kculture-kicker">GERMANY ↔ KOREA</span><h1>Korea erleben.<br />Weitererzählen.</h1><p>Musik, Essen, Reisen und die kleinen Momente dazwischen — von Menschen für Menschen, die Korea entdecken möchten.</p><Link className="kculture-primary-cta" href="/k-culture/new">K-Culture teilen →</Link></section>
    <nav className="kculture-topics" aria-label="K-Culture Kategorien"><button className={topic === "all" ? "is-active" : ""} onClick={() => setTopic("all")}>Alles</button>{K_CULTURE_TOPICS.map((item) => <button className={topic === item.value ? "is-active" : ""} onClick={() => setTopic(item.value)} key={item.value}>{item.label}</button>)}</nav>
    {loading ? <p className="kculture-feed-state">Der Feed wird geladen …</p> : error ? <p className="kculture-feed-state">Der Feed konnte gerade nicht geladen werden. Bitte versuche es später erneut.</p> : cards.length === 0 ? <section className="kculture-empty"><h2>Noch keine Beiträge in dieser Kategorie.</h2><p>Sei die erste Person, die einen besonderen Korea-Moment teilt.</p><Link href="/k-culture/new">Ersten Link teilen →</Link></section> : <section className="kculture-feed" aria-label="K-Culture Feed">{cards.map(({ post, embed }) => <article className="kculture-media-card" key={post.id}><div className="kculture-media-card__preview">{embed ? <SocialEmbedCard embed={embed} /> : <a href={post.media_url || "#"} target="_blank" rel="noopener noreferrer nofollow ugc" className="kculture-media-fallback">Externe Inhalte ansehen ↗</a>}</div><div className="kculture-media-card__body"><span>{getKCultureTopicLabel(post.sub_category)}</span><h2><Link href={`/posts/${post.id}?returnTo=${encodeURIComponent("/k-culture")}`}>{post.title}</Link></h2><p>{post.content.replace(/^https?:\/\/[^\s]+\s*/i, "").trim()}</p><footer><span>{post.author_name} · {formatDate(post.created_at)}</span><Link href={`/posts/${post.id}?returnTo=${encodeURIComponent("/k-culture")}#comments`}>♡ {post.post_likes?.[0]?.count || 0} · Kommentare {post.comments?.[0]?.count || 0}</Link></footer></div></article>)}</section>}
  </main>;
}
