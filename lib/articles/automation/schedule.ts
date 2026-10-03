export const ARTICLE_AUTOMATION_TIMEZONE = "Europe/Berlin";
export const ARTICLE_AUTOMATION_HOURS = [8, 19] as const;

export type ArticleAutomationSlot = {
  localDate: string;
  localHour: 8 | 19;
  slotKey: string;
};

export function getBerlinArticleAutomationSlot(now: Date): ArticleAutomationSlot | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARTICLE_AUTOMATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(value.hour);
  if (hour !== 8 && hour !== 19) return null;
  const localDate = `${value.year}-${value.month}-${value.day}`;
  return { localDate, localHour: hour, slotKey: `${localDate}:${String(hour).padStart(2, "0")}` };
}
