import type {
  ArticleCandidate,
  ArticleRelevanceClassification,
  ArticleRelevanceResult,
} from "./types";

interface TopicSignal {
  topic: string;
  keywords: string[];
  strength: "broad" | "standard" | "strong";
}

const POSITIVE_TOPIC_SIGNALS: TopicSignal[] = [
  {
    topic: "immigration-residence",
    strength: "strong",
    keywords: [
      "aufenthaltstitel",
      "aufenthaltserlaubnis",
      "niederlassungserlaubnis",
      "einbürgerung",
      "einbuergerung",
      "einwanderung",
      "migration",
      "visum",
      "visa",
      "anmeldung",
      "integrationskurs",
      "sprachkurs",
      "fachkräfteeinwanderung",
      "fachkraefteeinwanderung",
      "ausländerbehörde",
      "auslaenderbehoerde",
      "staatsangehörigkeit",
      "staatsangehoerigkeit",
      "anerkennung ausländischer",
    ],
  },
  {
    topic: "tax-work",
    strength: "strong",
    keywords: [
      "einkommensteuer",
      "lohnsteuer",
      "energiesteuer",
      "mehrwertsteuer",
      "umsatzsteuer",
      "steuererklärung",
      "steuererklaerung",
      "steuerfreibetrag",
      "grundfreibetrag",
      "pendlerpauschale",
      "mindestlohn",
      "arbeitsrecht",
      "arbeitszeit",
      "arbeitsbedingungen",
      "arbeitslosengeld",
      "fachkräfte",
      "fachkraefte",
      "ausbildung",
      "bundesagentur für arbeit",
    ],
  },
  {
    topic: "health-social-insurance",
    strength: "strong",
    keywords: [
      "krankenkasse",
      "krankenversicherung",
      "pflegeversicherung",
      "pflege",
      "sozialversicherung",
      "rente",
      "rentner",
      "beitragssatz",
      "pflegegeld",
      "e-rezept",
      "elektronische patientenakte",
      "apothekenversorgung",
      "gesetzliche krankenversicherung",
      "zuzahlung",
    ],
  },
  {
    topic: "family-support",
    strength: "strong",
    keywords: ["kindergeld", "elterngeld", "kinderzuschlag", "familienleistung", "kita", "kinderbetreuung", "ganztag", "elternzeit", "mutterschutz"],
  },
  {
    topic: "housing-living-costs",
    strength: "strong",
    keywords: [
      "mietrecht",
      "mietpreisbremse",
      "wohngeld",
      "miete",
      "wohnung",
      "wohnungsmarkt",
      "heizkosten",
      "energiekosten",
      "strompreis",
      "gaspreis",
      "mietvertrag",
      "mieter",
      "wohnraum",
      "sozialer wohnungsbau",
      "nebenkosten",
    ],
  },
  {
    topic: "transport-tickets-costs",
    strength: "strong",
    keywords: [
      "deutschlandticket",
      "fahrpreis",
      "ticketpreis",
      "tarif",
      "beförderungsbedingungen",
      "befoerderungsbedingungen",
    ],
  },
  {
    topic: "driving-license",
    strength: "strong",
    keywords: ["führerschein", "fuehrerschein", "fahrerlaubnis", "fahrzeugschein", "kfz-zulassung", "hauptuntersuchung"],
  },
  {
    topic: "transport-general",
    strength: "broad",
    keywords: [
      "nahverkehr",
      "öffentlicher verkehr",
      "oeffentlicher verkehr",
      "verkehrsverbund",
      "bahn",
      "bus",
      "zug",
    ],
  },
  {
    topic: "education",
    strength: "strong",
    keywords: ["universität", "universitaet", "hochschule", "studium", "bafög", "bafoeg", "student", "schule", "schulabschluss", "berufsabschluss", "anerkennung von abschlüssen", "anerkennung von abschluessen"],
  },
  {
    topic: "consumer-finance-infrastructure",
    strength: "standard",
    keywords: [
      "verbraucherschutz",
      "widerruf",
      "bankkonto",
      "girokonto",
      "überweisung",
      "ueberweisung",
      "telekommunikation",
      "internetanschluss",
      "postdienst",
      "verbraucherrecht",
      "gewährleistung",
      "gewaehrleistung",
      "fluggast",
      "inkasso",
      "onlinekauf",
      "vorsorgeregister",
    ],
  },
  {
    topic: "public-service-change",
    strength: "standard",
    keywords: ["leistungsanspruch", "sozialleistung", "behördengang", "behoerdengang", "öffentliche verwaltung", "oeffentliche verwaltung"],
  },
];

