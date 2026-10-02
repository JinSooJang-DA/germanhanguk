type BankRow = {
  bank: string;
  product: string;
  fee: string;
  card: string;
  note: string;
  href: string;
};

const VERIFIED_AT = "2026-10-02";

const BANKS: BankRow[] = [
  {
    bank: "Deutsche Bank",
    product: "Das Junge Konto",
    fee: "학생 등 대상자는 만 30세까지 월 기본료 0€ (EU 내 신고주소 등 조건 확인)",
    card: "Deutsche Bank Debitkarte 포함",
    note: "지점·Cash Group 이용을 함께 원하는 학생이 비교해볼 만한 전통은행형 계좌",
    href: "https://www.deutsche-bank.de/pk/konto-und-karte/konten-im-ueberblick/jungeleute.html",
  },
  {
    bank: "Commerzbank",
    product: "StartKonto",
    fee: "학생·Ausbildung 등 증빙 시 만 28세 전까지 월 0€",
    card: "Girocard 포함 · Young Visa는 별도 요건 확인",
    note: "지점과 Cash Group 현금 이용이 필요한 학생은 수수료 조건을 함께 확인",
    href: "https://www.commerzbank.de/privatkunden/girokonten/azubi-studentenkonto/",
  },
  {
    bank: "ING",
    product: "Girokonto",
    fee: "만 28세 미만 또는 월 1,000€ 이상 입금 시 0€ · 그 외 월 4.90€",
    card: "Visa Debit 포함 · Girocard 선택 시 월 1.49€",
    note: "온라인 중심 계좌. 현금 입출금 방식과 최소 인출금액을 생활패턴에 맞춰 확인",
    href: "https://www.ing.de/girokonto/konditionen/",
  },
  {
    bank: "DKB",
    product: "Girokonto",
    fee: "만 28세 미만 또는 월 700€ 이상 입금 시 0€",
    card: "Visa Debit 포함 · Girocard 선택 시 월 0.99€",
    note: "월 700€ 입금 시 Aktivstatus가 적용되므로 해외결제·인출 조건도 함께 비교",
    href: "https://www.dkb.de/privatkunden/girokonto",
  },
  {
    bank: "N26",
    product: "Standard",
    fee: "월 계좌관리비 0€ · 최소 월 입금조건 없음",
    card: "Virtual Mastercard Debit 포함 · 실물카드 발급 10€",
    note: "모바일 중심. Standard는 유로 ATM 무료 인출 횟수와 현금 서비스 조건을 확인",
    href: "https://n26.com/de-de/kostenloses-girokonto",
  },
];

export default function GuideBankComparison() {
  return (
    <section className="guide-bank-comparison" aria-labelledby="bank-comparison-title">      <div className="guide-bank-comparison-head">
        <div>
          <span className="guide-bank-kicker">GIROKONTO CHECK</span>
          <h2 id="bank-comparison-title">대표 은행 계좌 조건 비교</h2>
        </div>
        <span className="guide-bank-verified">확인 {VERIFIED_AT}</span>
      </div>
      <p className="guide-bank-intro">
        아래는 추천 순위가 아니라 독일 생활자가 많이 비교하는 계좌의 공식 조건 요약입니다. 나이·학생 신분·월 입금액·카드·현금 이용 방식에 따라 실제 비용이 달라질 수 있습니다.
      </p>
      <div className="guide-bank-list">
        {BANKS.map((row) => (
          <article className="guide-bank-row" key={row.bank}>
            <div className="guide-bank-name">
              <strong>{row.bank}</strong>
              <span>{row.product}</span>
            </div>
            <div className="guide-bank-detail">
              <span className="guide-bank-label">계좌관리비</span>
              <p>{row.fee}</p>
            </div>
            <div className="guide-bank-detail">
              <span className="guide-bank-label">카드</span>
              <p>{row.card}</p>
            </div>
            <p className="guide-bank-note">{row.note}</p>            <a href={row.href} target="_blank" rel="noopener noreferrer" className="guide-bank-source">
              공식 조건 확인 ↗
            </a>
          </article>
        ))}
      </div>
      <div className="guide-bank-basiskonto">
        <strong>계좌 개설이 잘 되지 않는다면</strong>
        <p>
          일반 Girokonto와 별개로, EU에 합법적으로 체류하고 독일에 사용할 수 있는 지급계좌가 없는 소비자는 원칙적으로 ZKG에 따른 Basiskonto를 신청할 권리가 있습니다. 무료계좌라는 뜻은 아니므로 비용과 거절 가능 사유는 BaFin 안내에서 확인하세요.
        </p>
        <a href="https://kontenvergleich.bafin.de/de/glossar/basiskonto-nach-dem-zkg" target="_blank" rel="noopener noreferrer">
          BaFin Basiskonto 안내 ↗
        </a>
      </div>
      <p className="guide-bank-footnote">
        조건은 변경될 수 있습니다. GermanHanguk은 계좌 개설 전 각 은행의 최신 Preis- und Leistungsverzeichnis와 BaFin 계좌 비교를 다시 확인할 것을 권합니다.
      </p>
    </section>
  );
}
