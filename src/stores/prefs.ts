"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrefsState {
  /** null = follow automatic detection. */
  lowDataOverride: boolean | null;
  setLowDataOverride: (value: boolean | null) => void;
  storyFontScale: number;
  setStoryFontScale: (value: number) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      lowDataOverride: null,
      setLowDataOverride: (lowDataOverride) => set({ lowDataOverride }),
      storyFontScale: 1,
      setStoryFontScale: (storyFontScale) => set({ storyFontScale }),
    }),
    { name: "veillee-prefs" },
  ),
);

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/** True when the browser reports Save-Data or a 2G/3G connection. */
export function detectLowData(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return false;
  return Boolean(connection.saveData) || /(^|-)(2g|3g)$/.test(connection.effectiveType ?? "");
}
