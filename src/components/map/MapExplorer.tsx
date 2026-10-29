"use client";

import { Mountain, X } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import type { PublicCible, RecitType } from "@/data/schemas";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { filtersToQuery, matches, parseFilters, type Filters } from "@/lib/filters";
import { TYPE_COLORS } from "@/lib/map/style";
import { detectLowData, usePrefs } from "@/stores/prefs";
import { FilterBar, type FilterOptions } from "@/components/ui/FilterBar";
import { StoryTypeIcon } from "@/components/ui/Pictogram";

export interface MapStory {
  id: string;
  slug: string;
  titre: string;
  type: RecitType;
  regionIds: string[];
  langueIds: string[];
  themeIds: string[];
  publicCible: PublicCible;
}

export interface MapRegion {
  id: string;
  slug: string;
  nom: string;
  chefLieu: string;
  langues: string[];
  ethnies: string[];
  instruments: string[];
  sites: string[];
  siteCount: number;
}

interface Props {
  regions: MapRegion[];
  stories: MapStory[];
  options: FilterOptions;
}

const StoryMap = dynamic(() => import("./StoryMap"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  const t = useTranslations("map");
  return (
    <div className="flex h-full items-center justify-center text-muted" aria-hidden>
      {t("loading")}
    </div>
  );
}

const noop = () => () => {};

export function MapExplorer({ regions, stories, options }: Props) {
  const t = useTranslations("map");
  const tr = useTranslations("region");
  const types = useTranslations("storyTypes");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters = parseFilters(params);
  const selectedSlug = params.get("region") ?? undefined;
  const mode3d = params.get("vue") === "3d";
  const selected = regions.find((r) => r.slug === selectedSlug);

  const autoLowData = useSyncExternalStore(noop, detectLowData, () => false);
  const lowDataOverride = usePrefs((s) => s.lowDataOverride);
  const setLowDataOverride = usePrefs((s) => s.setLowDataOverride);
  const lowData = lowDataOverride ?? autoLowData;

  const visible = useMemo(() => stories.filter((s) => matches(s, filters)), [stories, filters]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of visible) for (const r of s.regionIds) c[r] = (c[r] ?? 0) + 1;
    return c;
  }, [visible]);

  function navigate(next: { filters?: Filters; region?: string | null; vue?: "2d" | "3d" }) {
    const q = new URLSearchParams(filtersToQuery(next.filters ?? filters).slice(1));
    const region = next.region === undefined ? selectedSlug : next.region;
    if (region) q.set("region", region);
    const vue = next.vue ?? (mode3d ? "3d" : "2d");
    if (vue === "3d") q.set("vue", "3d");
    const s = q.toString();
    router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
  }

  const selectRegion = (id: string | undefined) =>
    navigate({ region: regions.find((r) => r.id === id)?.slug ?? null });

  const regionStories = selected ? visible.filter((s) => s.regionIds.includes(selected.id)) : [];

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        filters={filters}
        options={options}
        onChange={(f) => navigate({ filters: f })}
        resultCount={visible.length}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label={t("modeLabel")} className="pill inline-flex border border-border p-1">
          {(["2d", "3d"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={(v === "3d") === mode3d}
              disabled={v === "3d" && lowData}
              onClick={() => navigate({ vue: v })}
              className="pill inline-flex min-h-9 items-center gap-1 px-4 text-sm aria-pressed:bg-cta aria-pressed:text-cta-text disabled:opacity-50"
            >
              {v === "3d" ? <Mountain aria-hidden size={16} /> : null}
              {v === "3d" ? t("mode3d") : t("mode2d")}
            </button>
          ))}
        </div>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--accent)]"
            checked={lowData}
            onChange={(e) => setLowDataOverride(e.target.checked)}
          />
          {t("lowData")}
          {lowDataOverride === null && autoLowData ? (
            <span className="text-xs text-muted">({t("lowDataAuto")})</span>
          ) : null}
        </label>
        <ul aria-label={t("legend")} className="ml-auto hidden flex-wrap gap-3 text-xs text-muted sm:flex">
          {(["conte", "legende", "mythe_fondateur", "recit_historique"] as const).map((type) => (
            <li key={type} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-full" style={{ background: TYPE_COLORS[type] }} />
              {types(type)}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div
          className="card h-[60vh] min-h-[22rem] overflow-hidden lg:h-[70vh]"
          role="region"
          aria-label={t("canvasLabel")}
        >
          <StoryMap
            counts={counts}
            visibleStoryIds={visible.map((s) => s.id)}
            selectedRegionId={selected?.id}
            onSelectRegion={selectRegion}
            onOpenStory={(slug) => router.push(`/contes/${slug}`)}
            mode3d={mode3d}
            lowData={lowData}
            labels={{
              canvas: t("canvasLabel"),
              stories: (count) => t("storiesCount", { count }),
              chefLieu: (name) => t("chefLieu", { name }),
              error: t("error"),
            }}
          />
        </div>

        {selected ? (
          <aside
            aria-labelledby="panneau-region"
            className="card fixed inset-x-0 bottom-0 z-30 max-h-[65vh] overflow-y-auto rounded-b-none p-5 shadow-glow lg:static lg:max-h-[70vh] lg:rounded-b-[var(--r-card)]"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="panneau-region" className="text-xl font-bold">
                  {selected.nom}
                </h2>
                <p className="text-sm text-muted">{t("chefLieu", { name: selected.chefLieu })}</p>
              </div>
              <button
                type="button"
                onClick={() => selectRegion(undefined)}
                aria-label={t("closePanel")}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover"
              >
                <X aria-hidden size={20} />
              </button>
            </div>

            <h3 className="mb-2 text-base text-accent">{tr("stories")}</h3>
            {regionStories.length > 0 ? (
              <ul className="mb-5 space-y-2">
                {regionStories.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/contes/${s.slug}`}
                      className="flex items-center gap-2 rounded-card p-2 hover:bg-surface-hover"
                    >
                      <StoryTypeIcon type={s.type} style={{ color: TYPE_COLORS[s.type] }} />
                      <span>
                        <span className="block font-bold">{s.titre}</span>
                        <span className="text-xs text-muted">{types(s.type)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-5 text-sm text-muted">{tr("noStories")}</p>
            )}

            <PanelList title={tr("languages")} items={selected.langues} empty={tr("none")} />
            <PanelList title={tr("ethnies")} items={selected.ethnies} empty={tr("none")} />
            <PanelList title={tr("instruments")} items={selected.instruments} empty={tr("none")} />
            <PanelList
              title={tr("sites")}
              items={selected.sites}
              empty={tr("none")}
              more={selected.siteCount > selected.sites.length ? tr("moreSites", { count: selected.siteCount - selected.sites.length }) : undefined}
            />

            <Link href={`/regions/${selected.slug}`} className="btn-cta mt-2">
              {t("seeRegion")}
            </Link>
          </aside>
        ) : null}
      </div>

      <section aria-labelledby="liste-regions">
        <h2 id="liste-regions" className="text-xl font-bold">
          {t("regionList")}
        </h2>
        <p className="mb-4 text-sm text-muted">{t("regionListHint")}</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((r) => {
            const n = counts[r.id] ?? 0;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={r.id === selected?.id}
                  onClick={() => selectRegion(r.id)}
                  className={`card flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-surface-hover aria-pressed:border-[var(--accent)] ${n === 0 ? "opacity-70" : ""}`}
                >
                  <span>
                    <span className="block font-bold">{r.nom}</span>
                    <span className="text-xs text-muted">{r.chefLieu}</span>
                  </span>
                  <span className="text-sm text-muted">{t("storiesCount", { count: n })}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function PanelList({ title, items, empty, more }: { title: string; items: string[]; empty: string; more?: string }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1 text-sm font-bold">{title}</h3>
      <p className="text-sm text-muted">
        {items.length > 0 ? items.join(" · ") : empty}
        {more ? ` ${more}` : null}
      </p>
    </div>
  );
}
