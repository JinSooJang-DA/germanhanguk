import type { ArticleDraftEvidence, GeneratedArticleDraft } from "./draft";
import type { ArticleDraftGenerator } from "./generator";

/** Development-only deterministic generator. It makes no network or AI calls. */
export class MockArticleDraftGenerator implements ArticleDraftGenerator {
  async generate(evidence: ArticleDraftEvidence): Promise<GeneratedArticleDraft> {
    const { candidate } = evidence;
    const summary = candidate.summary?.trim() || candidate.title;

    return {
      title: `[검토용] ${candidate.title}`.slice(0, 255),
      summary: summary.slice(0, 800),
      content: `${summary}\n\n이 초안은 자동화 파이프라인 검증용이며 게시용이 아닙니다.`,
      category: "생활",
      sourceUrls: [{ title: candidate.sourceName, url: candidate.canonicalUrl }],
    };
  }
}
