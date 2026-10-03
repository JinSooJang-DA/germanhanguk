import { notFound } from "next/navigation";
import { getKSpots } from "@/lib/kspots";
import KSpotMapWrapper from "@/components/KSpotMapWrapper";

export const metadata = {
  title: "K-Spot 지도 | German Hanguk",
  description: "독일 내 한식당 및 K-Spot 위치 안내 (뮌스터, 뒤셀도르프 중심)",
};

export default async function MapPage() {
  // Keep the implementation for a future launch; the map is deferred.
  notFound();

  const spots = await getKSpots();

  return (
    <main style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 80px)" }}>
      {/* 상단 안내 바 */}
      <section
        style={{
          background: "var(--gh-surface)",
          borderBottom: "1px solid var(--gh-border)",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "20px" }}>🗺️</span>
              <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "var(--gh-text)" }}>
                K-Spot 지도
              </h1>
              <span
                style={{
                  fontSize: "12px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: "600",
                }}
              >
                Münster &amp; Düsseldorf
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--gh-text-muted)" }}>
              독일 뮌스터와 뒤셀도르프 지역의 한식당 및 주요 스팟 정보를 확인하세요. 마커를 클릭하면 상세 정보를 볼 수 있습니다.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span
              className="kspot-status"
              style={{
                fontSize: "12px",
                background: "var(--gh-surface-muted)",
                color: "var(--gh-text-muted)",
                padding: "6px 12px",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              📍 등록된 스팟: <strong>{spots.length}개</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 지도 영역 (넓은 화면 사용) */}
      <section
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          minHeight: "550px",
          display: "flex",
        }}
      >
        <KSpotMapWrapper spots={spots} />
      </section>
    </main>
  );
}
