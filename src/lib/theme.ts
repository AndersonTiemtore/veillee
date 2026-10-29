"use client";

import { useSyncExternalStore } from "react";

export type Theme = "jour" | "nuit";
export const DEFAULT_THEME: Theme = "jour";
export const THEME_STORAGE_KEY = "veillee-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const read = (): Theme => (document.documentElement.dataset.theme === "nuit" ? "nuit" : "jour");

/** Current theme, following changes to `<html data-theme>`. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_THEME);
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing: the choice simply won't persist.
  }
}
