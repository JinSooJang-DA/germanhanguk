import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "auto",
        padding: "40px 20px",
        background: "var(--gh-footer-bg)",
        color: "var(--gh-footer-text)",
        fontSize: "13px",
        borderTop: "1px solid var(--gh-footer-border)",
      }}
    >
      <div className="footer-inner">
        <div className="footer-about">
          <div className="footer-brand">
            <span className="brand-mark-shell footer-brand-mark" aria-hidden="true">
              <Image className="brand-mark brand-mark-light" src="/assets/brand/germanhanguk-logo-m.png" alt="" width={48} height={48} />
              <Image className="brand-mark brand-mark-dark" src="/assets/brand/germanhanguk-logo-m-dark.png" alt="" width={48} height={48} />
            </span>
            <div className="footer-title">German Hanguk (독일 한인 커뮤니티)</div>
          </div>
          <p className="footer-description">
            본 사이트는 독일 거주 한인들을 위한 정보 공유 및 소통 공간입니다. 게시된 내용에 대한 책임은 작성자 본인에게 있습니다.
          </p>
        </div>

        <nav className="footer-legal-links" aria-label="법률 및 문의 / Rechtliches und Kontakt">
          <span className="footer-link-heading">안내 · Rechtliches</span>
          <Link href="/impressum">운영자 정보 · Impressum</Link>
          <Link href="/datenschutz">개인정보 · Datenschutz</Link>
          <Link href="/kontakt">문의 · Kontakt</Link>
          <Link href="/nutzungsbedingungen">이용 안내 · Nutzungsbedingungen</Link>
        </nav>

        <div className="footer-copy">© {new Date().getFullYear()} German Hanguk. All rights reserved.</div>
      </div>
    </footer>
  );
}
