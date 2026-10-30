"use client";

import { useTranslations } from "next-intl";
import { RECIT_TYPES, type PublicCible, type RecitType } from "@/data/schemas";
import type { Filters } from "@/lib/filters";
import { hasFilters } from "@/lib/filters";

export interface FilterOptions {
  langues: { id: string; nom: string }[];
  themes: { id: string; label: string }[];
}

interface Props {
  filters: Filters;
  options: FilterOptions;
  onChange: (next: Filters) => void;
  resultCount: number;
}

const selectClass =
  "min-h-11 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text";

/** Story filters (type, language, theme, audience); state lives in the URL. */
export function FilterBar({ filters, options, onChange, resultCount }: Props) {
  const t = useTranslations("filters");
  const types = useTranslations("storyTypes");
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end">
      <legend className="sr-only">{t("title")}</legend>
      <label className="col-span-2 text-xs text-muted md:col-span-5">
        {t("search")}
        <input
          type="search"
          value={filters.q ?? ""}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => set({ q: e.target.value || undefined })}
          className={selectClass}
        />
      </label>
      <label className="text-xs text-muted">
        {t("type")}
        <select
          className={selectClass}
          value={filters.type ?? ""}
          onChange={(e) => set({ type: (e.target.value || undefined) as RecitType | undefined })}
        >
          <option value="">{t("all")}</option>
          {RECIT_TYPES.map((type) => (
            <option key={type} value={type}>
              {types(type)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        {t("language")}
        <select
          className={selectClass}
          value={filters.langue ?? ""}
          onChange={(e) => set({ langue: e.target.value || undefined })}
        >
          <option value="">{t("allFem")}</option>
          {options.langues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nom}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        {t("theme")}
        <select
          className={selectClass}
          value={filters.theme ?? ""}
          onChange={(e) => set({ theme: e.target.value || undefined })}
        >
          <option value="">{t("all")}</option>
          {options.themes.map((th) => (
            <option key={th.id} value={th.id}>
              {th.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        {t("audience")}
        <select
          className={selectClass}
          value={filters.public ?? ""}
          onChange={(e) => set({ public: (e.target.value || undefined) as PublicCible | undefined })}
        >
          <option value="">{t("all")}</option>
          <option value="enfant">{t("children")}</option>
          <option value="tout_public">{t("everyone")}</option>
          <option value="adulte">{t("adults")}</option>
        </select>
      </label>
      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:flex-col md:items-end">
        <output aria-live="polite" className="text-sm text-muted">
          {t("results", { count: resultCount })}
        </output>
        {hasFilters(filters) ? (
          <button
            type="button"
            className="text-sm text-accent underline underline-offset-4"
            onClick={() => onChange({})}
          >
            {t("reset")}
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
