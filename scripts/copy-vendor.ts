/**
 * Copies runtime assets that bundlers cannot resolve into public/vendor/.
 *
 * MapLibre 6 starts its worker from a separate ES module located next to the
 * main bundle (import.meta.url), which Next's bundler does not preserve; the
 * map points to this copy with setWorkerUrl().
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "public/vendor");
mkdirSync(OUT, { recursive: true });

const maplibre = join(ROOT, "node_modules/maplibre-gl");
const { version } = JSON.parse(readFileSync(join(maplibre, "package.json"), "utf8")) as { version: string };
copyFileSync(join(maplibre, "dist/maplibre-gl-worker.mjs"), join(OUT, "maplibre-gl-worker.mjs"));
console.log(`[vendor] maplibre-gl-worker.mjs (${version})`);
