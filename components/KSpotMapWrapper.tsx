"use client";

import dynamic from "next/dynamic";
import { KSpot } from "@/types/kspot";

interface KSpotMapWrapperProps {
  spots: KSpot[];
}

const KSpotMap = dynamic(() => import("@/components/KSpotMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "550px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        color: "#64748b",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          border: "3px solid #e2e8f0",
          borderTopColor: "#0f172a",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <span style={{ fontSize: "14px", fontWeight: "500" }}>지도를 불러오는 중입니다...</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  ),
});

export default function KSpotMapWrapper({ spots }: KSpotMapWrapperProps) {
  return <KSpotMap spots={spots} />;
}
