import { expect, test } from './_fixtures.js';

// Wait for the rendered readiness score to be a non-zero number
// (the editor has finished fetching + projecting the spec).
async function waitForSpecReady(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('readiness-panel')).toBeVisible();
  await expect(page.getByTestId('readiness-score')).not.toHaveText('0');
}

test.describe('Phase 1 visual validation', () => {
  test('work graph -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'graph');
      localStorage.setItem('atlas.theme', 'dark');
    });
    await page.reload();
    await expect(page.getByTestId('work-graph')).toBeVisible();
    // Wait for at least one spec node to render inside react-flow.
    await expect(page.getByTestId('graph-spec-spec_s142')).toBeVisible();
    await page.screenshot({ path: 'screenshots/phase1-graph-dark.png', fullPage: true });
  });

  test('work graph -- light', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'graph');
      localStorage.setItem('atlas.theme', 'light');
    });
    await page.reload();
    await expect(page.getByTestId('work-graph')).toBeVisible();
    await expect(page.getByTestId('graph-spec-spec_s142')).toBeVisible();
    await page.screenshot({ path: 'screenshots/phase1-graph-light.png', fullPage: true });
  });

  test('spec editor -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'spec');
      localStorage.setItem('atlas.activeSpec', 'spec_s142');
      localStorage.setItem('atlas.theme', 'dark');
    });
    await page.reload();
    await waitForSpecReady(page);
    await page.screenshot({ path: 'screenshots/phase1-editor-dark.png', fullPage: true });
  });

  test('spec editor -- light', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'spec');
      localStorage.setItem('atlas.activeSpec', 'spec_s142');
      localStorage.setItem('atlas.theme', 'light');
    });
    await page.reload();
    await waitForSpecReady(page);
    await page.screenshot({ path: 'screenshots/phase1-editor-light.png', fullPage: true });
  });
});
