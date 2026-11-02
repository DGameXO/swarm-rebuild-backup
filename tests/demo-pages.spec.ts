import { expect, test } from "@playwright/test";

/**
 * The demo folder is what gets published to GitHub Pages: every page is
 * served from `demo/` and imports the bundle with a relative `../dist/`
 * path. A broken relative path ships a blank site while the deploy job stays
 * green, so each page is loaded for real and its swarm is driven.
 */

const pages = [
  { path: "/demo/showcase.html", heading: "h1" },
  { path: "/demo/magazine.html", heading: "h1" },
  { path: "/demo/saas.html", heading: "h1" },
] as const;

for (const { path, heading } of pages) {
  test(`${path} loads the bundle and rebuilds`, async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("requestfailed", (request) =>
      failures.push(`${request.url()} ${request.failure()?.errorText}`),
    );

    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    // The bundle resolved: a missing `../dist/index.js` throws at import time.
    expect(failures).toEqual([]);
    await expect(page.locator(heading).first()).toBeVisible();

    const overlay = page.locator("swarm-rebuild");
    await expect(overlay).toBeAttached({ timeout: 20_000 });
    await expect(overlay.getByText(/Rebuilt by/)).toBeVisible({ timeout: 60_000 });
    expect(await overlay.locator(".it").count()).toBeGreaterThan(10);
    expect(failures).toEqual([]);
  });
}

test("demo landing page links to the bundle it serves", async ({ request }) => {
  for (const asset of ["/dist/index.js", "/dist/index.cjs", "/dist/index.d.ts"]) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
  }
});
