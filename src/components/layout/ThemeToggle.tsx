"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { setTheme, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useTheme();
  const next = theme === "nuit" ? "jour" : "nuit";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "jour" ? t("day") : t("night")}
      title={t("toggle")}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
    >
      {theme === "nuit" ? <Sun aria-hidden size={20} /> : <Moon aria-hidden size={20} />}
    </button>
  );
}
