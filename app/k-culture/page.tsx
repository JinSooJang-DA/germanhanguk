import Link from "next/link";

const entries = [
  { step: "01 ? ENTDECKEN", title: "K-Culture", text: "Koreanische Kultur aus der Perspektive von Menschen, die sie wirklich leben.", note: "Kultur ? Alltag ? Essen ? Medien" },
  { step: "02 ? LERNEN", title: "Koreanisch", text: "Sprache, Ausdr?cke und die kleinen kulturellen Bedeutungen dahinter.", note: "Sprache ? Nuancen ? echte Ausdr?cke" },
  { step: "03 ? BEGEGNEN", title: "Tandem", text: "Koreaner und deutschsprachige Korea-Fans in Deutschland miteinander verbinden.", note: "Deutsch ? Koreanisch ? Menschen vor Ort", featured: true },
];

export default function KCulturePage() {
  return (
    <main className="kculture-page">
      <section className="kculture-hero">
        <span className="kculture-kicker">GERMANY ? KOREA</span>
        <h1>Korea entdecken.<br />Menschen kennenlernen.</h1>
        <p>F?r alle, die Korea nicht nur sehen, sondern verstehen und mit echten Menschen teilen m?chten.</p>
      </section>

      <div className="kculture-journey-label">Entdecken ? Lernen ? Begegnen</div>
      <section className="kculture-grid" aria-label="K-Culture Bereiche">
        {entries.map((entry) => (
          <article className={`kculture-card${entry.featured ? " is-featured" : ""}`} key={entry.title}>
            <span className="kculture-step">{entry.step}</span>
            <h2>{entry.title}</h2>
            <p>{entry.text}</p>
            <small>{entry.note}</small>
            <span className="kculture-status">Demn?chst</span>
          </article>
        ))}
      </section>

      <section className="kculture-tandem-callout" aria-labelledby="tandem-heading">
        <div>
          <span className="kculture-kicker">DEUTSCH ? KOREANISCH</span>
          <h2 id="tandem-heading">Nicht nur Korea folgen. Menschen treffen.</h2>
          <p>Tandem soll der gemeinsame Treffpunkt f?r Koreaner in Deutschland und deutschsprachige Korea-Fans werden.</p>
        </div>
        <Link href="/?section=community">Community kennenlernen ?</Link>
      </section>
    </main>
  );
}
