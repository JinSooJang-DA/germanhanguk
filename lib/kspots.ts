import { KSpot } from "@/types/kspot";

/**
 * 테스트용 K-Spot 샘플 데이터 (Münster, Düsseldorf)
 * 나중에 Supabase 등의 DB 테이블(예: k_spots)로 교체하기 쉽도록
 * 지도 컴포넌트와 분리된 구조로 제공합니다.
 */
export const SAMPLE_K_SPOTS: KSpot[] = [
  {
    id: "sample-munster-1",
    name: "[테스트] 뮌스터 한식당 (Münster Korean Restaurant)",
    category: "한식당",
    city: "Münster",
    address: "Prinzipalmarkt 1, 48143 Münster, Germany (테스트 주소)",
    lat: 51.9625,
    lng: 7.6256,
    phone: "+49 251 000000",
    description: "독일 뮌스터 중심가에 위치한 테스트용 샘플 한식당입니다.",
  },
  {
    id: "sample-dusseldorf-1",
    name: "[테스트] 뒤셀도르프 한식당 (Düsseldorf Korean Restaurant)",
    category: "한식당",
    city: "Düsseldorf",
    address: "Immermannstraße 1, 40210 Düsseldorf, Germany (테스트 주소)",
    lat: 51.2217,
    lng: 6.7895,
    phone: "+49 211 000000",
    description: "독일 뒤셀도르프 중심가에 위치한 테스트용 샘플 한식당입니다.",
  },
];

/**
 * K-Spot 목록을 가져오는 함수
 * 향후 Supabase 연동 시:
 *   const { data } = await supabase.from("k_spots").select("*");
 *   return data ?? [];
 * 형태로 손쉽게 대체할 수 있습니다.
 */
export async function getKSpots(): Promise<KSpot[]> {
  return SAMPLE_K_SPOTS;
}
