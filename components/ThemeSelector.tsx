"use client";

import { useEffect, useState } from "react";
import { applyTheme, getThemePreference, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, ThemePreference } from "./ThemeProvider";

const options: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "라이트 모드", icon: "☀" },
  { value: "dark", label: "다크 모드", icon: "☾" },
  { value: "system", label: "시스템 설정", icon: "◐" },
];

export default function ThemeSelector({ mobile = false }: { mobile?: boolean }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  useEffect(() => {
    const sync = () => setPreference(getThemePreference(localStorage.getItem(THEME_STORAGE_KEY)));
    sync(); window.addEventListener(THEME_CHANGE_EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(THEME_CHANGE_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const select = (value: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, value); applyTheme(value); setPreference(value);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };
  return <div className={`theme-selector${mobile ? " theme-selector-mobile" : ""}`} role="radiogroup" aria-label="화면 테마">
    {options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={preference === option.value} title={option.label} onClick={() => select(option.value)} className={preference === option.value ? "is-selected" : ""}>
      <span aria-hidden="true">{option.icon}</span><span className="theme-selector-label">{option.label}</span>
    </button>)}
  </div>;
}
