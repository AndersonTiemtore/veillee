import { PUBLICS, RECIT_TYPES, type PublicCible, type RecitType } from "@/data/schemas";

/** Filters shared by the map and the catalogue; mirrored in the URL. */
export interface Filters {
  type?: RecitType;
  langue?: string;
  theme?: string;
  public?: PublicCible;
}

export const FILTER_KEYS = ["type", "langue", "theme", "public"] as const;

type Params = { get(name: string): string | null };

export function parseFilters(params: Params): Filters {
  const type = params.get("type");
  const pub = params.get("public");
  return {
    type: RECIT_TYPES.includes(type as RecitType) ? (type as RecitType) : undefined,
    langue: params.get("langue") || undefined,
    theme: params.get("theme") || undefined,
    public: PUBLICS.includes(pub as PublicCible) ? (pub as PublicCible) : undefined,
  };
}

export function filtersToQuery(filters: Filters): string {
  const q = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Minimal shape needed to filter a story (works on Recit and GeoJSON properties). */
export interface Filterable {
  type: RecitType;
  langueIds: string[];
  themeIds: string[];
  publicCible: PublicCible;
}

export function matches(item: Filterable, f: Filters): boolean {
  return (
    // A fable is a kind of conte: filtering on "conte" includes fables.
    (!f.type || item.type === f.type || (f.type === "conte" && item.type === "fable")) &&
    (!f.langue || item.langueIds.includes(f.langue)) &&
    (!f.theme || item.themeIds.includes(f.theme)) &&
    (!f.public || item.publicCible === f.public)
  );
}

export const hasFilters = (f: Filters) => FILTER_KEYS.some((k) => Boolean(f[k]));
