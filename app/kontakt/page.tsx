import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import ContactForm from "@/components/ContactForm";
export const metadata: Metadata = { title: "Kontakt · 문의 | German Hanguk" };
export default function Page() { return <LegalPage title="Kontakt" koreanTitle="문의"><p lang="de">Für Fragen, Datenschutzanliegen und Meldungen rechtswidriger Inhalte. Bitte nennen Sie bei Meldungen die betroffene URL und den Grund. Keine Passwörter oder sensiblen Dokumente senden.</p><p lang="ko">질문, 개인정보 요청 및 불법 콘텐츠 신고를 접수합니다. 신고 시 해당 URL과 사유를 알려 주세요. 비밀번호나 민감한 서류를 보내지 마세요.</p><ContactForm /></LegalPage>; }
