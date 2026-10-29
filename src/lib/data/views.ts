import "server-only";
import type { MapRegion, MapStory } from "@/components/map/MapExplorer";
import type { FilterOptions } from "@/components/ui/FilterBar";
import type { Recit } from "@/data/schemas";
import { ethnieById, instrumentById, langueById, langues, recits, regions, siteById, themes } from "./index";

const PANEL_SITES = 6;

export const storyLangueIds = (r: Recit) => [...new Set(r.versions.map((v) => v.langueId))];

/** Compact story records for client-side filtering (map, catalogue). */
export function mapStories(): MapStory[] {
  return recits.map((r) => ({
    id: r.id,
    slug: r.slug,
    titre: r.titre,
    type: r.type,
    regionIds: r.regionIds,
    langueIds: storyLangueIds(r),
    themeIds: r.themeIds,
    publicCible: r.publicCible,
    lieu: r.lieu ? [r.lieu.lon, r.lieu.lat] : undefined,
  }));
}

const names = <T extends { nom: string }>(ids: string[], index: Map<string, T>) =>
  ids
    .map((id) => index.get(id)?.nom)
    .filter((n): n is string => Boolean(n))
    .sort((a, b) => a.localeCompare(b, "fr"));

export function mapRegions(): MapRegion[] {
  return regions.map((r) => ({
    id: r.id,
    slug: r.slug,
    nom: r.nom,
    chefLieu: r.chefLieu,
    langues: names(r.langueIds, langueById),
    ethnies: names(r.ethnieIds, ethnieById),
    instruments: names(r.instrumentIds, instrumentById),
    sites: names(r.siteIds, siteById).slice(0, PANEL_SITES),
    siteCount: r.siteIds.length,
  }));
}

/** Filter choices: only languages and themes that at least one story uses. */
export function filterOptions(): FilterOptions {
  const usedLangues = new Set(recits.flatMap(storyLangueIds));
  const usedThemes = new Set(recits.flatMap((r) => r.themeIds));
  return {
    langues: langues
      .filter((l) => usedLangues.has(l.id))
      .map((l) => ({ id: l.id, nom: l.nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    themes: themes.filter((t) => usedThemes.has(t.id)).map((t) => ({ id: t.id, label: t.label })),
  };
}
