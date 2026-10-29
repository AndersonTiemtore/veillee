import "server-only";
import dataQuality from "@/data/generated/data-quality.json";
import ethniesJson from "@/data/generated/ethnies.json";
import instrumentsJson from "@/data/generated/instruments.json";
import languesJson from "@/data/generated/langues.json";
import recitsJson from "@/data/generated/recits.json";
import regionsJson from "@/data/generated/regions.json";
import sitesJson from "@/data/generated/sites.json";
import themesJson from "@/data/generated/themes.json";
import type {
  DataQuality,
  Ethnie,
  Instrument,
  Langue,
  Recit,
  Region,
  Site,
  Theme,
} from "@/data/schemas";
import { SHOW_DRAFTS } from "@/lib/site";

// The JSON is validated against the Zod schemas at build time (build-data.ts),
// so the casts below are safe.
export const recits = recitsJson as Recit[];
export const regions = regionsJson as Region[];
export const langues = languesJson as Langue[];
export const ethnies = ethniesJson as Ethnie[];
export const instruments = instrumentsJson as Instrument[];
export const sites = sitesJson as Site[];
export const themes = themesJson as Theme[];
export const quality = dataQuality as DataQuality;

const index = <T extends { id: string }>(items: T[]) => new Map(items.map((x) => [x.id, x]));
export const langueById = index(langues);
export const ethnieById = index(ethnies);
export const instrumentById = index(instruments);
export const siteById = index(sites);
export const themeById = index(themes);
export const regionById = index(regions);

/** Stories whose recordings and texts may be shown publicly. */
export const publiables = recits.filter((r) => r.publiable);

/** Content (text, audio, scenes) is shown only when publishable, or in draft mode. */
export const contentVisible = (r: Recit) => !r.restreint && (r.publiable || SHOW_DRAFTS);

export function counters() {
  const languesAvecVersion = new Set(recits.flatMap((r) => r.versions.map((v) => v.langueId)));
  return {
    recits: recits.length,
    langues: languesAvecVersion.size,
    regions: regions.filter((r) => r.nbRecits > 0).length,
  };
}
