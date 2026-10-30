import type { Scene } from "@/data/schemas";

export interface Quiz {
  /** Scene text the question refers to (from the ontology). */
  context: string;
  options: string[];
  answer: number;
}

/**
 * Comprehension questions built only from the story data: for each scene
 * that offers a choice, "what happens next?" with the choice labels as
 * options and the true ending as the answer. No text is invented here; the
 * question wording itself is an interface string.
 */
export function quizFromScenes(scenes: Scene[]): Quiz[] {
  return scenes
    .filter((s) => s.choix.length >= 2 && s.choix.filter((c) => c.vraieFin).length === 1)
    .map((s) => {
      // Stable order, independent from the ontology's (alphabetical by label).
      const choix = [...s.choix].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
      return {
        context: s.texte,
        options: choix.map((c) => c.libelle),
        answer: choix.findIndex((c) => c.vraieFin),
      };
    });
}
