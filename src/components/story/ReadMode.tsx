"use client";

import { AArrowDown, AArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePrefs } from "@/stores/prefs";

export interface ReadColumn {
  langue: string;
  lang: string;
  paragraphs: string[];
}

const SCALES = [0.875, 1, 1.125, 1.25, 1.5];

/** Full text, national language and French side by side (stacked on mobile). */
export function ReadMode({ columns }: { columns: ReadColumn[] }) {
  const t = useTranslations("read");
  const scale = usePrefs((s) => s.storyFontScale);
  const setScale = usePrefs((s) => s.setStoryFontScale);
  const index = Math.max(0, SCALES.indexOf(scale));
  const withText = columns.filter((c) => c.paragraphs.length > 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2" role="group" aria-label={t("textSize")}>
        <span className="text-sm text-muted">{t("textSize")}</span>
        <button
          type="button"
          aria-label={t("smaller")}
          disabled={index === 0}
          onClick={() => setScale(SCALES[index - 1]!)}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border disabled:opacity-40"
        >
          <AArrowDown aria-hidden size={18} />
        </button>
        <button
          type="button"
          aria-label={t("larger")}
          disabled={index === SCALES.length - 1}
          onClick={() => setScale(SCALES[index + 1]!)}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border disabled:opacity-40"
        >
          <AArrowUp aria-hidden size={18} />
        </button>
      </div>

      {withText.length === 1 && columns.length > 1 ? (
        <p className="mb-4 text-sm text-muted">{t("single", { langue: withText[0]!.langue })}</p>
      ) : null}

      <div className={`grid gap-8 ${columns.length > 1 ? "md:grid-cols-2" : ""}`}>
        {columns.map((col) => (
          <section key={col.lang} aria-label={t("inLanguage", { langue: col.langue })}>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-muted uppercase">{col.langue}</h3>
            {col.paragraphs.length > 0 ? (
              <div lang={col.lang} className="prose-conte space-y-3">
                {col.paragraphs.map((p, i) => (
                  <p key={i} style={{ fontSize: `calc(var(--fs-md) * ${scale})` }}>
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted">{t("notYet")}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
