"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Flamme } from "@/components/ui/Pictogram";

const SEEN_KEY = "veillee-intro-vue";
const DURATION_MS = 1800;

const noop = () => () => {};
/** Show once per session, never when motion is reduced. */
function shouldShow(): boolean {
  try {
    return (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !sessionStorage.getItem(SEEN_KEY)
    );
  } catch {
    return false;
  }
}

/**
 * Entrance animation (< 2 s, skippable): the fire lights up and the welcome
 * line appears. Animated SVG — the fallback planned for a Rive animation,
 * used as long as no .riv illustration has been produced.
 */
export function IntroFire({ welcome }: { welcome: string }) {
  const t = useTranslations("home");
  const wanted = useSyncExternalStore(noop, shouldShow, () => false);
  const [done, setDone] = useState(false);
  const visible = wanted && !done;

  useEffect(() => {
    if (!wanted) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage unavailable: the intro may simply replay.
    }
    const timer = setTimeout(() => setDone(true), DURATION_MS);
    return () => clearTimeout(timer);
  }, [wanted]);

  if (!visible) return null;
  return (
    <div className="intro-fire fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-nuit text-karite">
      <Flamme aria-hidden className="intro-flame text-flamme" width={120} height={120} />
      <p className="intro-text max-w-md px-6 text-center font-display text-2xl">{welcome}</p>
      <button
        type="button"
        onClick={() => setDone(true)}
        className="absolute right-4 bottom-6 min-h-11 rounded-full border border-[rgb(244_234_213/0.4)] px-4 text-sm"
      >
        {t("skipIntro")}
      </button>
    </div>
  );
}
