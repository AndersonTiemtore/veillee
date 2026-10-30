"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { filtersToQuery, matches, parseFilters, type Filterable, type Filters } from "@/lib/filters";
import { FilterBar, type FilterOptions } from "@/components/ui/FilterBar";
import { Calebasse } from "@/components/ui/Pictogram";
import { StoryCardView, type CardView } from "./StoryCardView";

export interface CatalogueItem extends Filterable {
  card: CardView;
  duree: number;
  dateCollecte?: string;
}

const SORTS = ["recent", "titre", "duree"] as const;
type Sort = (typeof SORTS)[number];

const compare: Record<Sort, (a: CatalogueItem, b: CatalogueItem) => number> = {
  // Undated stories (not yet collected) come last.
  recent: (a, b) =>
    (b.dateCollecte ?? "").localeCompare(a.dateCollecte ?? "") || a.titre.localeCompare(b.titre, "fr"),
  titre: (a, b) => a.titre.localeCompare(b.titre, "fr"),
  duree: (a, b) => b.duree - a.duree || a.titre.localeCompare(b.titre, "fr"),
};

export function Catalogue({ items, options }: { items: CatalogueItem[]; options: FilterOptions }) {
  const t = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = parseFilters(params);
  const sortParam = params.get("tri");
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "recent";

  const shown = useMemo(
    () => items.filter((i) => matches(i, filters)).sort(compare[sort]),
    [items, filters, sort],
  );

  function navigate(next: Filters, nextSort: Sort = sort) {
    const q = new URLSearchParams(filtersToQuery(next).slice(1));
    if (nextSort !== "recent") q.set("tri", nextSort);
    const s = q.toString();
    router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <FilterBar filters={filters} options={options} onChange={(f) => navigate(f)} resultCount={shown.length} />
      </div>

      <label className="flex items-center gap-2 self-end text-sm">
        {t("sort")}
        <select
          value={sort}
          onChange={(e) => navigate(filters, e.target.value as Sort)}
          className="min-h-11 rounded-full border border-border bg-surface px-3"
        >
          <option value="recent">{t("sortRecent")}</option>
          <option value="titre">{t("sortTitle")}</option>
          <option value="duree">{t("sortDuration")}</option>
        </select>
      </label>

      {shown.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <li key={i.card.id}>
              <StoryCardView card={i.card} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Calebasse aria-hidden width={48} height={48} className="text-accent" />
          <p className="font-bold">{t("empty")}</p>
          <p className="text-muted">{t("emptyHint")}</p>
          <button type="button" className="btn-cta" onClick={() => navigate({})}>
            {t("reset")}
          </button>
        </div>
      )}
    </div>
  );
}
