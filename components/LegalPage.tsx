import Link from "next/link";
import type { ReactNode } from "react";
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="legal-page"><Link href="/" className="legal-back">← German Hanguk</Link><header><p className="legal-eyebrow">GERMAN HANGUK</p><h1>{title}</h1></header>{children}</main>;
}
