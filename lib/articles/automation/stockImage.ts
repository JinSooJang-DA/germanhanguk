import type { ArticleDraftEvidence, GeneratedArticleDraft } from "./draft";
import { searchPixabayImage } from "./pixabayImage";
import { buildStockImageQuery } from "./stockImageQuery";

export interface StockImageSelection {
  imageUrl: string | null;
  sourceUrls: GeneratedArticleDraft["sourceUrls"];
}

export async function selectStockImage(
  draft: GeneratedArticleDraft,
  evidence: ArticleDraftEvidence,
): Promise<StockImageSelection> {
  const query = buildStockImageQuery(draft.category, evidence.relevance.matchedTopics, evidence.facts.headline);
  const image = await searchPixabayImage(query);
  if (!image) return { imageUrl: null, sourceUrls: draft.sourceUrls };

  return {
    imageUrl: image.imageUrl,
    sourceUrls: [
      ...draft.sourceUrls,
      {
        title: `Photo: ${image.photographer} / Pixabay`,
        url: image.photoUrl,
        kind: "image",
        photographer: image.photographer,
        photographerUrl: image.photographerUrl,
      },
    ],
  };
}
