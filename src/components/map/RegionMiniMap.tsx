import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BF_BOUNDS } from "@/lib/map/style";

type Geometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;
interface Feature {
  geometry: Geometry;
  properties: { id: string };
}

const WIDTH = 320;
const [W, S, E, N] = BF_BOUNDS;
// Equirectangular projection corrected for latitude (~12°N).
const K = Math.cos((12 * Math.PI) / 180);
const HEIGHT = Math.round((WIDTH * (N - S)) / ((E - W) * K));

const project = ([lon, lat]: number[]) =>
  `${(((lon! - W) / (E - W)) * WIDTH).toFixed(1)},${(((N - lat!) / (N - S)) * HEIGHT).toFixed(1)}`;

function path(geometry: Geometry): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .flatMap((rings) => rings.map((ring) => `M${ring.map(project).join("L")}Z`))
    .join("");
}

let cache: Feature[] | undefined;
function loadFeatures(): Feature[] {
  cache ??= (
    JSON.parse(
      readFileSync(join(process.cwd(), "src/data/generated/regions.geojson"), "utf8"),
    ) as { features: Feature[] }
  ).features;
  return cache;
}

/**
 * Static SVG map of the country (no JavaScript): one active region
 * (`regionId`), or a set of highlighted ones (regions with stories).
 */
export function RegionMiniMap({
  regionId,
  highlighted,
  label,
}: {
  regionId?: string;
  highlighted?: string[];
  label: string;
}) {
  const features = loadFeatures();
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="h-auto w-full">
      {features.map((f) => {
        const active = f.properties.id === regionId;
        const lit = highlighted?.includes(f.properties.id);
        return (
          <path
            key={f.properties.id}
            d={path(f.geometry)}
            fill={active ? "var(--map-region-active)" : "var(--map-region)"}
            fillOpacity={active ? 0.95 : lit ? 0.9 : 0.35}
            stroke="var(--map-line)"
            strokeOpacity={active ? 0.9 : 0.35}
            strokeWidth={active ? 1.4 : 0.6}
          />
        );
      })}
    </svg>
  );
}
