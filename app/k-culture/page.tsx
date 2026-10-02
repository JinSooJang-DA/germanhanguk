import Link from "next/link";

const entries = [
  { title: "K-Culture", text: "Koreanische Kultur aus der Perspektive von Menschen, die sie wirklich leben." },
  { title: "Koreanisch", text: "Sprache, Ausdrücke und die kleinen kulturellen Bedeutungen dahinter." },
  { title: "Tandem", text: "Koreaner und deutschsprachige Korea-Fans in Deutschland miteinander verbinden." },
];

export default function KCulturePage() {
  return (
    <main className="kculture-page">
      <section className="kculture-hero">
        <span className="kculture-kicker">GERMANY ↔ KOREA</span>
        <h1>Korea entdecken.<br />Menschen kennenlernen.</h1>
        <p>Für alle, die Korea nicht nur sehen, sondern verstehen und mit echten Menschen teilen möchten.</p>
      </section>
      <section className="kculture-grid" aria-label="K-Culture Bereiche">
        {entries.map((entry) => (
          <article className="kculture-card" key={entry.title}>
            <span>준비중 · bald</span><h2>{entry.title}</h2><p>{entry.text}</p>
          </article>
        ))}
      </section>
      <Link className="kculture-community-link" href="/?section=community">Zur German Hanguk Community →</Link>
    </main>
  );
}
