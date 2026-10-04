export const LANGUAGE_CATEGORY = "language-media";

export const LANGUAGE_TRACKS = [
  { value: "korean", label: "Koreanisch lernen", eyebrow: "FÜR DEUTSCHSPRACHIGE", text: "Koreanisch mit deutschsprachigen Erklärungen — von Hangul bis zu echten Alltagsausdrücken." },
  { value: "german", label: "Deutsch lernen", eyebrow: "FÜR KOREANER", text: "Deutsch für Studium, Alltag und Leben in Deutschland — verständlich auf Koreanisch erklärt." },
] as const;

export const LANGUAGE_TOPICS = [
  { value: "hangul", label: "Hangul", track: "korean" },
  { value: "aussprache-ko", label: "Aussprache", track: "korean" },
  { value: "alltagskoreanisch", label: "Alltagskoreanisch", track: "korean" },
  { value: "grammatik-ko", label: "Grammatik", track: "korean" },
  { value: "wortschatz-ko", label: "Wortschatz", track: "korean" },
  { value: "deutsch-alltag", label: "Alltagsdeutsch", track: "german" },
  { value: "studium", label: "Studium", track: "german" },
  { value: "aussprache-de", label: "Aussprache", track: "german" },
  { value: "grammatik-de", label: "Grammatik", track: "german" },
  { value: "leben-in-deutschland", label: "Leben in Deutschland", track: "german" },
] as const;

export type LanguageTrack = typeof LANGUAGE_TRACKS[number]["value"];
export type LanguageTopic = typeof LANGUAGE_TOPICS[number]["value"];
export function getLanguageTopicLabel(value?: string | null) { return LANGUAGE_TOPICS.find((item) => item.value === value)?.label ?? "Sprachen"; }
