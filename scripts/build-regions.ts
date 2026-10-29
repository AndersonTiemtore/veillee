/**
 * COD-AB admin boundaries (HDX, data/raw/cod-ab) -> data/boundaries/regions.geojson.
 *
 * The 2025-08-01 release already uses the 17 regions of the new division
 * (pcodes BF47…BF64), so no dissolve is needed: we keep the code and name,
 * simplify to ~5 % of the vertices and check the size budget.
 *
 * Run manually (`npm run regions:build`) when the source data changes;
 * the output is committed because the raw files are too large for git.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import mapshaper from "mapshaper";

const ROOT = process.cwd();
const INPUT = join(ROOT, "data/raw/cod-ab/bfa_admin1.geojson");
const OUTPUT = join(ROOT, "data/boundaries/regions.geojson");
const MAX_BYTES = 300 * 1024;
const EXPECTED_REGIONS = 17;

async function main() {
  const input = readFileSync(INPUT, "utf8");
  const output = await mapshaper.applyCommands(
    [
      "-i input.geojson",
      "-filter-fields adm1_pcode,adm1_name,valid_on",
      "-rename-fields code=adm1_pcode,nom=adm1_name",
      "-simplify 5% keep-shapes",
      "-clean",
      "-o output.geojson precision=0.0001 format=geojson",
    ].join(" "),
    { "input.geojson": input },
  );

  const geojson = JSON.parse(String(output["output.geojson"])) as {
    features: { properties: { code: string } }[];
  };
  if (geojson.features.length !== EXPECTED_REGIONS) {
    throw new Error(`Expected ${EXPECTED_REGIONS} regions, got ${geojson.features.length}`);
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(geojson));
  const size = statSync(OUTPUT).size;
  if (size > MAX_BYTES) throw new Error(`regions.geojson is ${size} bytes (> ${MAX_BYTES})`);

  const codes = geojson.features.map((f) => f.properties.code).sort();
  console.log(`regions.geojson: ${codes.length} regions, ${(size / 1024).toFixed(0)} KB`);
  console.log(codes.join(" "));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
