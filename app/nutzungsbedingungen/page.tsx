import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Nutzungsbedingungen · 이용 안내 | German Hanguk" };

export default function Page() {
  return <LegalPage title="Nutzungsbedingungen" koreanTitle="이용 안내">
    <section lang="de"><h2>Community und Informationen</h2><p>Verwenden Sie einen eigenen Account und schützen Sie Ihre Zugangsdaten. Veröffentlichen Sie keine rechtswidrigen Inhalte, Drohungen, Belästigungen, Spam oder personenbezogenen Daten anderer ohne Erlaubnis. Angebote und Informationen sind vor eigener Verwendung zu prüfen; Beiträge ersetzen keine individuelle Rechts-, Steuer- oder medizinische Beratung.</p><h2>Moderation und Meldungen</h2><p>Rechtswidrige oder regelwidrige Beiträge können geprüft und entfernt werden. Betroffene können über Kontakt eine Überprüfung anfragen. Gesetzliche Rechte bleiben unberührt.</p><h2>Urheberrecht</h2><p>Veröffentlichen Sie nur Inhalte, für die Sie die erforderlichen Rechte besitzen. Rechte an Nutzerbeiträgen bleiben bei den jeweiligen Rechteinhabern. Die Veröffentlichung erlaubt die Darstellung des Beitrags innerhalb des Dienstes. Fremde Bilder, Logos und Zitate unterliegen den jeweiligen Rechten. Melden Sie Rechtsverletzungen mit URL und Begründung über Kontakt.</p></section>
    <section lang="ko"><h2>커뮤니티와 정보</h2><p>본인 계정을 사용하고 로그인 정보를 보호하세요. 불법 콘텐츠, 협박, 괴롭힘, 스팸 및 동의 없는 타인의 개인정보 게시를 금지합니다. 정보와 거래 조건은 직접 확인하세요. 게시물은 개인별 법률·세무·의료 상담을 대신하지 않습니다.</p><h2>관리 및 신고</h2><p>불법 또는 규칙 위반 게시물은 검토 및 삭제될 수 있습니다. 문의 페이지에서 재검토를 요청할 수 있으며 법적 권리는 유지됩니다.</p><h2>저작권</h2><p>게시 권한이 있는 콘텐츠만 올려 주세요. 이용자 콘텐츠의 권리는 각 권리자에게 있으며 게시 시 서비스 내 표시를 허용합니다. 외부 이미지, 로고 및 인용문에는 해당 권리자의 권리가 적용됩니다. 침해 신고에는 URL과 사유를 포함해 주세요.</p></section>
  </LegalPage>;
}
