"use client";

import { useEffect, useState } from "react";

type Props = {
  ko: string;
  de: string;
  intervalMs?: number;
};

export default function BilingualButtonText({ ko, de, intervalMs = 2500 }: Props) {
  const [showGerman, setShowGerman] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const timer = window.setInterval(() => setShowGerman((value) => !value), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return (
    <span className="bilingual-button-text" aria-label={`${ko} / ${de}`}>
      <span aria-hidden="true" className={showGerman ? "is-hidden" : "is-visible"}>{ko}</span>
      <span aria-hidden="true" className={showGerman ? "is-visible" : "is-hidden"}>{de}</span>
    </span>
  );
}
