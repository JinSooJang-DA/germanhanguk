import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
export const metadata: Metadata = { title: "개인정보 처리 안내 | German Hanguk", robots: { index: false } };
export default function Page() {
  return <LegalPage title="개인정보 처리 안내">
    <section><h2>문의 및 요청</h2><p>개인정보와 관련한 문의·요청은 <a href="mailto:germanhanguk@gmail.com">germanhanguk@gmail.com</a>으로 보내 주세요.</p></section>
    <section><h2>계정과 커뮤니티 이용</h2><p>서비스는 계정 인증과 커뮤니티 기능을 위해 Supabase를 사용합니다. 가입·로그인, 프로필, 게시물, 댓글, 반응, 알림, 쪽지 등 이용자가 입력하거나 이용 과정에서 생성되는 정보를 각 기능 제공에 필요한 범위에서 처리합니다. 프로필 사진과 게시물 이미지는 저장 공간에 보관됩니다.</p></section>
    <section><h2>문의 양식</h2><p>문의 처리와 답변을 위해 문의 유형, 제목, 선택한 이름, 이메일 주소, 내용, 접수 시각 및 처리 상태를 저장합니다. 자동 제출 방지와 제출 횟수 제한 기능도 사용됩니다.</p></section>
    <section><h2>기기 저장소와 외부 콘텐츠</h2><p>사이트는 언어와 테마 설정 등 일부 이용 설정을 브라우저 저장소에 보관할 수 있습니다. YouTube, Instagram, TikTok 콘텐츠는 사용자가 직접 불러오기를 선택한 뒤 연결되며, 이때 각 서비스가 접속 정보를 처리할 수 있습니다.</p></section>
    <section><h2>보관 및 삭제</h2><p>문의 정보는 처리 목적으로 보관되며, 서비스 기능과 운영 필요에 따라 삭제 또는 정리될 수 있습니다. 계정이나 게시물 등 커뮤니티 정보는 이용자가 삭제를 요청하거나 계정을 탈퇴하는 경우 관련 기능의 처리 절차에 따라 정리됩니다.</p></section>
  </LegalPage>;
}
