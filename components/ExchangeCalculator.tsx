"use client";

import { useMemo, useState } from "react";
import type { ExchangePoint } from "@/lib/exchange/ecb";

type Props = {
  rate: number;
  history: ExchangePoint[];
};

const won = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const euro = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

function numberValue(value: string): number {
  const normalized = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  return Number(normalized) || 0;
}

export default function ExchangeCalculator({ rate, history }: Props) {
  const [eur, setEur] = useState("1000");
  const [krw, setKrw] = useState(String(Math.round(rate * 1000)));

  const chart = useMemo(() => {
    if (history.length < 2) return "";
    const values = history.map((point) => point.rate);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 38 - ((value - min) / span) * 34;
      return `${x},${y}`;
    }).join(" ");
  }, [history]);
  function changeEuro(value: string) {
    setEur(value);
    setKrw(String(Math.round(numberValue(value) * rate)));
  }

  function changeWon(value: string) {
    setKrw(value);
    const converted = numberValue(value) / rate;
    setEur(converted ? converted.toFixed(2) : "");
  }

  function chooseEuro(value: number) {
    setEur(String(value));
    setKrw(String(Math.round(value * rate)));
  }

  return (
    <div className="exchange-tool">
      <div className="exchange-fields">
        <label>
          <span>🇪🇺 유로 EUR</span>
          <div><b>€</b><input inputMode="decimal" value={eur} onChange={(event) => changeEuro(event.target.value)} /></div>
        </label>
        <span className="exchange-equals" aria-hidden="true">⇄</span>
        <label>
          <span>🇰🇷 원화 KRW</span>
          <div><b>₩</b><input inputMode="numeric" value={krw} onChange={(event) => changeWon(event.target.value)} /></div>
        </label>
      </div>
      <div className="exchange-quick">
        {[100, 500, 1000, 1500].map((value) => (
          <button type="button" key={value} onClick={() => chooseEuro(value)}>{euro.format(value)} €</button>
        ))}
      </div>

      <div className="exchange-result-line">
        {numberValue(eur) > 0 ? <><strong>{euro.format(numberValue(eur))} €</strong><span>≈</span><strong>{won.format(numberValue(eur) * rate)} 원</strong></> : "금액을 입력하세요"}
      </div>

      {chart && (
        <div className="exchange-chart" aria-label="최근 30 영업일 EUR KRW 환율 추이">
          <div className="exchange-chart-head"><strong>최근 30 영업일</strong><span>{won.format(Math.min(...history.map((p) => p.rate)))} ~ {won.format(Math.max(...history.map((p) => p.rate)))}원</span></div>
          <svg viewBox="0 0 100 42" preserveAspectRatio="none" role="img">
            <polyline points={chart} fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="exchange-chart-dates"><span>{history[0]?.date}</span><span>{history.at(-1)?.date}</span></div>
        </div>
      )}
    </div>
  );
}
