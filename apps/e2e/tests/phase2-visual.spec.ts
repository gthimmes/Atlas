import { expect, test } from '@playwright/test';

test.describe('Phase 2 visual validation', () => {
  test('work graph with react-flow + time scrubber -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'graph');
      localStorage.setItem('atlas.theme', 'dark');
    });
    await page.reload();
    await expect(page.getByTestId('work-graph')).toBeVisible();
    // Wait a beat for react-flow fitView to settle.
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/phase2-graph-dark.png', fullPage: true });
  });

  test('work graph -- light', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'graph');
      localStorage.setItem('atlas.theme', 'light');
    });
    await page.reload();
    await expect(page.getByTestId('work-graph')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/phase2-graph-light.png', fullPage: true });
  });

  test('task detail panel -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'graph');
      localStorage.setItem('atlas.theme', 'dark');
    });
    await page.reload();
    await expect(page.getByTestId('work-graph')).toBeVisible();
    await page.waitForTimeout(400);
    await page.getByTestId('graph-task-task_t512').click();
    await expect(page.getByTestId('task-detail-panel')).toBeVisible();
    await page.screenshot({ path: 'screenshots/phase2-task-detail-dark.png', fullPage: true });
  });

  test('spec editor with spawn button -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'spec');
      localStorage.setItem('atlas.activeSpec', 'spec_s142');
      localStorage.setItem('atlas.theme', 'dark');
    });
    await page.reload();
    await expect(page.getByTestId('spawn-task-button')).toBeVisible();
    await page.screenshot({ path: 'screenshots/phase2-spec-editor-dark.png', fullPage: true });
  });
});
