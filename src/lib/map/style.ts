import type { RecitType } from "@/data/schemas";

/** Hex values of the charte, for MapLibre paint properties (no CSS vars there). */
export const COLORS = {
  nuit: "#1b1a2e",
  indigo: "#2e3a6b",
  indigoClair: "#4a5a96",
  laterite: "#b5562b",
  flamme: "#e8a33d",
  karite: "#f4ead5",
} as const;

export const TYPE_COLORS: Record<RecitType, string> = {
  conte: COLORS.flamme,
  fable: COLORS.flamme,
  legende: COLORS.laterite,
  mythe_fondateur: "#d9784a",
  recit_historique: COLORS.karite,
};

/** Bounds of Burkina Faso with a small margin, [west, south, east, north]. */
export const BF_BOUNDS: [number, number, number, number] = [-5.8, 9.2, 2.6, 15.3];

/** Free, key-less resources (OpenFreeMap glyphs, AWS open-data terrain). */
export const GLYPHS_URL = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
export const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
export const LABEL_FONT = ["Noto Sans Regular"];

/** Bounding box of a (Multi)Polygon. */
export function bbox(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number, number, number] {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings)
    for (const [x, y] of ring) {
      w = Math.min(w, x!);
      s = Math.min(s, y!);
      e = Math.max(e, x!);
      n = Math.max(n, y!);
    }
  return [w, s, e, n];
}
