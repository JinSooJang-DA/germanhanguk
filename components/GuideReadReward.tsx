"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { COMMUNITY_REPUTATION_ENABLED } from "@/lib/communityReputation";

const MIN_READ_MS = 20_000;
const MIN_PROGRESS = 0.6;

export default function GuideReadReward({ slug }: { slug: string }) {
  useEffect(() => {
    if (!COMMUNITY_REPUTATION_ENABLED || !slug) return;

    const storageKey = `guide-read-reward:${slug}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch {}

    let timeReady = false;
    let activeReadMs = 0;
    let progressReady = false;
    let submitting = false;
    let authChecked = false;
    let authenticated = false;
    let disposed = false;

    async function maybeReward() {
      if (disposed || submitting || !timeReady || !progressReady || document.visibilityState !== "visible") return;
      if (authChecked && !authenticated) return;
      submitting = true;
      if (!authChecked) {
        const { data: authData } = await supabase.auth.getUser();
        authChecked = true;
        authenticated = Boolean(authData.user);
      }
      if (!authenticated) { submitting = false; return; }
      const { error } = await supabase.rpc("reward_guide_read", { p_guide_slug: slug });      if (!error) {
        try { sessionStorage.setItem(storageKey, "1"); } catch {}
      }
      submitting = false;
    }

    function checkProgress() {
      const article = document.querySelector("article");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const viewed = Math.min(article.scrollHeight, Math.max(0, window.innerHeight - rect.top));
      progressReady = viewed / Math.max(1, article.scrollHeight) >= MIN_PROGRESS;
      void maybeReward();
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      activeReadMs += 1_000;
      if (activeReadMs >= MIN_READ_MS) {
        timeReady = true;
        window.clearInterval(timer);
        void maybeReward();
      }
    }, 1_000);
    function handleVisibility() { if (document.visibilityState === "visible") void maybeReward(); }
    window.addEventListener("scroll", checkProgress, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    checkProgress();

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("scroll", checkProgress);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [slug]);

  return null;
}
