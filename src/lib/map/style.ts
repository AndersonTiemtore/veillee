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

/** Map palette per theme: light "terre" (default) and night "veillée". */
export const MAP_PALETTE = {
  jour: {
    background: "#faf3e6",
    region: "#e3b448",
    regionEmpty: "#efdcae",
    regionHover: "#d08a2c",
    regionActive: "#b5562b",
    line: "#2a1d14",
    lineActive: "#2a1d14",
    cluster: "#2a1d14",
    clusterText: "#faf3e6",
    markerStroke: "#2a1d14",
  },
  nuit: {
    background: COLORS.nuit,
    region: COLORS.indigo,
    regionEmpty: "#262f58",
    regionHover: COLORS.indigoClair,
    regionActive: COLORS.indigoClair,
    line: COLORS.karite,
    lineActive: COLORS.flamme,
    cluster: COLORS.flamme,
    clusterText: COLORS.nuit,
    markerStroke: COLORS.nuit,
  },
} as const;
export type MapPalette = (typeof MAP_PALETTE)[keyof typeof MAP_PALETTE];

/** Hex story-type colours for MapLibre, mirroring the --type-* tokens. */
export const TYPE_COLORS_BY_THEME: Record<"jour" | "nuit", Record<RecitType, string>> = {
  jour: {
    conte: COLORS.indigo,
    fable: COLORS.indigo,
    legende: COLORS.laterite,
    mythe_fondateur: "#4f7a4a",
    recit_historique: "#2a1d14",
  },
  nuit: {
    conte: COLORS.flamme,
    fable: COLORS.flamme,
    legende: COLORS.laterite,
    mythe_fondateur: "#d9784a",
    recit_historique: COLORS.karite,
  },
};

const TYPE_TOKEN: Record<RecitType, string> = {
  conte: "conte",
  fable: "conte",
  legende: "legende",
  mythe_fondateur: "mythe",
  recit_historique: "historique",
};

/** Theme-aware CSS colour for a story type (DOM elements). */
export const typeColor = (type: RecitType) => `var(--type-${TYPE_TOKEN[type]})`;

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
