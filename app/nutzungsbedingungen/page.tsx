import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "이용 안내 | German Hanguk" };

export default function Page() {
  return <LegalPage title="이용 안내">
    <section><h2>적용 범위 및 서비스 이용</h2><p>이 안내는 계정, 프로필, 게시물, 댓글, 반응, 쪽지, 알림 및 현재 제공되는 기타 커뮤니티 기능 이용에 적용됩니다. 이용자는 관련 법령과 이 규칙을 준수해야 합니다.</p></section>
    <section><h2>계정 및 보안</h2><p>본인 계정만 사용하고 로그인 정보를 안전하게 관리하세요. 비밀번호를 공유하지 마세요. 오용이 의심되면 즉시 <a href="mailto:germanhanguk@gmail.com">germanhanguk@gmail.com</a>으로 알려 주세요. 개별 기능의 제공 여부는 기술적·운영상 이유로 변경될 수 있습니다.</p></section>
    <section><h2>게시물·쪽지 및 이용자 행동</h2><p>불법 콘텐츠, 협박, 괴롭힘, 차별, 스팸, 사기 및 권한 없는 타인의 개인정보 공개를 금지합니다. 쪽지는 존중하는 방식으로 사용하고 원치 않는 광고 메시지를 보내지 마세요. 정보, 제안 및 만남은 스스로 확인해야 하며 커뮤니티 콘텐츠는 개인별 법률·세무·의료·안전 상담을 대체하지 않습니다.</p></section>
    <section><h2>이용자 콘텐츠 및 제3자 권리</h2><p>게시 권한이 있는 콘텐츠와 이미지만 올려 주세요. 콘텐츠의 권리는 이용자 또는 해당 권리자에게 남습니다. 게시함으로써 커뮤니티 기능 제공에 필요한 범위에서 German Hanguk이 해당 콘텐츠를 기술적으로 저장하고 서비스 안에서 표시하는 것을 허용합니다. 이미지·로고·인용문 등 제3자의 권리는 그대로 보호됩니다.</p></section>
    <section><h2>관리 및 신고</h2><p>신고되었거나 명백히 규칙에 맞지 않는 콘텐츠는 검토 후 제한 또는 삭제될 수 있습니다. 신고 시 페이지 주소와 간단한 사유를 <a href="mailto:germanhanguk@gmail.com">germanhanguk@gmail.com</a>으로 보내거나 문의 페이지를 이용해 주세요.</p></section>
  </LegalPage>;
}
