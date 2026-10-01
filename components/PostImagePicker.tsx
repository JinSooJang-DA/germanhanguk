"use client";

import { ChangeEvent, Dispatch, SetStateAction, useRef } from "react";
import {
  countPostImages,
  createPendingImage,
  getPendingImageIds,
  MAX_POST_IMAGES,
  pendingImageToken,
  PendingPostImage,
  removePendingImage,
  validatePostImageFile,
} from "@/lib/postImages";

type Props = {
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  pendingImages: PendingPostImage[];
  setPendingImages: Dispatch<SetStateAction<PendingPostImage[]>>;
  disabled?: boolean;
};

export default function PostImagePicker({
  content,
  setContent,
  pendingImages,
  setPendingImages,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(token: string) {
    const textarea = document.getElementById("content") as HTMLTextAreaElement | null;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    const suffix = after && !after.startsWith("\n") ? "\n" : "";
    setContent(`${before}${prefix}${token}${suffix}${after}`);
    requestAnimationFrame(() => textarea?.focus());
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_POST_IMAGES - countPostImages(content);
    if (remaining <= 0) {
      alert(`게시글에는 이미지를 최대 ${MAX_POST_IMAGES}장까지 넣을 수 있습니다.`);
      return;
    }

    const accepted: PendingPostImage[] = [];
    let nextImageNumber = Math.max(0, ...getPendingImageIds(content).map(Number)) + 1;
    for (const file of files.slice(0, remaining)) {
      const error = validatePostImageFile(file);
      if (error) {
        alert(error);
        continue;
      }
      accepted.push(createPendingImage(file, nextImageNumber));
      nextImageNumber += 1;
    }

    if (files.length > remaining) {
      alert(`이미지는 게시글당 최대 ${MAX_POST_IMAGES}장까지 등록할 수 있습니다.`);
    }
    if (accepted.length === 0) return;

    setPendingImages((current) => [...current, ...accepted]);
    const tokens = accepted.map((image) => pendingImageToken(image.id)).join("\n");
    insertAtCursor(tokens);
  }

  function removeImage(image: PendingPostImage) {
    URL.revokeObjectURL(image.previewUrl);
    setPendingImages((current) => current.filter((item) => item.id !== image.id));
    setContent((current) => removePendingImage(current, image.id));
  }

  return (
    <div className="post-image-picker">
      <div className="post-image-picker-header">
        <div>
          <strong>사진</strong>
          <p>최대 5장 · 원본 10MB 이하 · JPG/PNG/WebP · 자동 압축</p>
        </div>
        <button
          type="button"
          className="post-image-add-button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || countPostImages(content) >= MAX_POST_IMAGES}
        >
          📷 사진 추가
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        hidden
      />

      {pendingImages.length > 0 && (
        <div className="post-image-preview-grid">
          {pendingImages.map((image, index) => (
            <div className="post-image-preview" key={image.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt={`첨부 예정 이미지 ${index + 1}`} />
              <button type="button" onClick={() => removeImage(image)} aria-label="이미지 제거">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