const NEGATIVE_SIGNALS: TopicSignal[] = [
  {
    topic: "foreign-military",
    strength: "standard",
    keywords: ["bundeswehr", "militär", "militaer", "seeschifffahrt", "südsudan", "sudan", "rotes meer"],
  },
  {
    topic: "diplomacy-ceremony",
    strength: "standard",
    keywords: ["staatsbesuch", "gipfeltreffen", "normalisierungsgespräch", "empfang", "gedenkfeier", "festakt", "rede des bundeskanzlers"],
  },
];

function normalizedCandidateText(candidate: ArticleCandidate): string {
  // Do not include sourceName: provider names such as "Verbraucherschutz" or
  // "Migration" would otherwise make every item from that source look relevant.
  return [candidate.title, candidate.summary]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

function matchSignals(text: string, signals: TopicSignal[]): TopicSignal[] {
  return signals.filter((signal) => signal.keywords.some((keyword) => text.includes(keyword)));
}

/**
 * Low-cost, explainable triage only. It intentionally preserves uncertain
 * candidates instead of discarding policy changes that lack a precise keyword.
 */
export function classifyArticleRelevance(candidate: ArticleCandidate): ArticleRelevanceResult {
  const text = normalizedCandidateText(candidate);
  const bmfProfessionalOnly = candidate.sourceProvider === "bmf-tax" && [
    "umsatzsteuer-umrechnungskurse", "körperschaftsteuer-handbuch", "koerperschaftsteuer-handbuch",
    "ao-handbuch", "kassenmäßige steuereinnahmen", "kassenmaessige steuereinnahmen",
    "bfh-entscheidungen", "bmf-schreiben", "pensionsrückstellungen", "pensionsrueckstellungen",
    "netzwerk empirische steuerforschung",
  ].some((keyword) => text.includes(keyword));
  if (bmfProfessionalOnly) {
    return { classification: "irrelevant", matchedTopics: ["tax-professional-material"], reasons: ["negative:tax-professional-material"] };
  }
  const positiveSignals = matchSignals(text, POSITIVE_TOPIC_SIGNALS);
  const negativeSignals = matchSignals(text, NEGATIVE_SIGNALS);
  const strongPositiveSignals = positiveSignals.filter((signal) => signal.strength === "strong");
  const standardPositiveSignals = positiveSignals.filter((signal) => signal.strength === "standard");
  const broadPositiveSignals = positiveSignals.filter((signal) => signal.strength === "broad");
  const matchedTopics = [...positiveSignals, ...negativeSignals].map((signal) => signal.topic);
  const reasons = [
    ...positiveSignals.map((signal) => `positive:${signal.topic}`),
    ...negativeSignals.map((signal) => `negative:${signal.topic}`),
  ];

  let classification: ArticleRelevanceClassification;

  if (strongPositiveSignals.length > 0) {
    classification = "relevant";
  } else if (standardPositiveSignals.length > 0 && negativeSignals.length === 0) {
    classification = "relevant";
  } else if (broadPositiveSignals.length > 0 && negativeSignals.length === 0) {
    classification = "uncertain";
  } else if (negativeSignals.length > 0 && positiveSignals.length === 0) {
    classification = "irrelevant";
  } else {
    classification = "uncertain";
  }

  return {
    classification,
    matchedTopics,
    reasons: reasons.length > 0 ? reasons : ["no-deterministic-topic-signal"],
  };
}
