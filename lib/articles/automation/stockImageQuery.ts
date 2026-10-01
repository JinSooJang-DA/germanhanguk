const TOPIC_QUERIES: Record<string, string> = {
  "immigration-residence": "Germany city paperwork documents",
  "tax-work": "Germany office work finance",
  "health-social-insurance": "Germany healthcare insurance",
  "family-support": "family Germany home",
  "housing-living-costs": "Germany apartment housing",
  "transport-tickets-costs": "Germany public transport train",
  "driving-license": "Germany driving road car",
  "transport-general": "Germany public transport",
  education: "Germany university students campus",
  "consumer-finance-infrastructure": "Germany banking consumer",
  "public-service-change": "Germany public administration office",
};

const CATEGORY_QUERIES: Record<string, string> = {
  정책: "Germany government building", 생활: "Germany daily life city",
  교통: "Germany public transport", 교육: "Germany university campus",
  노동: "Germany workplace office", 세금: "Germany finance tax documents",
  건강: "Germany healthcare", 가족: "family Germany home", 주거: "Germany apartment housing",
};

export function buildStockImageQuery(category: string, matchedTopics: string[], headline = ""): string {
  const text = headline.toLocaleLowerCase("de-DE");
  if (/diesel|benzin|tankstelle|kraftstoff/.test(text)) return "Germany gas station fuel pump";
  if (/strom|gaspreis|energiepreis|heizkosten/.test(text)) return "Germany energy electricity home";
  for (const topic of matchedTopics) if (TOPIC_QUERIES[topic]) return TOPIC_QUERIES[topic];
  return CATEGORY_QUERIES[category] || "Germany city life";
}
