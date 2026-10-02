interface AudienceItem {
  title: string;
  description: string;
  targetId: string;
}

interface GuideAudienceCardsProps {
  items: AudienceItem[];
}

export default function GuideAudienceCards({
  items,
}: GuideAudienceCardsProps) {
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
          나는 어디에 해당할까?
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: "1.6",
            color: "var(--gh-text-muted)",
          }}
        >
          현재 상황에 맞는 내용을 먼저 확인해보세요.
        </p>
      </div>

      <div className="guide-audience-grid">
        {items.map((item) => (
          <a
            key={item.title}
            href={`#${item.targetId}`}
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "14px",
              minHeight: "132px",
              background: "var(--gh-card-surface)",
              border: "2px solid var(--gh-card-border)",
              borderRadius: "0",
              boxShadow: "var(--gh-card-shadow)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: "15px",
                lineHeight: "1.4",
                fontWeight: "700",
                color: "var(--gh-text)",
              }}
            >
              {item.title}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: "12.5px",
                lineHeight: "1.6",
                color: "var(--gh-text-muted)",
              }}
            >
              {item.description}
            </p>

            <span
              style={{
                marginTop: "auto",
                paddingTop: "10px",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--gh-text-muted)",
              }}
            >
              핵심 보기 →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}