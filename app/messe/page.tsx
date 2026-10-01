import Link from "next/link";

export default function MessePage() {
  const features = [
    ["📅", "전시회 일정", "독일 주요 Messe의 개최일과 도시를 한눈에 확인합니다."],
    ["🧭", "출장 · 방문 정보", "교통, 숙박, 입장 준비 등 실제 방문에 필요한 정보를 연결합니다."],
    ["🇰🇷", "한국 참가 정보", "한국관·KOTRA·한국 기업 참가처럼 한국인에게 유용한 정보를 모읍니다."],
    ["🤝", "현지 연결", "통역, 현장 지원, 네트워킹과 관련 커뮤니티 경험을 이어줍니다."],
  ];

  return (
    <main className="messe-page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ maxWidth: "760px", marginBottom: "36px" }}>
        <span className="messe-kicker" style={{ fontSize: "13px", fontWeight: 700 }}>GERMANHANGUK MESSE</span>
        <h1 style={{ margin: "10px 0 12px", fontSize: "34px", color: "var(--gh-text)", letterSpacing: "-0.03em" }}>독일 메세 · 박람회</h1>
        <p style={{ margin: 0, color: "var(--gh-text-muted)", lineHeight: 1.75, fontSize: "15px" }}>
          독일 출장자와 현지 방문자를 위해 주요 전시회 일정부터 방문 준비, 한국 참가 정보, 현지 경험까지 한곳에 연결하는 정보 섹션입니다.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px", marginBottom: "42px" }}>
        {features.map(function(feature) {
          return (
            <div className="messe-feature-card" key={feature[1]} style={{ padding: "22px" }}>
              <div style={{ fontSize: "24px", marginBottom: "12px" }}>{feature[0]}</div>
              <strong style={{ color: "var(--gh-text)", fontSize: "16px" }}>{feature[1]}</strong>
              <p style={{ margin: "8px 0 0", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.65 }}>{feature[2]}</p>
            </div>
          );
        })}      </div>

      <section className="messe-status-card" style={{ padding: "28px" }}>
        <h2 style={{ margin: "0 0 8px", color: "var(--gh-text)", fontSize: "19px" }}>행사 데이터 연결 준비 중</h2>
        <p style={{ margin: "0 0 16px", color: "var(--gh-text-muted)", fontSize: "14px", lineHeight: 1.7 }}>
          이 섹션은 뉴스 기사와 분리된 전시회 전용 일정으로 구성됩니다. 공식 주최사 정보를 기준으로 행사명, 일정, 도시, 장소, 분야와 공식 링크를 연결할 예정입니다.
        </p>
        <Link className="messe-home-link" href="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: "14px" }}>← 정보 홈으로</Link>
      </section>
    </main>
  );
}
