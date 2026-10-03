import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import ContactForm from "@/components/ContactForm";
export const metadata: Metadata = { title: "문의 | German Hanguk" };
export default function Page() { return <LegalPage title="문의"><section><h2>문의하기</h2><p>일반 문의, 기술 문제, 개인정보 관련 요청 및 콘텐츠·권리 관련 신고는 <a href="mailto:germanhanguk@gmail.com">germanhanguk@gmail.com</a>으로 보내 주세요.</p><p>신고에는 해당 페이지 주소와 사유를 포함해 주세요. 비밀번호, 신분증 사본 등 민감한 정보는 보내지 마세요. 접수되었다고 해서 답변 기한이 보장되는 것은 아닙니다.</p></section><ContactForm /></LegalPage>; }
