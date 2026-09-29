export default function GuideEmployeeSteps() {
  const steps = [
    {
      number: "01",
      title: "내 연봉 확인",
      description: "2026년 JAEG 기준과 비교해 GKV 의무가입 여부를 확인합니다.",
    },
    {
      number: "02",
      title: "Krankenkasse 선택",
      description: "추가보험료와 필요한 서비스를 비교해 가입할 공보험을 선택합니다.",
    },
    {
      number: "03",
      title: "회사에 전달",
      description: "선택한 Krankenkasse 정보를 고용주에게 알려 가입 절차를 진행합니다.",
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
          직장인이 먼저 확인할 것
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: "1.6",
            color: "#64748b",
          }}
        >
          처음 취업했다면 아래 세 가지부터 확인해보세요.
        </p>
      </div>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
        }}
      >
        {steps.map((step) => (
          <div
            key={step.number}
            style={{
              display: "grid",
              gridTemplateColumns: "38px 1fr",
              gap: "10px",
              padding: "14px 0",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#94a3b8",
              }}
            >
              {step.number}
            </span>

            <div>
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: "15px",
                  lineHeight: "1.4",
                  color: "#0f172a",
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: "1.6",
                  color: "#64748b",
                }}
              >
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}