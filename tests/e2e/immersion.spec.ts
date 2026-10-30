import { expect, test, type Page } from "@playwright/test";

const DRAFTS = process.env.NEXT_PUBLIC_SHOW_DRAFTS === "true";

/** Presses Tab until the focused element's accessible text matches (use anchored patterns: focusable containers such as tab panels contain their children's text). Keyboard only. */
async function tabTo(page: Page, name: RegExp, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return (el?.getAttribute("aria-label") ?? el?.textContent ?? "").trim();
    });
    if (name.test(label)) return;
  }
  throw new Error(`Could not reach ${name} with Tab`);
}

test.describe("mode Vivre (mode brouillon)", () => {
  test.skip(!DRAFTS, "nécessite NEXT_PUBLIC_SHOW_DRAFTS=true au build");

  test("parcours complet de Yennenga au clavier seul", async ({ page }) => {
    await page.goto("/contes/yennenga-la-cavaliere");

    // Tabs: reach the tablist, then arrow keys to "Vivre".
    await tabTo(page, /^Écouter$/);
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Vivre" })).toHaveAttribute("aria-selected", "true");

    await tabTo(page, /^Commencer la veillée$/);
    await page.keyboard.press("Enter");
    await expect(page.locator("#scene-1")).toBeFocused();

    await tabTo(page, /^Continuer$/);
    await page.keyboard.press("Enter");
    await expect(page.locator("#scene-2")).toBeFocused();

    // A wrong choice leads gently back to the target scene.
    await tabTo(page, /^Faire demi-tour vers le palais$/);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").getByText(/Le conteur reprend/)).toBeVisible();
    await expect(page.locator("#scene-1")).toBeFocused();
    await expect(page.getByText("Fin du récit")).toHaveCount(0);

    await tabTo(page, /^Continuer$/);
    await page.keyboard.press("Enter");
    await tabTo(page, /^Laisser l'étalon la guider$/);
    await page.keyboard.press("Enter");
    await expect(page.locator("#scene-3")).toBeFocused();
    await expect(page.getByText(/rencontre le chasseur Rialé/).last()).toBeVisible();

    // True ending, then the comprehension question.
    await expect(page.getByRole("heading", { name: "Fin du récit" })).toBeVisible();
    await tabTo(page, /^Laisser l'étalon la guider$/);
    await page.keyboard.press("Enter");
    await expect(page.getByText("Bravo, c'est bien ainsi que le récit se poursuit !")).toBeVisible();
  });
});

test.describe("mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("aucune animation ni introduction", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".intro-fire")).toHaveCount(0);
    await page.waitForTimeout(300);
    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    );
    expect(running).toBe(0);
  });
});

test("l'introduction de l'accueil se passe", async ({ page }) => {
  await page.goto("/");
  const skip = page.getByRole("button", { name: "Passer l'introduction" });
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(page.locator(".intro-fire")).toHaveCount(0);
  // Once per session.
  await page.reload();
  await expect(page.locator(".intro-fire")).toHaveCount(0);
});

test("recherche Ctrl+K insensible aux accents", async ({ page }) => {
  await page.goto("/contes");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.type("riale");
  const result = dialog.getByRole("link", { name: /Yennenga, la cavalière/ });
  await expect(result).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/contes\/yennenga-la-cavaliere$/);

  await page.keyboard.press("Control+k");
  await page.keyboard.type("nakambe");
  await expect(page.getByRole("dialog").getByRole("link", { name: /Nakambé/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
