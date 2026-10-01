import "server-only";

import type { ArticleDraftEvidence, GeneratedArticleDraft } from "./draft";
import type { ArticleDraftGenerator } from "./generator";
import { buildArticleDraftPrompt } from "./prompt";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";

function requiredApiKey(): string {
  const value = process.env.GEMINI_API_KEY?.trim();
  if (!value) throw new Error("Gemini API key is not configured.");
  return value;
}

function responseText(payload: unknown): string {
  const value = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return value.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

export class GeminiArticleDraftGenerator implements ArticleDraftGenerator {
  async generate(evidence: ArticleDraftEvidence): Promise<GeneratedArticleDraft> {
    const apiKey = requiredApiKey();
    const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
    const prompt = buildArticleDraftPrompt(evidence);
    let response: Response | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: "user", parts: [{ text: prompt.user }] }],
        }),
      });
      if (response.ok) break;
      if (![429, 503].includes(response.status) || attempt === 3) {
        throw new Error(`Gemini draft generation failed (${response.status}).`);
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }

    if (!response?.ok) throw new Error("Gemini draft generation failed after retries.");
    const text = responseText(await response.json());
    if (!text) throw new Error("Gemini returned no draft content.");
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(jsonText) as Omit<GeneratedArticleDraft, "sourceUrls">;
    return {
      ...parsed,
      sourceUrls: [{ title: evidence.source.name, url: evidence.source.canonicalUrl }],
    };
  }
}
