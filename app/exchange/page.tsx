import type { Metadata } from "next";
import Link from "next/link";
import ExchangeCalculator from "@/components/ExchangeCalculator";
import { getEurKrwRate } from "@/lib/exchange/ecb";

export const metadata: Metadata = {
  title: "유로 원 환율 계산기 - GermanHanguk",
  description: "ECB 기준 EUR/KRW 환율과 유로·원화 양방향 환율 계산기를 확인하세요.",
};

const won = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

export default async function ExchangePage() {
  let data;
  try {
    data = await getEurKrwRate();
  } catch (error) {
    console.error("ECB exchange-rate load failed:", error);
  }

  if (!data) {
    return (
      <main className="exchange-page">
        <Link className="exchange-back" href="/">← 정보 홈으로</Link>
        <section className="exchange-card"><h1>환율 정보를 불러오지 못했습니다.</h1><p>잠시 후 다시 확인해 주세요.</p></section>
      </main>
    );
  }
  const change = data.previous ? data.latest.rate - data.previous.rate : 0;
  const changePercent = data.previous ? (change / data.previous.rate) * 100 : 0;
  const direction = change > 0 ? "+" : "";

  return (
    <main className="exchange-page">
      <Link className="exchange-back" href="/">← 정보 홈으로</Link>
      <header className="exchange-hero">
        <span>EUR ↔ KRW</span>
        <h1>유로 · 원 환율</h1>
        <p>한국과 독일 사이에서 오늘 필요한 환율을 빠르게 확인하고 바로 계산해 보세요.</p>
      </header>

      <section className="exchange-card exchange-rate-card">
        <div>
          <span className="exchange-label">ECB 기준환율 · {data.latest.date}</span>
          <strong className="exchange-rate">1 € = {won.format(data.latest.rate)} 원</strong>
        </div>
        {data.previous && (
          <div className={`exchange-change ${change >= 0 ? "up" : "down"}`}>
            전 영업일 대비 {direction}{won.format(change)}원 ({direction}{changePercent.toFixed(2)}%)
          </div>
        )}
      </section>
      <section className="exchange-card">
        <div className="exchange-section-title">
          <span>환율 계산기</span>
          <h2>유로와 원화를 바로 계산해 보세요</h2>
        </div>
        <ExchangeCalculator rate={data.latest.rate} history={data.history} />
      </section>

      <p className="exchange-source-note">
        출처: European Central Bank (ECB) 유로 기준환율. ECB 기준환율은 정보 제공용이며 실제 은행·카드·송금 서비스의 적용 환율과 수수료는 다를 수 있습니다.
      </p>
      <a className="exchange-source-link" href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noreferrer">
        ECB 공식 환율 확인 ↗
      </a>
    </main>
  );
}
