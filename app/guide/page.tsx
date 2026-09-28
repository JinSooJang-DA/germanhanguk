import { SITE_URL } from "@/lib/config";
import React from "react";
import Link from "next/link";
import { GUIDE_CATEGORIES } from "@/lib/constants";

export const metadata = {
  title: "독일 생활 가이드 & 정착 정보 - GermanHanguk",
  description: "독일 비자, 행정, 유학, 건강보험, 세금 및 집 구하기 등 독일 정착에 필수적인 공식 에디토리얼 생활정보와 가이드를 모았습니다.",
  alternates: {
    canonical: SITE_URL + "/guide",
  },
  openGraph: {
    title: "독일 생활 가이드 & 정착 정보 - GermanHanguk",
    description: "독일 정착의 나침반! 독일 건강보험, 비자, 세금, 아파트 구하기 등 공식 행정 가이드 확인하기.",
    type: "website",
    url: SITE_URL + "/guide",
  },
};

export default function GuideLandingPage() {
  return (
    <main style={{ minHeight: "80vh", padding: "40px 0 80px", background: "#f8fafc" }}>
      <div className="wrapper" style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* 히어로 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <span style={{ fontSize: "14px", color: "#2563eb", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            GermanHanguk Living Guide
          </span>
          <h1 style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: "bold", color: "#0f172a", margin: "10px 0 16px 0" }}>
            🇩🇪 독일 생활백서 & 공식 정착 가이드
          </h1>
          <p style={{ fontSize: "16px", color: "#64748b", margin: 0, maxWidth: "600px", marginLeft: "auto", marginRight: "auto", lineHeight: "1.6" }}>
            독일 행정, 비자, 보험, 세금 등 유학생과 교민이 가장 헷갈려하는 
            핵심 생활정보들을 독일 공공 부처 최신 법령을 기준으로 엄격하게 선별해 드립니다.
          </p>
        </div>

        {/* 카테고리 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {GUIDE_CATEGORIES.map(function(cat) {
            const isFirst = cat.value === "insurance";
            
            return (
              <Link
                key={cat.value}
                href={isFirst ? "/guide/insurance" : "#"}
                style={{
                  textDecoration: "none",
                  color: "#0f172a",
                  display: "block"
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    transition: "all 0.2s",
                    minHeight: "160px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    opacity: isFirst ? 1 : 0.8,
                    cursor: isFirst ? "pointer" : "not-allowed",
                  }}
                  onMouseEnter={function(e) {
                    if (isFirst) {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.05)";
                      e.currentTarget.style.borderColor = "#bfdbfe";
                    }
                  }}
                  onMouseLeave={function(e) {
                    if (isFirst) {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "28px" }}>{cat.icon}</span>
                      {!isFirst && (
                        <span style={{
                          fontSize: "10px",
                          color: "#94a3b8",
                          background: "#f1f5f9",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontWeight: "bold"
                        }}>
                          준비 중
                        </span>
                      )}
                      {isFirst && (
                        <span style={{
                          fontSize: "10px",
                          color: "#2563eb",
                          background: "#eff6ff",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontWeight: "bold"
                        }}>
                          추천 가이드
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "16px 0 8px 0" }}>
                      {cat.label.ko}
                    </h3>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
                      {cat.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
