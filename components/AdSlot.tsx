import React from "react";

interface AdSlotProps {
  position: "guide-middle" | "guide-bottom" | "guide-sidebar";
}

export default function AdSlot({ position }: AdSlotProps) {
  // 에드 네트워크 연동 전까지 빈 여백이나 플레이스홀더 박스 노출 없이 완전히 숨깁니다 (return null).
  // 추후 광고 데이터 연동 시 이 컴포넌트 내부 구현만 교체하면 에디토리얼 가이드 페이지 전역에 즉시 적용됩니다.
  return null;
}
