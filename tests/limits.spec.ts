import { expect, test } from "@playwright/test";

/**
 * Capture limits and the media placeholder hook are public options: this
 * fixture caps the item count and supplies an image for canvas and iframe.
 */

declare global {
  interface Window {
    __swarm: { start(): void; destroy(): void };
  }
}

test("caps items and uses the placeholder hook", async ({ page }) => {
  await page.goto("/tests/fixtures/limits.html");
  await page.evaluate(() => window.__swarm.start());

  const overlay = page.locator("swarm-rebuild");
  await expect(overlay.getByText(/Rebuilt by/)).toBeVisible({ timeout: 60_000 });

  const items = overlay.locator(".it");
  expect(await items.count()).toBeLessThanOrEqual(12);

  const media = overlay.locator("img.md");
  await expect(media.first()).toHaveAttribute("src", /placeholder/);
});
