import type { OfficialLink } from "@/lib/official-links";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  links: readonly OfficialLink[];
};

export default function OfficialLinksPanel({ eyebrow, title, description, links }: Props) {
  return (
    <section className="official-links-panel" aria-labelledby="official-links-title">
      <div className="official-links-heading">
        <span>{eyebrow}</span>
        <h2 id="official-links-title">{title}</h2>
        <p>{description}</p>
      </div>
      <div className="official-links-grid">
        {links.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="official-link-card">
            <div className="official-link-card-top">
              <strong>{link.title}</strong>
              <span aria-hidden="true">↗</span>
            </div>
            <p>{link.description}</p>
            <small>{link.source} · 공식 사이트</small>
          </a>
        ))}
      </div>
    </section>
  );
}
