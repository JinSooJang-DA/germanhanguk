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
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          textAlign: "center",
        }}
      >
        <div className="footer-brand">
          <span className="brand-mark-shell footer-brand-mark" aria-hidden="true"><Image className="brand-mark brand-mark-light" src="/assets/brand/germanhanguk-logo-m.png" alt="" width={48} height={48} /><Image className="brand-mark brand-mark-dark" src="/assets/brand/germanhanguk-logo-m-dark.png" alt="" width={48} height={48} /></span>
          <div style={{ fontWeight: "bold", color: "var(--gh-footer-title)", fontSize: "15px" }}>
            German Hanguk (독일 한인 커뮤니티)
          </div>
        </div>
        <p style={{ margin: 0, lineHeight: "1.5" }}>
          본 사이트는 독일 거주 한인들을 위한 정보 공유 및 소통 공간입니다. 게시된 내용에 대한 책임은 작성자 본인에게 있습니다.
        </p>
        <nav className="footer-legal-links" aria-label="법률 및 문의 / Rechtliches und Kontakt">
          <Link href="/impressum">운영자 정보 · Impressum</Link>
          <Link href="/datenschutz">개인정보 · Datenschutz</Link>
          <Link href="/kontakt">문의 · Kontakt</Link>
          <Link href="/nutzungsbedingungen">이용 안내 · Nutzungsbedingungen</Link>
        </nav>
        <div style={{ marginTop: "12px", color: "var(--gh-footer-copy)" }}>
          © {new Date().getFullYear()} German Hanguk. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
