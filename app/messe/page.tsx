import Link from "next/link";
import { fetchMesseDuesseldorfEvents } from "@/lib/messe/sources/duesseldorf";
import type { MesseEventCandidate } from "@/lib/messe/types";

export const revalidate = 21600;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatRange(event: MesseEventCandidate): string {
  if (event.startsOn === event.endsOn) return formatDate(event.startsOn);
  return `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`;
}

export default async function MessePage() {
  const result = await fetchMesseDuesseldorfEvents();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = result.events
    .filter((event) => event.endsOn >= today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .slice(0, 12);

  return (
    <main className="messe-page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ maxWidth: "760px", marginBottom: "34px" }}>
        <span className="messe-kicker" style={{ fontSize: "13px", fontWeight: 700 }}>GERMANHANGUK MESSE</span>
        <h1 style={{ margin: "10px 0 12px", fontSize: "34px", color: "var(--gh-text)", letterSpacing: "-0.03em" }}>
          독일 메세 · 박람회
        </h1>
        <p style={{ margin: 0, color: "var(--gh-text-muted)", lineHeight: 1.75, fontSize: "15px" }}>
          독일 출장자와 현지 방문자를 위해 공식 주최사 일정을 기준으로 주요 전시회 정보를 정리합니다.
          첫 연결 지역은 뒤셀도르프이며, 다른 주요 Messe 도시도 순차적으로 확장할 예정입니다.
        </p>
      </div>

      <section style={{ marginBottom: "42px" }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div>
            <span className="messe-kicker" style={{ fontSize: "12px", fontWeight: 700 }}>DÜSSELDORF</span>
            <h2 style={{ margin: "6px 0 0", color: "var(--gh-text)", fontSize: "22px" }}>다가오는 전시회</h2>
          </div>
          <a
            className="messe-home-link"
            href="https://www.messe-duesseldorf.de/de/messen_und_events/messen_national_und_international"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none", fontWeight: 700, fontSize: "13px" }}
          >
            Messe Düsseldorf 공식 일정 ↗
          </a>
        </div>
        {upcoming.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "16px" }}>
            {upcoming.map((event) => (
              <article className="messe-feature-card" key={event.sourceEventId} style={{ padding: "22px", display: "flex", flexDirection: "column" }}>
                <div style={{ color: "var(--gh-accent)", fontSize: "12px", fontWeight: 800, marginBottom: "9px" }}>
                  {formatRange(event)}
                </div>
                <h3 style={{ margin: 0, color: "var(--gh-text)", fontSize: "17px", lineHeight: 1.4 }}>{event.title}</h3>
                {event.summary ? (
                  <p style={{ margin: "9px 0 0", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.6 }}>{event.summary}</p>
                ) : null}
                <div style={{ marginTop: "auto", paddingTop: "18px", color: "var(--gh-text-muted)", fontSize: "12px" }}>
                  {event.city} · {event.venue}
                </div>
                {event.officialUrl ? (
                  <a
                    className="messe-home-link"
                    href={event.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: "10px", textDecoration: "none", fontWeight: 700, fontSize: "13px" }}
                  >
                    행사 공식 홈페이지 ↗
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="messe-status-card" style={{ padding: "24px" }}>
            <strong style={{ color: "var(--gh-text)" }}>현재 공식 일정을 불러오지 못했습니다.</strong>
            <p style={{ margin: "8px 0 0", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.6 }}>
              잠시 후 다시 확인하거나 Messe Düsseldorf 공식 일정 페이지를 이용해 주세요.
            </p>
          </div>
        )}
        <p style={{ margin: "14px 0 0", color: "var(--gh-text-muted)", fontSize: "11px", lineHeight: 1.6 }}>
          출처: Messe Düsseldorf 공식 동기화 캘린더 · 일정은 주최사 사정에 따라 변경될 수 있습니다.
        </p>
      </section>

      <section className="messe-status-card" style={{ padding: "26px" }}>
        <h2 style={{ margin: "0 0 8px", color: "var(--gh-text)", fontSize: "18px" }}>GermanHanguk Messe 확장 중</h2>
        <p style={{ margin: "0 0 16px", color: "var(--gh-text-muted)", fontSize: "13px", lineHeight: 1.7 }}>
          현재는 뒤셀도르프 공식 일정을 먼저 연결했습니다. 이후 주요 도시 일정과 한국 참가 정보,
          출장·방문 준비 정보를 같은 구조로 확장합니다.
        </p>
        <Link className="messe-home-link" href="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: "14px" }}>
          ← 정보 홈으로
        </Link>
      </section>
    </main>
  );
}
