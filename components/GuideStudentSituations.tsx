export default function GuideStudentSituations() {
  const situations = [
    {
      label: "대학 입학 전",
      description: "등록에 필요한 건강보험 증명과 신고 절차를 확인합니다.",
      targetId: "before-enrollment",
    },
    {
      label: "가족보험 이용 중",
      description: "가족보험을 계속 이용할 수 있는 조건을 확인합니다.",
      targetId: "family-insurance",
    },
    {
      label: "30세 미만 학생",
      description: "학생 GKV와 가입 조건을 확인합니다.",
      targetId: "student-gkv",
    },
    {
      label: "30세 이상 학생",
      description: "학생보험 종료와 이후 보험 선택지를 확인합니다.",
      targetId: "over-30",
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
            color: "#0f172a",
          }}
        >
          내 상황부터 확인하기
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: "1.6",
            color: "#64748b",
          }}
        >
          현재 상황에 가까운 항목부터 읽어보세요.
        </p>
      </div>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
        }}
      >
        {situations.map((item) => (
          <a
            key={item.label}
            href={`#${item.targetId}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 20px",
              gap: "12px",
              alignItems: "center",
              padding: "15px 2px",
              borderBottom: "1px solid #e2e8f0",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: "15px",
                  lineHeight: "1.4",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                {item.label}
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: "1.55",
                  color: "#64748b",
                }}
              >
                {item.description}
              </p>
            </div>

            <span
              aria-hidden="true"
              style={{
                fontSize: "16px",
                color: "#94a3b8",
                textAlign: "right",
              }}
            >
              →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}