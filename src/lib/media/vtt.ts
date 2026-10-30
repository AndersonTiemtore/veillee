export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** "01:02:03.500" or "02:03.500" -> seconds. */
function parseTimestamp(value: string): number {
  const parts = value.trim().replace(",", ".").split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) throw new Error(`Invalid timestamp ${value}`);
  return parts.reduce((total, n) => total * 60 + n, 0);
}

/** Minimal WebVTT parser: cue timings and text (tags stripped), no styling. */
export function parseVtt(source: string): Cue[] {
  const blocks = source.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const timing = lines.findIndex((l) => l.includes("-->"));
    if (timing === -1) continue; // header, NOTE, STYLE…
    const [from, to] = lines[timing]!.split("-->");
    const end = to!.trim().split(/\s+/)[0]!; // drop cue settings
    const text = lines
      .slice(timing + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (text) cues.push({ start: parseTimestamp(from!), end: parseTimestamp(end), text });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** Index of the cue active at `time`, or -1. */
export function activeCue(cues: Cue[], time: number): number {
  return cues.findIndex((c) => time >= c.start && time < c.end);
}

/** ISO 639-3 code from the ontology -> BCP 47 tag for `lang` attributes. */
export function bcp47(iso6393: string): string {
  const shortForms: Record<string, string> = { fra: "fr", eng: "en", bam: "bm" };
  return shortForms[iso6393] ?? iso6393;
}
