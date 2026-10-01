import Link from "next/link";
import { getUpcomingMesseEvents } from "@/lib/messe/repository";
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

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

async function loadUpcomingEvents(): Promise<MesseEventCandidate[]> {
  try {
    return await getUpcomingMesseEvents(100);
  } catch (error) {
    console.error("Messe database read failed; using official calendar fallback:", error);
    const fallback = await fetchMesseDuesseldorfEvents();
    const today = berlinToday();
    return fallback.events
      .filter((event) => event.endsOn >= today)
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  }
}

export default async function MessePage() {
  const allUpcoming = await loadUpcomingEvents();
  const upcoming = allUpcoming.slice(0, 12);
  const nextEvent = upcoming[0];

  return (
    <main className="messe-page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 20px 80px" }}>
      <div className="messe-hero" style={{ maxWidth: "820px", marginBottom: "34px" }}>
        <span className="messe-kicker" style={{ fontSize: "13px", fontWeight: 700 }}>GERMANHANGUK MESSE</span>
        <h1 style={{ margin: "10px 0 12px", fontSize: "34px", color: "var(--gh-text)", letterSpacing: "-0.03em" }}>
          독일 메세 · 박람회
        </h1>
        <p style={{ margin: 0, color: "var(--gh-text-muted)", lineHeight: 1.75, fontSize: "15px" }}>
          독일 출장자와 현지 방문자를 위해 공식 주최사 일정을 모아 한눈에 확인할 수 있게 정리합니다.
          현재는 뒤셀도르프를 시작으로 운영하며 주요 Messe 도시를 순차적으로 확장합니다.
        </p>
      </div>

      {nextEvent ? (
        <section className="messe-next-card" style={{ marginBottom: "36px", padding: "24px 26px" }}>
          <div className="messe-next-layout">
            <div>
              <span className="messe-kicker" style={{ fontSize: "11px", fontWeight: 800 }}>NEXT IN DÜSSELDORF</span>
              <h2 style={{ margin: "7px 0 6px", fontSize: "22px", color: "var(--gh-text)" }}>{nextEvent.title}</h2>
              <p style={{ margin: 0, color: "var(--gh-text-muted)", fontSize: "13px" }}>
                {formatRange(nextEvent)} · {nextEvent.venue}
              </p>
            </div>
            {nextEvent.officialUrl ? (
              <a className="messe-primary-link" href={nextEvent.officialUrl} target="_blank" rel="noreferrer">
                공식 홈페이지 ↗
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section style={{ marginBottom: "42px" }}>
        <div className="messe-section-heading">
          <div>
            <span className="messe-kicker" style={{ fontSize: "12px", fontWeight: 700 }}>DÜSSELDORF</span>
            <h2 style={{ margin: "6px 0 0", color: "var(--gh-text)", fontSize: "22px" }}>다가오는 전시회</h2>
            {allUpcoming.length > 0 ? (
              <p style={{ margin: "5px 0 0", color: "var(--gh-text-subtle)", fontSize: "12px" }}>
                현재 확인 가능한 예정 일정 {allUpcoming.length}개 · 가까운 일정부터 표시
              </p>
            ) : null}
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
          <div className="messe-event-grid">
            {upcoming.map((event) => (
              <article className="messe-feature-card" key={`${event.sourceProvider}:${event.sourceEventId}`}>
                <div className="messe-event-date">{formatRange(event)}</div>
                <h3>{event.title}</h3>
                {event.summary ? <p>{event.summary}</p> : null}
                <div className="messe-event-venue">{event.city} · {event.venue}</div>
                {event.officialUrl ? (
                  <a className="messe-home-link" href={event.officialUrl} target="_blank" rel="noreferrer">
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
        <p className="messe-source-note">
          출처: Messe Düsseldorf 공식 캘린더 · GermanHanguk 동기화 데이터 · 일정은 주최사 사정에 따라 변경될 수 있습니다.
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
