import "server-only";

const ECB_90_DAY_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml";

export type ExchangePoint = {
  date: string;
  rate: number;
};

export type ExchangeRateData = {
  latest: ExchangePoint;
  previous: ExchangePoint | null;
  history: ExchangePoint[];
};

function parseKrwHistory(xml: string): ExchangePoint[] {
  const points: ExchangePoint[] = [];
  const dayPattern = /<Cube time="(\d{4}-\d{2}-\d{2})">([\s\S]*?)<\/Cube>/g;

  for (const match of xml.matchAll(dayPattern)) {
    const krw = match[2].match(/<Cube currency="KRW" rate="([0-9.]+)"\/>/);
    if (!krw) continue;
    const rate = Number(krw[1]);
    if (Number.isFinite(rate)) points.push({ date: match[1], rate });
  }

  return points;
}
export async function getEurKrwRate(): Promise<ExchangeRateData> {
  const response = await fetch(ECB_90_DAY_URL, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/xml, text/xml" },
  });

  if (!response.ok) {
    throw new Error(`ECB exchange-rate request failed: ${response.status}`);
  }

  const points = parseKrwHistory(await response.text());
  if (points.length === 0) throw new Error("ECB KRW exchange-rate data is empty.");

  return {
    latest: points[0],
    previous: points[1] ?? null,
    history: points.slice(0, 31).reverse(),
  };
}
