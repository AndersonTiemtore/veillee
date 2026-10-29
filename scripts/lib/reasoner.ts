import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Store } from "oxigraph";

export interface Rule {
  file: string;
  name: string;
  stratum: number;
  update: string;
}

export const RULES_DIR = join(process.cwd(), "scripts/rules");

/** Reads `scripts/rules/*.rq`; each file declares `# rule:` and `# stratum:`. */
export function loadRules(dir = RULES_DIR): Rule[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".rq"))
    .sort()
    .map((file) => {
      const update = readFileSync(join(dir, file), "utf8");
      const name = /^# rule:\s*(.+)$/m.exec(update)?.[1]?.trim() ?? file;
      const stratum = Number(/^# stratum:\s*(\d+)$/m.exec(update)?.[1] ?? 1);
      return { file, name, stratum, update };
    });
}

export interface InferenceReport {
  iterations: Record<number, number>;
  added: number;
}

/**
 * Applies the rules stratum by stratum. Within a stratum, every rule is run
 * repeatedly until a full pass adds no triple (fixed point). Negation
 * (`FILTER NOT EXISTS`) lives in higher strata, so it only sees a closed graph.
 */
export function runInference(store: Store, rules: Rule[], maxIterations = 50): InferenceReport {
  const before = store.size;
  const iterations: Record<number, number> = {};
  const strata = [...new Set(rules.map((r) => r.stratum))].sort((a, b) => a - b);

  for (const stratum of strata) {
    const layer = rules.filter((r) => r.stratum === stratum);
    let i = 0;
    for (;;) {
      const sizeBefore = store.size;
      for (const rule of layer) {
        try {
          store.update(rule.update);
        } catch (err) {
          throw new Error(`Rule ${rule.file} failed: ${String(err)}`);
        }
      }
      i++;
      if (store.size === sizeBefore) break;
      if (i >= maxIterations) {
        throw new Error(`Stratum ${stratum} did not reach a fixed point in ${maxIterations} passes`);
      }
    }
    iterations[stratum] = i;
  }
  return { iterations, added: store.size - before };
}
