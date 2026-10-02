import Image from "next/image";

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
          <Image className="footer-brand-mark" src="/assets/brand/germanhanguk-logo-m.png" alt="" width={48} height={48} />
          <div style={{ fontWeight: "bold", color: "var(--gh-footer-title)", fontSize: "15px" }}>
            German Hanguk (독일 한인 커뮤니티)
          </div>
        </div>
        <p style={{ margin: 0, lineHeight: "1.5" }}>
          본 사이트는 독일 거주 한인들을 위한 정보 공유 및 소통 공간입니다. 게시된 내용에 대한 책임은 작성자 본인에게 있습니다.
        </p>
        <div style={{ marginTop: "12px", color: "var(--gh-footer-copy)" }}>
          © {new Date().getFullYear()} German Hanguk. All rights reserved.
        </div>
      </div>
    </footer>
  );
}