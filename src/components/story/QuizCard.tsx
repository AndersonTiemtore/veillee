"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { Quiz } from "@/lib/quiz";

/** One comprehension question; `big` gives large touch targets (youth space). */
export function QuizCard({ quiz, lang, big = false }: { quiz: Quiz; lang?: string; big?: boolean }) {
  const t = useTranslations("quiz");
  const [picked, setPicked] = useState<number>();
  const id = useId();
  const right = picked === quiz.answer;

  return (
    <fieldset className="card p-5" aria-describedby={`${id}-feedback`}>
      <legend className="sr-only">{t("title")}</legend>
      <p className="mb-1 text-sm font-bold text-accent">{t("title")}</p>
      <p className="prose-conte mb-4" lang={lang}>
        {t("question", { context: quiz.context })}
      </p>
      <div className={`grid gap-3 ${big ? "sm:grid-cols-2" : ""}`}>
        {quiz.options.map((option, i) => {
          const state = picked === i ? (i === quiz.answer ? "right" : "wrong") : undefined;
          return (
            <button
              key={option}
              type="button"
              lang={lang}
              aria-pressed={picked === i}
              disabled={right}
              onClick={() => setPicked(i)}
              className={`flex items-center justify-between gap-3 rounded-[var(--r-card)] border-2 px-4 text-left font-bold transition-colors ${
                big ? "min-h-20 text-lg" : "min-h-12"
              } ${
                state === "right"
                  ? "border-[var(--savane-fort)] bg-[color-mix(in_srgb,var(--savane)_18%,transparent)]"
                  : state === "wrong"
                    ? "border-[var(--laterite)]"
                    : "border-border hover:bg-surface-hover"
              }`}
            >
              {option}
              {state === "right" ? <Check aria-hidden /> : state === "wrong" ? <X aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <p id={`${id}-feedback`} aria-live="polite" className="mt-3 min-h-6 font-bold">
        {picked === undefined ? "" : right ? t("right") : t("wrong")}
      </p>
      {right ? (
        <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={() => setPicked(undefined)}>
          {t("again")}
        </button>
      ) : null}
    </fieldset>
  );
}
