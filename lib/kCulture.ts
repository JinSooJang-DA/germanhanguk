import { getSocialEmbed, type SocialEmbed } from "@/lib/socialEmbeds";

export const K_CULTURE_CATEGORY = "k-culture";

export const K_CULTURE_TOPICS = [
  { value: "k-pop", label: "K-Pop" },
  { value: "food", label: "Food" },
  { value: "film-drama", label: "Film & Drama" },
  { value: "travel", label: "Travel" },
  { value: "alltag", label: "Alltag" },
  { value: "tradition", label: "Tradition" },
  { value: "sprache", label: "Sprache" },
  { value: "experience", label: "Experience" },
] as const;

export type KCultureTopic = typeof K_CULTURE_TOPICS[number]["value"];

export function getKCultureTopicLabel(value: string | null | undefined): string {
  return K_CULTURE_TOPICS.find((topic) => topic.value === value)?.label ?? "K-Culture";
}

export function getKCultureEmbed(value: string): SocialEmbed | null {
  return getSocialEmbed(value.trim());
}

export function isKCultureTopic(value: string): value is KCultureTopic {
  return K_CULTURE_TOPICS.some((topic) => topic.value === value);
}
