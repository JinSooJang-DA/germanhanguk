export const POST_IMAGE_BUCKET = "post-images";
export const MAX_POST_IMAGES = 5;
export const MAX_POST_IMAGE_ORIGINAL_BYTES = 10 * 1024 * 1024;
export const MAX_POST_IMAGE_STORED_BYTES = 2 * 1024 * 1024;
export const POST_IMAGE_MAX_DIMENSION = 1920;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PENDING_IMAGE_PATTERN = /\[\[이미지(\d+)\]\]/g;
const STORED_IMAGE_PATTERN = /\[\[GH_IMAGE:(https?:\/\/[^\]\s]+)\]\]/g;

export type PendingPostImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export function validatePostImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "JPG, PNG, WebP 형식의 이미지만 등록할 수 있습니다.";
  }
  if (file.size > MAX_POST_IMAGE_ORIGINAL_BYTES) {
    return "이미지 원본은 한 장당 10MB 이하만 등록할 수 있습니다.";
  }
  return null;
}

export function createPendingImage(file: File, imageNumber: number): PendingPostImage {
  return {
    id: String(imageNumber),
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function pendingImageToken(id: string): string {
  return `[[이미지${id}]]`;
}

export function storedImageToken(url: string): string {
  return `[[GH_IMAGE:${url}]]`;
}

export function getStoredImageUrls(content: string): string[] {
  return Array.from(content.matchAll(STORED_IMAGE_PATTERN), (match) => match[1]);
}

export function getPendingImageIds(content: string): string[] {
  return Array.from(content.matchAll(PENDING_IMAGE_PATTERN), (match) => match[1]);
}

export type StoredPostImageAlias = {
  id: string;
  url: string;
};

export function createEditablePostContent(content: string): {
  content: string;
  storedImages: StoredPostImageAlias[];
} {
  const storedImages: StoredPostImageAlias[] = [];
  let imageNumber = 1;
  const editableContent = content.replace(STORED_IMAGE_PATTERN, (_token, url: string) => {
    const id = String(imageNumber++);
    storedImages.push({ id, url });
    return pendingImageToken(id);
  });
  return { content: editableContent, storedImages };
}

export function restoreStoredImageTokens(
  content: string,
  storedImages: StoredPostImageAlias[],
): string {
  let restoredContent = content;
  for (const image of storedImages) {
    restoredContent = restoredContent.replaceAll(
      pendingImageToken(image.id),
      storedImageToken(image.url),
    );
  }
  return restoredContent;
}

export function stripPostImageTokens(content: string): string {
  return content
    .replace(STORED_IMAGE_PATTERN, "")
    .replace(PENDING_IMAGE_PATTERN, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function replacePendingImage(content: string, id: string, url: string): string {
  return content.replaceAll(pendingImageToken(id), storedImageToken(url));
}

export function removePendingImage(content: string, id: string): string {
  return content
    .replaceAll(pendingImageToken(id), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitPostContent(content: string): Array<
  | { type: "text"; value: string }
  | { type: "image"; url: string }
> {
  const parts: Array<{ type: "text"; value: string } | { type: "image"; url: string }> = [];
  let cursor = 0;

  for (const match of content.matchAll(STORED_IMAGE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ type: "text", value: content.slice(cursor, index) });
    parts.push({ type: "image", url: match[1] });
    cursor = index + match[0].length;
  }

  if (cursor < content.length) parts.push({ type: "text", value: content.slice(cursor) });
  return parts;
}

export async function compressPostImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, POST_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리할 수 없습니다.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.84;
  let blob = await canvasToWebp(canvas, quality);
  while (blob.size > MAX_POST_IMAGE_STORED_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToWebp(canvas, quality);
  }

  if (blob.size > MAX_POST_IMAGE_STORED_BYTES) {
    throw new Error("이미지를 2MB이하로 압축할 수 없습니다. 더 작은 이미지를 선택해 주세요.");
  }
  return blob;
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했습니다.")),
      "image/webp",
      quality,
    );
  });
}

export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${POST_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export function countPostImages(content: string): number {
  return getStoredImageUrls(content).length + getPendingImageIds(content).length;
}

export async function uploadPendingPostImages(
  content: string,
  pendingImages: PendingPostImage[],
  accessToken: string,
): Promise<string> {
  let nextContent = content;
  const uploadedPaths: string[] = [];

  try {
    for (const image of pendingImages) {
      if (!nextContent.includes(pendingImageToken(image.id))) continue;
      const compressed = await compressPostImage(image.file);
      const formData = new FormData();
      formData.append("file", new File([compressed], "post-image.webp", { type: "image/webp" }));

      const response = await fetch("/api/post-images", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const result = await response.json() as { url?: string; path?: string; error?: string };
      if (!response.ok || !result.url || !result.path) {
        throw new Error(result.error || "이미지 업로드에 실패했습니다.");
      }

      uploadedPaths.push(result.path);
      nextContent = replacePendingImage(nextContent, image.id, result.url);
    }
    return nextContent;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await deletePostImagePaths(uploadedPaths, accessToken).catch(() => undefined);
    }
    throw error;
  }
}

export async function deletePostImagePaths(paths: string[], accessToken: string): Promise<void> {
  if (paths.length === 0) return;
  const response = await fetch("/api/post-images", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paths }),
  });
  if (!response.ok) throw new Error("이미지 정리에 실패했습니다.");
}

export async function deletePostImagesByUrl(urls: string[], accessToken: string): Promise<void> {
  const paths = urls
    .map(storagePathFromPublicUrl)
    .filter((path): path is string => Boolean(path));
  await deletePostImagePaths(paths, accessToken);
}
