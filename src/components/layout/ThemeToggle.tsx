"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

type Theme = "nuit" | "jour";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = (): Theme =>
  document.documentElement.dataset.theme === "jour" ? "jour" : "nuit";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useSyncExternalStore(subscribe, getTheme, () => "nuit" as Theme);
  const next: Theme = theme === "nuit" ? "jour" : "nuit";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("veillee-theme", next);
    } catch {
      // Private browsing: the choice simply won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "jour" ? t("day") : t("night")}
      title={t("toggle")}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text"
    >
      {theme === "nuit" ? <Sun aria-hidden size={20} /> : <Moon aria-hidden size={20} />}
    </button>
  );
}
