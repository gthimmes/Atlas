import { expect, test } from '@playwright/test';

test.describe('Phase 1 visual validation', () => {
  test('work graph -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'graph');
      localStorage.setItem('atlas.theme', 'dark');
    });
    await page.reload();
    await expect(page.getByTestId('work-graph')).toBeVisible();
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
    await expect(page.getByTestId('readiness-panel')).toBeVisible();
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
    await expect(page.getByTestId('readiness-panel')).toBeVisible();
    await page.screenshot({ path: 'screenshots/phase1-editor-light.png', fullPage: true });
  });
});
