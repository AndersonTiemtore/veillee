"use client";

import { Crosshair, Layers, Mountain, Pause, Play, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { RECIT_TYPES, type PublicCible, type RecitType } from "@/data/schemas";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useReducedMotion } from "@/lib/a11y/motion";
import { filtersToQuery, hasFilters, matches, parseFilters, type Filters } from "@/lib/filters";
import { typeColor } from "@/lib/map/style";
import { detectLowData, usePrefs } from "@/stores/prefs";
import type { FilterOptions } from "@/components/ui/FilterBar";
import { StoryTypeIcon } from "@/components/ui/Pictogram";
import type { MapLayers } from "./StoryMap";

export interface MapStory {
  id: string;
  slug: string;
  titre: string;
  type: RecitType;
  regionIds: string[];
  langueIds: string[];
  themeIds: string[];
  publicCible: PublicCible;
  lieu?: [number, number];
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
    <div className="flex h-full items-center justify-center" aria-hidden>
      <span className="float-panel px-5 py-3 font-bold">{t("loading")}</span>
    </div>
  );
}

const noop = () => () => {};
const TOUR_STEP_MS = 5000;
// Main types shown as chips; fables are found under "conte".
const TYPE_CHIPS = RECIT_TYPES.filter((type) => type !== "fable");

