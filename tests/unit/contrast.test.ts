import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/a11y/contrast";

const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Collects `--name: value` declarations of every block whose selector matches. */
function declarations(selectorPattern: RegExp): Record<string, string> {
  const out: Record<string, string> = {};
  for (const block of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!selectorPattern.test(block[1]!)) continue;
    for (const decl of block[2]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      out[decl[1]!] = decl[2]!.trim();
    }
  }
  return out;
}

function themeVars(theme: "nuit" | "jour"): Record<string, string> {
  const base = declarations(/^\s*:root\s*$/);
  const themed = declarations(new RegExp(`\\[data-theme="${theme}"\\]`));
  return { ...base, ...themed };
}

function resolve(vars: Record<string, string>, name: string): string {
  let value = vars[name];
  for (let i = 0; value && i < 10; i++) {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    if (!ref) break;
    value = vars[ref[1]!];
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Token ${name} does not resolve to a hex colour (got ${value})`);
  }
  return value;
}

// [foreground, background, minimum ratio]
const TEXT = 4.5;
const UI = 3;
const PAIRS: [string, string, number][] = [
  ["--text", "--bg", TEXT],
  ["--text", "--surface", TEXT],
  ["--text", "--surface-hover", TEXT],
  ["--text-muted", "--bg", TEXT],
  ["--text-muted", "--surface", TEXT],
  ["--accent", "--bg", TEXT],
  ["--accent", "--surface", TEXT],
  ["--cta-text", "--cta-bg", TEXT],
  ["--success-text", "--success-bg", TEXT],
  ["--focus", "--bg", UI],
  ["--focus", "--surface", UI],
];

describe.each(["nuit", "jour"] as const)("theme %s meets WCAG AA", (theme) => {
  const vars = themeVars(theme);
  it.each(PAIRS)("%s on %s", (fg, bg, min) => {
    const ratio = contrastRatio(resolve(vars, fg), resolve(vars, bg));
    expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
  });
});

describe("contrastRatio", () => {
  it("matches reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});
