export default function GuideInsuranceComparison() {
  const rows = [
    {
      label: "운영",
      gkv: "법정 건강보험",
      pkv: "민간 건강보험",
    },
    {
      label: "보험료",
      gkv: "주로 소득 기준",
      pkv: "개인 조건 및 상품 기준",
    },
    {
      label: "가족",
      gkv: "조건에 따라 가족보험 가능",
      pkv: "개별 가입 구조",
    },
    {
      label: "가입",
      gkv: "법적 가입 조건 적용",
      pkv: "가입 자격 및 심사 조건 적용",
    },
    {
      label: "특징",
      gkv: "법정 기준에 따른 보장",
      pkv: "상품에 따라 보장 범위 차이",
    },
  ];

  return (
    <section style={{ margin: "28px 0" }}>
      <div style={{ marginBottom: "14px" }}>
        <h2
          style={{
            margin: "0 0 5px",
            fontSize: "20px",
            lineHeight: "1.4",
            color: "var(--gh-text)",
          }}
        >
          공보험 vs 사보험
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: "1.6",
            color: "var(--gh-text-muted)",
          }}
        >
          GKV와 PKV의 기본적인 구조를 한눈에 비교해보세요.
        </p>
      </div>

      <div
        style={{
          overflow: "hidden",
          background: "var(--gh-card-surface)",
          border: "2px solid var(--gh-card-border)",
          borderRadius: "0",
          boxShadow: "var(--gh-card-shadow)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "72px 1fr 1fr",
            padding: "12px 14px",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--gh-text)",
          }}
        >
          <span />
          <span>공보험 (GKV)</span>
          <span>사보험 (PKV)</span>
        </div>

        {rows.map((row, index) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr 1fr",
              gap: "8px",
              padding: "11px 14px",
              borderBottom:
                index === rows.length - 1
                  ? "none"
                  : "1px solid #eef2f7",
              fontSize: "13px",
              lineHeight: "1.5",
              color: "var(--gh-text-muted)",
            }}
          >
            <strong style={{ color: "var(--gh-text)" }}>{row.label}</strong>
            <span>{row.gkv}</span>
            <span>{row.pkv}</span>
          </div>
        ))}
      </div>
    </section>
  );
}