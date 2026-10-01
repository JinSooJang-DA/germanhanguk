"use client";

import { ReactNode, useEffect } from "react";

export type ThemePreference = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "germanhanguk-theme";
export const THEME_CHANGE_EVENT = "germanhanguk-theme-change";

export function getThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    : preference;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-preference", preference);
  // `only light` prevents Chrome's forced/auto darkening from repainting the explicit light theme.
  root.style.colorScheme = resolved === "light" ? "only light" : "dark";
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const syncTheme = () => applyTheme(getThemePreference(localStorage.getItem(THEME_STORAGE_KEY)));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getThemePreference(localStorage.getItem(THEME_STORAGE_KEY)) === "system") syncTheme();
    };
    syncTheme();
    const observer = new MutationObserver(() => {
      const preference = getThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
      const expected = preference === "system"
        ? media.matches ? "dark" : "light"
        : preference;
      if (document.documentElement.dataset.theme !== expected) applyTheme(preference);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", onMediaChange);
    window.addEventListener("storage", syncTheme);
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMediaChange);
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
    };
  }, []);
  return <>{children}</>;
}
