import React from "react";
import Link from "next/link";
import { getGuideCommunityCategory } from "@/lib/constants";

interface GuideCommunityCTAProps {
  categoryLabel: string;
  categoryValue: string;
}

export default function GuideCommunityCTA({
  categoryLabel,
  categoryValue,
}: GuideCommunityCTAProps) {
  return (
    <div
      style={{
        margin: "50px 0 30px 0",
        padding: "30px 24px",
        background: "var(--gh-guide-cta-surface)",
        border: "1px solid var(--gh-guide-cta-border)",
        borderRadius: "12px",
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px 0",
          fontSize: "18px",
          color: "var(--gh-guide-cta-heading)",
          fontWeight: "bold",
        }}
      >
        💡 이 내용에 대해 독일 정착 선배들에게 더 물어보고 싶나요?
      </h3>
      <p
        style={{
          margin: "0 0 20px 0",
          fontSize: "14px",
          color: "var(--gh-guide-cta-body)",
          lineHeight: "1.6",
        }}
      >
        독일 생활과 {categoryLabel} 준비는 사람마다 개별 케이스가 매우 다를 수 있습니다. 
        GermanHanguk 커뮤니티에 직접 질문을 남기거나 관련 리얼 토크를 모아보세요!
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link href={"/posts/new?category=" + getGuideCommunityCategory(categoryValue)} style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "10px 20px",
              background: "var(--gh-guide-cta-primary-bg)",
              color: "var(--gh-guide-cta-primary-text)",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "var(--gh-guide-cta-primary-shadow)",
            }}
          >
            🙋‍♀️ 커뮤니티에 질문 글 올리기
          </button>
        </Link>

        <Link href={"/?category=" + getGuideCommunityCategory(categoryValue)} style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "10px 20px",
              background: "var(--gh-guide-cta-secondary-bg)",
              color: "var(--gh-guide-cta-secondary-text)",
              border: "1px solid var(--gh-guide-cta-border)",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            🔍 커뮤니티 생생 후기 보러가기
          </button>
        </Link>
      </div>
    </div>
  );
}
