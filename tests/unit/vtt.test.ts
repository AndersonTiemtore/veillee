import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { activeCue, bcp47, parseVtt } from "@/lib/media/vtt";

describe("parseVtt", () => {
  it("parses timings, multi-line text, settings and tags", () => {
    const cues = parseVtt(
      "WEBVTT\r\n\r\nNOTE ignored\r\n\r\n1\r\n00:00:01.500 --> 00:00:04.000 align:start\r\n<v Conteur>Il était</v>\r\nune fois\r\n\r\n00:04.000 --> 00:06.250\r\nensuite\r\n",
    );
    expect(cues).toEqual([
      { start: 1.5, end: 4, text: "Il était\nune fois" },
      { start: 4, end: 6.25, text: "ensuite" },
    ]);
  });

  it("parses the generated demo subtitles", () => {
    const vtt = readFileSync(join(process.cwd(), "media/vtt/demo-yennenga-la-cavaliere-fra.vtt"), "utf8");
    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(3);
    expect(cues[2]).toMatchObject({ start: 12, end: 18 });
  });
});

describe("activeCue", () => {
  const cues = [
    { start: 0, end: 6, text: "a" },
    { start: 6, end: 12, text: "b" },
  ];
  it("finds the cue containing the time", () => {
    expect(activeCue(cues, 0)).toBe(0);
    expect(activeCue(cues, 6)).toBe(1);
    expect(activeCue(cues, 12)).toBe(-1);
  });
});

describe("bcp47", () => {
  it("shortens codes that have a two-letter form, keeps the others", () => {
    expect(bcp47("fra")).toBe("fr");
    expect(bcp47("mos")).toBe("mos");
    expect(bcp47("bwq")).toBe("bwq");
  });
});
