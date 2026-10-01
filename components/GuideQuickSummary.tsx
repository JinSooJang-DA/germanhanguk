interface GuideQuickSummaryProps {
  items: string[];
}

export default function GuideQuickSummary({
  items,
}: GuideQuickSummaryProps) {
  return (
    <section
      style={{
        margin: "24px 0",
        padding: "18px 20px",
        background: "var(--gh-card-surface)",
        border: "2px solid var(--gh-card-border)",
        borderRadius: "0",
        boxShadow: "var(--gh-card-shadow)",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: "18px",
          lineHeight: "1.4",
          fontWeight: "700",
          color: "#0f172a",
        }}
      >
        10초 핵심 요약
      </h2>

      <ul
        style={{
          margin: 0,
          paddingLeft: "20px",
          color: "#334155",
          fontSize: "14px",
          lineHeight: "1.7",
        }}
      >
        {items.map((item, index) => (
          <li
            key={index}
            style={{
              marginBottom: index === items.length - 1 ? 0 : "5px",
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}