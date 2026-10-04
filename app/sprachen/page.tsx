"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSocialEmbed } from "@/lib/socialEmbeds";
import SocialEmbedCard from "@/components/SocialEmbedCard";
import { formatDate } from "@/lib/date";
import { LANGUAGE_CATEGORY, LANGUAGE_TOPICS, LANGUAGE_TRACKS, getLanguageTopicLabel, type LanguageTrack } from "@/lib/languageMedia";
import type { Post } from "@/types/post";
type FeedPost = Post & { comments?: { count:number }[]; post_likes?: { count:number }[] };
export default function SprachenPage(){
 const [track,setTrack]=useState<LanguageTrack>("korean"); const [posts,setPosts]=useState<FeedPost[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{let current=true; setLoading(true); supabase.from("posts").select("*, comments(count), post_likes(count)").eq("category",LANGUAGE_CATEGORY).like("sub_category",track+":%").order("created_at",{ascending:false}).limit(36).then(({data})=>{if(current){setPosts((data||[]) as FeedPost[]);setLoading(false)}}); return()=>{current=false}},[track]);
 const cards=useMemo(()=>posts.map(post=>({post,embed:getSocialEmbed(post.media_url||post.content.match(/https?:\/\/[^\s]+/)?.[0]||"")})),[posts]);
 return <main className="kculture-page"><section className="kculture-hero"><span className="kculture-kicker">DEUTSCH ↔ KOREANISCH</span><h1>Sprachen lernen.<br/>Menschen verstehen.</h1><p>Gute Lernvideos aus YouTube, Instagram und TikTok — für beide Richtungen zwischen Deutschland und Korea.</p></section><section className="language-track-grid">{LANGUAGE_TRACKS.map(item=><button key={item.value} className={track===item.value?"is-active":""} onClick={()=>setTrack(item.value)}><small>{item.eyebrow}</small><strong>{item.label}</strong><span>{item.text}</span></button>)}</section><div className="language-feed-head"><div>{LANGUAGE_TOPICS.filter(x=>x.track===track).map(x=><span key={x.value}>{x.label}</span>)}</div><Link href={`/sprachen/new?track=${track}`}>Lernvideo teilen →</Link></div>{loading?<p className="kculture-feed-state">Der Lernfeed wird geladen …</p>:cards.length===0?<section className="kculture-empty"><h2>Hier entsteht unsere Lernsammlung.</h2><p>Wir sammeln gerade die ersten guten Videos für diesen Bereich.</p><Link href={`/sprachen/new?track=${track}`}>Ein Lernvideo empfehlen →</Link></section>:<section className="kculture-feed">{cards.map(({post,embed})=><article className="kculture-media-card" key={post.id}><div className="kculture-media-card__preview">{embed?<SocialEmbedCard embed={embed}/>:null}</div><div className="kculture-media-card__body"><span>{getLanguageTopicLabel(post.sub_category?.split(":")[1])}</span><h2><Link href={`/posts/${post.id}?returnTo=${encodeURIComponent("/sprachen")}`}>{post.title}</Link></h2><p>{post.content.replace(/^https?:\/\/[^\s]+\s*/i,"").trim()}</p><footer><span>{post.author_name} · {formatDate(post.created_at)}</span><Link href={`/posts/${post.id}#comments`}>♡ {post.post_likes?.[0]?.count||0} · Kommentare {post.comments?.[0]?.count||0}</Link></footer></div></article>)}</section>}</main>
}
