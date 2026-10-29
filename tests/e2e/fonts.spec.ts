import { expect, test } from "@playwright/test";

const NATIONAL_CHARS = ["ɛ", "ɩ", "ʋ", "ɓ", "ɗ", "ŋ", "ɲ", "ƴ", "ã", "ẽ", "ĩ", "õ", "ũ"];

for (const variable of ["--font-andika", "--font-gentium"]) {
  test(`${variable} renders every national-language character without fallback`, async ({
    page,
  }) => {
    await page.goto("/");
    const result = await page.evaluate(
      async ({ variable, chars }) => {
        const stack = getComputedStyle(document.documentElement).getPropertyValue(variable);
        const family = stack.split(",")[0]!.trim();
        const text = chars.join(" ");
        await document.fonts.load(`16px ${family}`, text);
        await document.fonts.ready;

        // A glyph missing from `family` would come from the generic fallback,
        // so its width would change between a serif and a monospace fallback.
        const ctx = document.createElement("canvas").getContext("2d")!;
        const width = (font: string, ch: string) => {
          ctx.font = font;
          return ctx.measureText(ch).width;
        };
        const missing = chars.filter(
          (ch) => width(`48px ${family}, serif`, ch) !== width(`48px ${family}, monospace`, ch),
        );
        return { family, check: document.fonts.check(`16px ${family}`, text), missing };
      },
      { variable, chars: NATIONAL_CHARS },
    );

    expect(result.family).not.toBe("");
    expect(result.check).toBe(true);
    expect(result.missing, `fallback used for ${result.missing.join(" ")}`).toEqual([]);
  });
}
