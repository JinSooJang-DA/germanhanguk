import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "운영자 정보 | German Hanguk", robots: { index: false } };

export default function Page() {
  return <LegalPage title="운영자 정보">
    <section>
      <h2>German Hanguk(저먼한국) 소개</h2>
      <p>German Hanguk은 독일 거주 한국인을 위한 커뮤니티 및 생활정보 서비스입니다. 일상에 도움이 되는 정보와 이용자 간 소통 공간을 제공합니다.</p>
    </section>
    <section><h2>운영 및 권리 관련 문의</h2><p>서비스 운영, 콘텐츠 또는 권리 관련 문의는 <a href="mailto:germanhanguk@gmail.com">germanhanguk@gmail.com</a>으로 보내 주세요. 권리 침해가 의심되는 경우에는 해당 페이지 주소와 사유를 함께 알려 주세요.</p></section>
  </LegalPage>;
}
