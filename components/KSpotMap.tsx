"use client";

import { useMemo, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { KSpot } from "@/types/kspot";

// 화면 크기 변화 및 초기 렌더링 시 Leaflet 지도 크기 재계산
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // 마운트 후 약간의 딜레이를 주어 DOM 배치가 완료된 후 타일 재계산
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// 도시 간 이동을 제어하는 내부 컨트롤러 컴포넌트
function MapFocusController({
  target,
}: {
  target: { center: [number, number]; zoom: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target.center, target.zoom, { duration: 1.2 });
    }
  }, [target, map]);

  return null;
}

// Leaflet 기본 마커 아이콘 깨짐 방지를 위한 커스텀 SVG 핀 아이콘
const createCustomIcon = (color: string = "#ef4444") => {
  return L.divIcon({
    className: "custom-kspot-pin",
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <svg viewBox="0 0 24 24" width="32" height="32" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
          <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="3.2" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface KSpotMapProps {
  spots: KSpot[];
}

// 뮌스터(51.96, 7.62)와 뒤셀도르프(51.22, 6.78)의 중간 지점
const INITIAL_CENTER: [number, number] = [51.59, 7.20];
const INITIAL_ZOOM = 9;

export default function KSpotMap({ spots }: KSpotMapProps) {
  const icon = useMemo(() => createCustomIcon("#dc2626"), []);
  const [focusTarget, setFocusTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);

  const handleFocus = (center: [number, number], zoom: number) => {
    setFocusTarget({ center, zoom });
  };

  return (
    <div style={{ width: "100%", height: "calc(100vh - 200px)", minHeight: "550px", position: "relative" }}>
      {/* 지도 컨트롤 퀵 버튼 */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(4px)",
          padding: "6px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexWrap: "wrap",
          maxWidth: "calc(100% - 32px)",
          gap: "6px",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => handleFocus(INITIAL_CENTER, INITIAL_ZOOM)}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            background: "#ffffff",
            color: "#334155",
            cursor: "pointer",
          }}
        >
          🌐 전체 보기
        </button>
        <button
          type="button"
          onClick={() => handleFocus([51.9625, 7.6256], 13)}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            background: "#ffffff",
            color: "#334155",
            cursor: "pointer",
          }}
        >
          📍 Münster (뮌스터)
        </button>
        <button
          type="button"
          onClick={() => handleFocus([51.2217, 6.7895], 13)}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            background: "#ffffff",
            color: "#334155",
            cursor: "pointer",
          }}
        >
          📍 Düsseldorf (뒤셀도르프)
        </button>
      </div>

      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", minHeight: "550px", zIndex: 1 }}
      >
        <MapResizer />
        <MapFocusController target={focusTarget} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {spots.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={icon}
          >
            <Popup>
              <div style={{ padding: "4px", minWidth: "200px", color: "#1e293b", fontFamily: "sans-serif" }}>
                <div style={{ display: "inline-block", background: "#fee2e2", color: "#b91c1c", fontSize: "11px", fontWeight: "bold", padding: "2px 8px", borderRadius: "4px", marginBottom: "6px" }}>
                  {spot.city} · {spot.category}
                </div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "bold", color: "#0f172a" }}>
                  {spot.name}
                </h3>
                <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#475569", lineHeight: "1.4" }}>
                  📍 {spot.address}
                </p>
                {spot.phone && (
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#64748b" }}>
                    📞 {spot.phone}
                  </p>
                )}
                {spot.description && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: "4px" }}>
                    {spot.description}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
