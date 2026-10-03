import { CATEGORIES, EDUCATION_SUB_CATEGORY_OPTIONS } from "@/lib/constants";

// Only accept community list routes, never arbitrary redirect destinations.
export function getCommunityListHref(origin: string | undefined, category?: string): string {
  const fallback = CATEGORIES.some((item) => item.value === category)
    ? `/?section=community&category=${encodeURIComponent(category!)}`
    : "/?section=community";
  if (!origin || !origin.startsWith("/?")) return fallback;

  const params = new URLSearchParams(origin.slice(2));
  const originCategory = params.get("category");
  const section = params.get("section");
  if (section !== "community" && !(section === null && originCategory)) return fallback;
  if (originCategory && !CATEGORIES.some((item) => item.value === originCategory)) return fallback;

  const result = new URLSearchParams({ section: "community" });
  if (originCategory) result.set("category", originCategory);
  const topic = params.get("sub_category");
  if (originCategory === "education" && EDUCATION_SUB_CATEGORY_OPTIONS.some((item) => item.value === topic)) {
    result.set("sub_category", topic!);
  }
  return `/?${result}`;
}
