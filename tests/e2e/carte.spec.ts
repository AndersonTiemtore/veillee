import { expect, test } from "@playwright/test";

// WebGL maps are slow to start on modest machines.
test.describe.configure({ timeout: 60_000 });

test("carte → Nakambé → Yennenga → page du récit", async ({ page }) => {
  // A visible canvas is not enough: a broken worker only shows in the console.
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  // Wait for our own data rather than "networkidle", which also waits on
  // third-party glyph requests and is slow under load.
  const regionsLoaded = page.waitForResponse(/\/data\/regions\.geojson$/);
  await page.goto("/carte");
  await regionsLoaded;
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);

  await page.getByRole("button", { name: /Nakambé/ }).click();
  await expect(page).toHaveURL(/region=nakambe/);

  const panel = page.getByRole("complementary", { name: "Nakambé" });
  await expect(panel).toBeVisible();
  const story = panel.getByRole("link", { name: /Yennenga, la cavalière/ });
  await expect(story).toBeVisible();

  await story.click();
  await expect(page).toHaveURL(/\/contes\/yennenga-la-cavaliere$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yennenga, la cavalière");
});

test("les filtres sont reflétés dans l'URL", async ({ page }) => {
  await page.goto("/carte?type=legende");
  // On mobile the filter panel is folded behind a button.
  const open = page.getByRole("button", { name: /^Filtres/ });
  if (await open.isVisible()) await open.click();

  await expect(page.getByRole("button", { name: "Légende", pressed: true })).toBeVisible();
  await expect(page.getByText("3 sur 5 affichés")).toBeVisible();

  await page.getByRole("searchbox", { name: "Titre" }).fill("crocodiles");
  await expect(page).toHaveURL(/q=crocodiles/);
  await expect(page.getByText("2 sur 5 affichés")).toBeVisible();

  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect(page).not.toHaveURL(/type=|q=/);
  await expect(page.getByText("5 sur 5 affichés")).toBeVisible();
});

test("contrôles flottants : calques, survol, recentrer", async ({ page }) => {
  await page.goto("/carte");
  await page.getByRole("button", { name: "Calques" }).click();
  await expect(page.getByRole("switch", { name: "Relief" })).toBeVisible();
  await page.getByRole("button", { name: "Calques" }).click();

  await page.getByRole("button", { name: "Survoler" }).click();
  await expect(page.getByRole("button", { name: "Arrêter le survol" })).toBeVisible();
  await page.getByRole("button", { name: "Arrêter le survol" }).click();
  await expect(page.getByRole("button", { name: "Recentrer" })).toBeVisible();
});

test("la liste des régions est disponible sans la carte", async ({ page }) => {
  await page.goto("/carte");
  await expect(page.getByRole("heading", { name: "Les 17 régions" })).toBeVisible();
  const buttons = page.getByRole("region", { name: "Les 17 régions" }).getByRole("button");
  await expect(buttons).toHaveCount(17);
});

test("fiche région : Nakambé", async ({ page }) => {
  await page.goto("/regions/nakambe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nakambé");
  await expect(page.getByRole("heading", { name: "Autour de ces récits" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Yennenga/ })).toBeVisible();
});
