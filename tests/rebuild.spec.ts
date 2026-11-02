import { expect, test } from "@playwright/test";

/**
 * The engine wipes the page, rebuilds it inside a shadow root, then hands the
 * real DOM back. These tests drive the public API through the demo page and
 * assert on the visible outcome, not on internals.
 */

test("rebuilds the page and hands it back", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/demo/index.html?test=rebuild");

  const overlay = page.locator("swarm-rebuild");
  await expect(overlay).toBeAttached();

  // The HUD reports progress while the swarm works, then the final count.
  await expect(overlay.getByText(/Rebuilt by/)).toBeVisible({ timeout: 60_000 });

  // Everything below is rebuilt: text, boxes and media all have nodes.
  const items = overlay.locator(".it");
  expect(await items.count()).toBeGreaterThan(20);

  // Hand off: the overlay fades out and is removed from the document.
  await overlay.locator('button[data-a="live"]').click();
  await expect(overlay).toHaveCount(0, { timeout: 10_000 });

  // The real page is interactive again.
  await page.locator("#replay").click();
  await expect(page.locator("swarm-rebuild")).toBeAttached({ timeout: 10_000 });

  expect(errors).toEqual([]);
});

test("respects prefers-reduced-motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo/index.html?test=reduced");

  const overlay = page.locator("swarm-rebuild");
  await expect(overlay).toBeAttached();

  // No cursors, no HUD: a single cross-fade, then the page is back.
  await expect(overlay.locator(".cursor")).toHaveCount(0);
  await expect(overlay).toHaveCount(0, { timeout: 10_000 });
});

test("Esc exits without touching the page", async ({ page }) => {
  await page.goto("/demo/index.html?test=escape");

  const overlay = page.locator("swarm-rebuild");
  await expect(overlay).toBeAttached();

  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator("h1")).toContainText("rebuilt");
});
