import "server-only";
import type { ListenVersion } from "@/components/story/ListenMode";
import type { ReadColumn } from "@/components/story/ReadMode";
import type { Recit, Version } from "@/data/schemas";
import { mediaUrl } from "@/lib/media";
import { bcp47 } from "@/lib/media/vtt";
import { langueById, recits } from "./index";

const langueName = (v: Version) => langueById.get(v.langueId)?.nom ?? v.codeIso;

/** Paragraphs of a version: full text when collected, otherwise its scenes. */
export function versionParagraphs(v: Version): string[] {
  if (v.texte) return v.texte.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return v.scenes.map((s) => s.texte);
}

export function listenVersions(r: Recit): ListenVersion[] {
  return r.versions.map((v) => ({
    id: v.id,
    langue: langueName(v),
    lang: bcp47(v.codeIso),
    sources: [v.audio, v.audioFallback].filter((s): s is string => Boolean(s)).map(mediaUrl),
    vtt: v.vtt ? mediaUrl(v.vtt) : undefined,
    demo: v.demo,
    dureeSecondes: v.dureeSecondes,
    fallbackText: versionParagraphs(v),
  }));
}

/** National-language version(s) first, French last, as in the bilingual view. */
export function readColumns(r: Recit): ReadColumn[] {
  return [...r.versions]
    .sort((a, b) => Number(a.codeIso === "fra") - Number(b.codeIso === "fra"))
    .map((v) => ({ langue: langueName(v), lang: bcp47(v.codeIso), paragraphs: versionParagraphs(v) }));
}

/** The version carrying the interactive scenes, and its audio if any. */
export function liveVersion(r: Recit) {
  const version = r.versions.find((v) => v.scenes.length > 0);
  if (!version) return undefined;
  const listen = listenVersions(r).find((l) => l.id === version.id);
  return { version, listen };
}

/** "Vous aimerez aussi": shared character, then shared theme, then same region (Q8). */
export function relatedStories(r: Recit, limit = 4): Recit[] {
  const score = (o: Recit) =>
    (r.liesA.includes(o.id) ? 4 : 0) +
    o.themeIds.filter((t) => r.themeIds.includes(t)).length * 2 +
    o.regionIds.filter((g) => r.regionIds.includes(g)).length;
  return recits
    .filter((o) => o.id !== r.id && score(o) > 0)
    .sort((a, b) => score(b) - score(a) || a.titre.localeCompare(b.titre, "fr"))
    .slice(0, limit);
}
