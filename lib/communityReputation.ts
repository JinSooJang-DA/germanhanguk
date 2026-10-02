export const COMMUNITY_REPUTATION_ENABLED = process.env.NEXT_PUBLIC_COMMUNITY_REPUTATION_V1 === "true";

export type CommunityLevel = {
  key: string;
  label: string;
  icon: string;
  minXp: number;
};

export const COMMUNITY_LEVELS: CommunityLevel[] = [
  { key: "sprout", label: "독일 새싹", icon: "🌱", minXp: 0 },
  { key: "explorer", label: "정착 탐험가", icon: "🧭", minXp: 20 },
  { key: "settler", label: "정착러", icon: "🏡", minXp: 80 },
  { key: "local", label: "동네고수", icon: "⭐", minXp: 200 },
  { key: "master", label: "생활 마스터", icon: "👑", minXp: 500 },
];

export function getCommunityLevel(xp: number | null | undefined): CommunityLevel {
  const safeXp = Math.max(0, Number(xp) || 0);
  return COMMUNITY_LEVELS.reduce((current, level) => safeXp >= level.minXp ? level : current, COMMUNITY_LEVELS[0]);
}

export function formatGermanyTenure(startDate: string | null | undefined, now = new Date()): string | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || start > now) return null;

  const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
  if (days < 31) return `독일생활 ${Math.max(1, days + 1)}일차`;

  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 12) return `독일생활 ${Math.max(1, months)}개월차`;

  let years = now.getFullYear() - start.getFullYear();
  const anniversaryPassed = now.getMonth() > start.getMonth() || (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate());
  if (!anniversaryPassed) years -= 1;
  return `독일생활 ${Math.max(1, years)}년차`;
}

export const REPUTATION_REWARDS = {
  post: { xp: 3, activity: 3 },
  comment: { xp: 1, activity: 1, communication: 1 },
  firstGuideRead: { xp: 1, knowledge: 1 },
  receivedPostLike: { xp: 1, helpful: 1 },
} as const;

export function formatGermanyTenureParts(value: number | null | undefined, unit: string | null | undefined): string | null {
  const safeValue = Number(value);
  if (!Number.isFinite(safeValue) || safeValue < 1) return null;
  if (unit === "day") return `독일생활 ${safeValue}일차`;
  if (unit === "month") return `독일생활 ${safeValue}개월차`;
  if (unit === "year") return `독일생활 ${safeValue}년차`;
  return null;
}
