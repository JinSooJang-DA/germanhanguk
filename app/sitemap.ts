import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // Supabase에서 정식 출간(published) 상태인 가이드 목록을 실시간으로 가져와 사이트맵 엔트리에 자동 주입
  const { data: guides } = await supabase
    .from("guides")
    .select("slug, updated_at")
    .eq("status", "published");

  const guideEntries = (guides || []).map(function(guide) {
    return {
      url: SITE_URL + "/guide/" + guide.slug,
      lastModified: new Date(guide.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
  });

  // 코어 정적 및 허브 페이지 정의
  const staticPages = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: SITE_URL + "/guide",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/insurance",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/housing",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/visa-residence",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/taxes",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/jobs",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/education",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/driving",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/german-life",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/korean-life",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/language",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: SITE_URL + "/guide/culture-travel",
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
  ];

  return [...staticPages, ...guideEntries];
}