export function MapExplorer({ regions, stories, options }: Props) {
  const t = useTranslations("map");
  const tf = useTranslations("filters");
  const tr = useTranslations("region");
  const types = useTranslations("storyTypes");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reducedMotion = useReducedMotion();

  const filters = parseFilters(params);
  const selectedSlug = params.get("region") ?? undefined;
  const mode3d = params.get("vue") === "3d";
  const selected = regions.find((r) => r.slug === selectedSlug);

  const autoLowData = useSyncExternalStore(noop, detectLowData, () => false);
  const lowDataOverride = usePrefs((s) => s.lowDataOverride);
  const setLowDataOverride = usePrefs((s) => s.setLowDataOverride);
  const lowData = lowDataOverride ?? autoLowData;

  const [layers, setLayers] = useState<MapLayers>({ relief: false, sites: false });
  const [layersOpen, setLayersOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [tourIndex, setTourIndex] = useState<number | null>(null);

  const visible = useMemo(() => stories.filter((s) => matches(s, filters)), [stories, filters]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of visible) for (const r of s.regionIds) c[r] = (c[r] ?? 0) + 1;
    return c;
  }, [visible]);
  const stats = {
    recits: visible.length,
    langues: new Set(visible.flatMap((s) => s.langueIds)).size,
    regions: Object.keys(counts).length,
  };

  // Guided tour over the visible, located stories.
  const tourStops = useMemo(() => visible.filter((s) => s.lieu), [visible]);
  const tourStory = tourIndex === null ? undefined : tourStops[tourIndex];
  useEffect(() => {
    if (tourIndex === null) return;
    const timer = setTimeout(() => {
      setTourIndex((i) => (i === null || i + 1 >= tourStops.length ? null : i + 1));
    }, TOUR_STEP_MS);
    return () => clearTimeout(timer);
  }, [tourIndex, tourStops.length]);

  function navigate(next: { filters?: Filters; region?: string | null; vue?: "2d" | "3d" }) {
    const q = new URLSearchParams(filtersToQuery(next.filters ?? filters).slice(1));
    const region = next.region === undefined ? selectedSlug : next.region;
    if (region) q.set("region", region);
    const vue = next.vue ?? (mode3d ? "3d" : "2d");
    if (vue === "3d") q.set("vue", "3d");
    const s = q.toString();
    router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
  }
  const setFilter = (patch: Partial<Filters>) => navigate({ filters: { ...filters, ...patch } });
  const selectRegion = (id: string | undefined) => {
    setTourIndex(null);
    navigate({ region: regions.find((r) => r.id === id)?.slug ?? null });
  };

  const regionStories = selected ? visible.filter((s) => s.regionIds.includes(selected.id)) : [];

  const filterPanel = (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{t("panelTitle")}</h2>
        <output aria-live="polite" className="text-sm text-muted">
          {t("shownOf", { shown: visible.length, total: stories.length })}
        </output>
      </div>

      <label className="text-sm font-bold">
        {t("search")}
        <input
          type="search"
          value={filters.q ?? ""}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => setFilter({ q: e.target.value || undefined })}
          className="mt-1 block min-h-11 w-full rounded-full border border-border bg-bg px-4 font-normal"
        />
      </label>

      {options.langues.length > 0 ? (
        <fieldset>
          <legend className="mb-1 text-sm font-bold">{tf("language")}</legend>
          <div className="flex flex-wrap gap-2">
            {options.langues.map((l) => (
              <Chip
                key={l.id}
                pressed={filters.langue === l.id}
                onClick={() => setFilter({ langue: filters.langue === l.id ? undefined : l.id })}
              >
                {l.nom}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-1 text-sm font-bold">{tf("type")}</legend>
        <div className="flex flex-wrap gap-2">
          {TYPE_CHIPS.map((type) => (
            <Chip
              key={type}
              pressed={filters.type === type}
              onClick={() => setFilter({ type: filters.type === type ? undefined : type })}
            >
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: typeColor(type) }} />
              {types(type)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">
          {tf("theme")}
          <select
            className="mt-1 block min-h-11 w-full rounded-full border border-border bg-bg px-3 font-normal"
            value={filters.theme ?? ""}
            onChange={(e) => setFilter({ theme: e.target.value || undefined })}
          >
            <option value="">{tf("all")}</option>
            {options.themes.map((th) => (
              <option key={th.id} value={th.id}>
                {th.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {tf("audience")}
          <select
            className="mt-1 block min-h-11 w-full rounded-full border border-border bg-bg px-3 font-normal"
            value={filters.public ?? ""}
            onChange={(e) => setFilter({ public: (e.target.value || undefined) as PublicCible | undefined })}
          >
            <option value="">{tf("all")}</option>
            <option value="enfant">{tf("children")}</option>
            <option value="tout_public">{tf("everyone")}</option>
            <option value="adulte">{tf("adults")}</option>
          </select>
        </label>
      </div>

      <label className="text-sm font-bold">
        {t("region")}
        <select
          className="mt-1 block min-h-11 w-full rounded-full border border-border bg-bg px-3 font-normal"
          value={selected?.id ?? ""}
          onChange={(e) => selectRegion(e.target.value || undefined)}
        >
          <option value="">{t("allRegions")}</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </label>

      {hasFilters(filters) ? (
        <button
          type="button"
          className="self-start text-sm text-accent underline underline-offset-4"
          onClick={() => navigate({ filters: {} })}
        >
          {tf("reset")}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="relative h-[calc(100dvh-4rem)] min-h-[34rem] overflow-hidden">
        <div className="absolute inset-0" role="region" aria-label={t("canvasLabel")}>
          <StoryMap
            counts={counts}
            visibleStoryIds={visible.map((s) => s.id)}
            selectedRegionId={selected?.id}
            onSelectRegion={selectRegion}
            onOpenStory={(slug) => router.push(`/contes/${slug}`)}
            mode3d={mode3d}
            lowData={lowData}
            layers={layers}
            focusPoint={tourStory?.lieu}
            recenterNonce={recenterNonce}
            reducedMotion={reducedMotion}
            labels={{
              canvas: t("canvasLabel"),
              stories: (count) => t("storiesCount", { count }),
              chefLieu: (name) => t("chefLieu", { name }),
              error: t("error"),
            }}
          />
        </div>

        {/* Filters: floating panel on desktop, folded sheet on mobile (one DOM copy). */}
        <aside
          id="filtres-mobile"
          aria-label={t("panelTitle")}
          className={`float-panel absolute inset-x-2 top-2 z-30 max-h-[calc(100%-1rem)] overflow-y-auto p-5 lg:inset-x-auto lg:top-4 lg:left-4 lg:z-10 lg:block lg:max-h-[calc(100%-2rem)] lg:w-80 ${filtersOpen ? "block" : "hidden"}`}
        >
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            aria-label={t("closeFilters")}
            className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-hover lg:hidden"
          >
            <X aria-hidden size={20} />
          </button>
          {filterPanel}
        </aside>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="float-panel absolute top-4 left-4 z-10 inline-flex min-h-11 items-center gap-2 px-4 font-bold lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="filtres-mobile"
        >
          <SlidersHorizontal aria-hidden size={18} />
          {t("filtersButton")}
          <span className="text-sm font-normal text-muted">({visible.length})</span>
        </button>

        {/* Map controls. */}
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
          <div role="group" aria-label={t("modeLabel")} className="float-panel inline-flex p-1">
            {(["2d", "3d"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={(v === "3d") === mode3d}
                disabled={v === "3d" && lowData}
                onClick={() => navigate({ vue: v })}
                className="inline-flex min-h-10 items-center gap-1 rounded-full px-4 text-sm font-bold aria-pressed:bg-cta aria-pressed:text-cta-text disabled:opacity-50"
              >
                {v === "3d" ? <Mountain aria-hidden size={16} /> : null}
                {v === "3d" ? "3D" : "2D"}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLayersOpen((o) => !o)}
              aria-expanded={layersOpen}
              aria-controls="calques"
              className="float-panel inline-flex min-h-11 items-center gap-2 px-4 text-sm font-bold"
            >
              <Layers aria-hidden size={16} />
              {t("layers")}
            </button>
            {layersOpen ? (
              <div id="calques" className="float-panel absolute top-full right-0 mt-2 w-64 space-y-2 p-4">
                <Toggle
                  label={t("layerRelief")}
                  checked={layers.relief && !lowData}
                  disabled={lowData}
                  onChange={(relief) => setLayers((l) => ({ ...l, relief }))}
                />
                <Toggle
                  label={t("layerSites")}
                  checked={layers.sites}
                  onChange={(sites) => setLayers((l) => ({ ...l, sites }))}
                />
                <Toggle label={t("lowData")} checked={lowData} onChange={(v) => setLowDataOverride(v)} />
                {lowDataOverride === null && autoLowData ? (
                  <p className="text-xs text-muted">{t("lowDataAuto")}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setTourIndex((i) => (i === null && tourStops.length > 0 ? 0 : null))}
            aria-pressed={tourIndex !== null}
            disabled={tourStops.length === 0}
            title={tourStops.length === 0 ? t("tourEmpty") : undefined}
            className="float-panel inline-flex min-h-11 items-center gap-2 px-4 text-sm font-bold aria-pressed:bg-cta aria-pressed:text-cta-text disabled:opacity-50"
          >
            {tourIndex === null ? <Play aria-hidden size={16} /> : <Pause aria-hidden size={16} />}
            {tourIndex === null ? t("tour") : t("tourStop")}
          </button>

          <button
            type="button"
            onClick={() => {
              setTourIndex(null);
              if (selected) selectRegion(undefined);
              else setRecenterNonce((n) => n + 1);
            }}
            className="float-panel inline-flex min-h-11 items-center gap-2 px-4 text-sm font-bold"
          >
            <Crosshair aria-hidden size={16} />
            {t("recenter")}
          </button>
        </div>

        {/* Region panel: under the controls on desktop, bottom sheet on mobile. */}
        {selected ? (
          <aside
            aria-labelledby="panneau-region"
            className="float-panel absolute inset-x-2 bottom-2 z-20 max-h-[55%] overflow-y-auto p-5 lg:inset-x-auto lg:top-60 lg:right-4 lg:bottom-auto lg:max-h-[calc(100%-16rem)] lg:w-80"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
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
              <ul className="mb-4 space-y-1">
                {regionStories.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/contes/${s.slug}`}
                      className="flex items-center gap-2 rounded-[var(--r-card)] p-2 hover:bg-surface-hover"
                    >
                      <StoryTypeIcon type={s.type} style={{ color: typeColor(s.type) }} />
                      <span>
                        <span className="block font-bold">{s.titre}</span>
                        <span className="text-xs text-muted">{types(s.type)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">{tr("noStories")}</p>
            )}

            <PanelList title={tr("languages")} items={selected.langues} empty={tr("none")} />
            <PanelList title={tr("ethnies")} items={selected.ethnies} empty={tr("none")} />
            <PanelList title={tr("instruments")} items={selected.instruments} empty={tr("none")} />
            <PanelList
              title={tr("sites")}
              items={selected.sites}
              empty={tr("none")}
              more={
                selected.siteCount > selected.sites.length
                  ? tr("moreSites", { count: selected.siteCount - selected.sites.length })
                  : undefined
              }
            />
            <Link href={`/regions/${selected.slug}`} className="btn-cta mt-1">
              {t("seeRegion")}
            </Link>
          </aside>
        ) : null}

        {/* Tour caption, or the stats card. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 hidden justify-center sm:flex">
          {tourStory ? (
            <div className="float-panel pointer-events-auto flex items-center gap-4 px-5 py-3" aria-live="polite">
              <span className="text-xs text-muted">
                {t("tourNow", { index: (tourIndex ?? 0) + 1, total: tourStops.length })}
              </span>
              <span className="font-bold">{tourStory.titre}</span>
              <Link href={`/contes/${tourStory.slug}`} className="text-sm text-accent underline underline-offset-4">
                {t("openStory")}
              </Link>
            </div>
          ) : selected ? null : (
            <dl className="float-panel pointer-events-auto flex gap-8 px-6 py-3 text-center">
              <Stat value={stats.recits} label={t("statStories", { count: stats.recits })} />
              <Stat value={stats.langues} label={t("statLanguages", { count: stats.langues })} />
              <Stat value={stats.regions} label={t("statRegions", { count: stats.regions })} />
            </dl>
          )}
        </div>
      </div>

      <section aria-labelledby="liste-regions" className="mx-auto w-full max-w-6xl px-4">
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
                  onClick={() => {
                    selectRegion(r.id);
                    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
                  }}
                  className={`card flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-surface-hover aria-pressed:border-[var(--accent)] ${n === 0 ? "opacity-75" : ""}`}
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

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3.5 text-sm hover:bg-surface-hover aria-pressed:border-transparent aria-pressed:bg-cta aria-pressed:text-cta-text"
    >
      {children}
    </button>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex min-h-10 items-center justify-between gap-3 text-sm ${disabled ? "opacity-50" : ""}`}>
      {label}
      <input
        type="checkbox"
        role="switch"
        className="size-5 accent-[var(--accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-2xl font-bold">{value}</dd>
    </div>
  );
}

function PanelList({ title, items, empty, more }: { title: string; items: string[]; empty: string; more?: string }) {
  return (
    <div className="mb-3">
      <h3 className="mb-0.5 text-sm font-bold">{title}</h3>
      <p className="text-sm text-muted">
        {items.length > 0 ? items.join(" · ") : empty}
        {more ? ` ${more}` : null}
      </p>
    </div>
  );
}
