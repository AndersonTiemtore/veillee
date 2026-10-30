import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Recit } from "@/data/schemas";
import { quizFromScenes } from "@/lib/quiz";

const recits = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/generated/recits.json"), "utf8"),
) as Recit[];

describe("quizFromScenes", () => {
  it("builds Yennenga's question from its choice scene", () => {
    const scenes = recits.find((r) => r.slug === "yennenga-la-cavaliere")!.versions.flatMap((v) => v.scenes);
    const [quiz, ...rest] = quizFromScenes(scenes);
    expect(rest).toHaveLength(0);
    expect(quiz!.context).toMatch(/l'étalon s'emballe/);
    expect(quiz!.options).toHaveLength(2);
    expect(quiz!.options[quiz!.answer]).toBe("Laisser l'étalon la guider");
  });

  it("ignores scenes without a single true ending", () => {
    expect(
      quizFromScenes([
        { ordre: 1, texte: "a", choix: [], debutAudio: undefined, finAudio: undefined },
        {
          ordre: 2,
          texte: "b",
          choix: [
            { libelle: "x", vraieFin: true, cibleOrdre: 1 },
            { libelle: "y", vraieFin: true, cibleOrdre: 1 },
          ],
        },
      ]),
    ).toEqual([]);
  });
});
