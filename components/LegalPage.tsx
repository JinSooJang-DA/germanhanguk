import Link from "next/link";
import type { ReactNode } from "react";
import { legalConfig, legalFields } from "@/lib/legal-config";

export function OperatorFields({ fields }: { fields: string[] }) {
  return <dl className="legal-fields">{fields.map((key) => {
    const value = legalConfig[key];
    return <div key={key}><dt><span lang="de">{legalFields[key][0]}</span><small lang="ko">{legalFields[key][1]}</small></dt><dd>{value ? key === "contactEmail" ? <a href={`mailto:${value}`}>{value}</a> : value : <><span lang="de">Noch nicht hinterlegt — vom Betreiber zu ergänzen bzw. Anwendbarkeit zu bestätigen.</span><small lang="ko">미설정 — 운영자의 실제 정보 또는 적용 여부 확인이 필요합니다.</small></>}</dd></div>;
  })}</dl>;
}

export default function LegalPage({ title, koreanTitle, children }: { title: string; koreanTitle: string; children: ReactNode }) {
  return <main className="legal-page"><Link href="/" className="legal-back">← German Hanguk</Link><header><p className="legal-eyebrow">GERMAN HANGUK</p><h1 lang="de">{title}</h1><p lang="ko">{koreanTitle}</p></header>{children}</main>;
}

export function LegalSection({ title, koreanTitle, de, ko }: { title: string; koreanTitle: string; de: string; ko: string }) {
  return <section><h2 lang="de">{title}</h2><h3 lang="ko">{koreanTitle}</h3><p lang="de">{de}</p><p lang="ko">{ko}</p></section>;
}
