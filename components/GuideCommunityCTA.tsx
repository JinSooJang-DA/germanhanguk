import React from "react";
import Link from "next/link";

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
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "12px",
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px 0",
          fontSize: "18px",
          color: "#1e3a8a",
          fontWeight: "bold",
        }}
      >
        💡 이 내용에 대해 독일 정착 선배들에게 더 물어보고 싶나요?
      </h3>
      <p
        style={{
          margin: "0 0 20px 0",
          fontSize: "14px",
          color: "#1e40af",
          lineHeight: "1.6",
        }}
      >
        독일 생활과 {categoryLabel} 준비는 사람마다 개별 케이스가 매우 다를 수 있습니다. 
        GermanHanguk 커뮤니티에 직접 질문을 남기거나 관련 리얼 토크를 모아보세요!
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Link href="/posts/new" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "10px 20px",
              background: "#1d4ed8",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(29, 78, 216, 0.15)",
            }}
          >
            🙋‍♀️ 커뮤니티에 질문 글 올리기
          </button>
        </Link>

        <Link href={"/?category=" + (categoryValue === "insurance" ? "life" : categoryValue)} style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "10px 20px",
              background: "#fff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
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
