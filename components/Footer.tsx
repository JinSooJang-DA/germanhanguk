export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "auto",
        padding: "40px 20px",
        background: "#0f172a",
        color: "#94a3b8",
        fontSize: "13px",
        borderTop: "1px solid #1e293b",
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
        <div style={{ fontWeight: "bold", color: "#f8fafc", fontSize: "15px" }}>
          German Hanguk (독일 한인 커뮤니티)
        </div>
        <p style={{ margin: 0, lineHeight: "1.5" }}>
          본 사이트는 독일 거주 한인들을 위한 정보 공유 및 소통 공간입니다. 게시된 내용에 대한 책임은 작성자 본인에게 있습니다.
        </p>
        <div style={{ marginTop: "12px", color: "#64748b" }}>
          © {new Date().getFullYear()} German Hanguk. All rights reserved.
        </div>
      </div>
    </footer>
  );
}