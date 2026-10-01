import type { GuideSupplement as GuideSupplementData } from "@/lib/guide-supplements";

export default function GuideSupplement({ supplement }: { supplement: GuideSupplementData }) {
  return (
    <section
      aria-label={supplement.title}
      style={{
        margin: "30px 0 8px",
        padding: "20px 22px",
        border: "1px solid var(--gh-border)",
        background: "var(--gh-surface-muted)",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ margin: "0 0 12px", fontSize: "18px", color: "var(--gh-text)" }}>
        {supplement.title}
      </h2>
      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--gh-text-muted)", lineHeight: 1.75 }}>
        {supplement.items.map((item) => (
          <li key={item} style={{ marginBottom: "8px" }}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
