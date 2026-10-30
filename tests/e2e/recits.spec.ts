import { expect, test, type Page } from "@playwright/test";

// The build under test must use the same value (see README, "Tests").
const DRAFTS = process.env.NEXT_PUBLIC_SHOW_DRAFTS === "true";

const player = (page: Page) => page.getByRole("region", { name: "Lecteur audio" });
const position = (page: Page) =>
  player(page).getByRole("slider", { name: "Position dans le récit" });

test.describe("catalogue", () => {
  test("liste, filtre et état vide", async ({ page }) => {
    await page.goto("/contes");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contes et légendes");
    const cards = page.getByRole("main").getByRole("listitem").getByRole("link");
    await expect(cards).toHaveCount(5);

    await page.goto("/contes?type=legende");
    await expect(cards).toHaveCount(3);

    await page.goto("/contes?q=zzzz");
    await expect(page.getByText("Aucun récit ne correspond à ces filtres.")).toBeVisible();
    // Shown both in the filter bar and in the empty state.
    await page.getByRole("button", { name: "Effacer les filtres" }).first().click();
    await expect(cards).toHaveCount(5);
  });
});

test.describe("page d'un récit", () => {
  test("un récit restreint ne montre aucun média ni texte", async ({ page }) => {
    await page.goto("/contes/silures-de-dafra");
    await expect(page.getByRole("note").getByText("Récit protégé")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Écouter/ })).toHaveCount(0);
    await expect(page.locator("audio, video")).toHaveCount(0);
    await expect(page.getByText("Transcription")).toHaveCount(0);
    await expect(page.getByText("Mare aux silures sacrés de Dafra")).toBeVisible();
  });

  test("JSON-LD CreativeWork", async ({ page }) => {
    await page.goto("/contes/yennenga-la-cavaliere");
    const json = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(json["@type"]).toBe("CreativeWork");
    expect(json.inLanguage).toEqual(expect.arrayContaining(["fr", "mos"]));
    expect(json.contentLocation.address.addressRegion).toBe("Nakambé");
  });

  test("sans le mode brouillon, un récit non consenti reste en collecte", async ({ page }) => {
    test.skip(DRAFTS, "build en mode brouillon");
    await page.goto("/contes/yennenga-la-cavaliere");
    await expect(page.getByRole("note").getByText("Récit en cours de collecte")).toBeVisible();
    await expect(page.getByRole("button", { name: "Écouter ce récit" })).toHaveCount(0);
  });
});

test.describe("lecteur (mode brouillon)", () => {
  test.skip(!DRAFTS, "nécessite NEXT_PUBLIC_SHOW_DRAFTS=true au build");

  test("l'audio continue en changeant de page", async ({ page }) => {
    await page.goto("/contes/yennenga-la-cavaliere");
    await page.getByRole("button", { name: /Écouter ce récit/ }).click();
    await expect(player(page)).toBeVisible();
    await expect(player(page).getByRole("button", { name: "Pause" })).toBeVisible();
    await expect.poll(async () => Number(await position(page).inputValue())).toBeGreaterThan(0.5);

    // Client-side navigation through the header (folded menu on mobile).
    const menu = page.getByRole("button", { name: "Ouvrir le menu" });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Carte" })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/carte/);
    await expect(player(page).getByRole("button", { name: "Pause" })).toBeVisible();
    const before = Number(await position(page).inputValue());
    await expect.poll(async () => Number(await position(page).inputValue())).toBeGreaterThan(before + 0.5);
  });

  test("un clic sur une phrase déplace la lecture", async ({ page }) => {
    await page.goto("/contes/yennenga-la-cavaliere");
    await page.getByRole("button", { name: /rencontre le chasseur Rialé/ }).click();
    await expect.poll(async () => Number(await position(page).inputValue())).toBeGreaterThanOrEqual(12);
    await expect(page.getByRole("button", { name: /rencontre le chasseur Rialé/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("mode Lire : texte et taille réglable", async ({ page }) => {
    await page.goto("/contes/yennenga-la-cavaliere");
    await page.getByRole("tab", { name: "Lire" }).click();
    await expect(page.getByRole("tabpanel").getByText(/La princesse refuse de rester au palais/)).toBeVisible();
    await expect(page.getByText("Le texte dans cette langue est en cours de collecte.")).toBeVisible();
    await page.getByRole("button", { name: "Agrandir le texte" }).click();
  });

  test("les onglets se parcourent au clavier", async ({ page }) => {
    await page.goto("/contes/yennenga-la-cavaliere");
    await page.getByRole("tab", { name: "Écouter" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Lire" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Lire" })).toHaveAttribute("aria-selected", "true");
  });
});
