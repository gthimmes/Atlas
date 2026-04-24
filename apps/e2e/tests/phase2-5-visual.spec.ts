import { expect, test } from '@playwright/test';

// Phase 2.5 screenshots: first-run modal, help drawer, and the new
// informative Phase 3 placeholder. Imports vanilla `test` so the
// first-run flag is NOT pre-dismissed.

test.describe('Phase 2.5 visual validation', () => {
  test('first-run modal -- dark', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('first-run-modal')).toBeVisible();
    await page.screenshot({ path: 'screenshots/phase2-5-first-run-dark.png', fullPage: true });
  });

  test('help drawer opened on reading-work-graph -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('atlas.firstRunSeen', 'true'));
    await page.reload();
    await page.getByTestId('help-button').click();
    await page.getByTestId('help-section-reading-work-graph').click();
    await expect(page.getByTestId('help-article')).toHaveAttribute(
      'data-section',
      'reading-work-graph',
    );
    await page.screenshot({ path: 'screenshots/phase2-5-help-drawer-dark.png', fullPage: true });
  });

  test('agent run placeholder -- dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('atlas.firstRunSeen', 'true'));
    await page.reload();
    await page
      .getByRole('navigation')
      .getByRole('button', { name: /^Agent run/i })
      .click();
    await expect(page.getByTestId('coming-soon-run')).toBeVisible();
    await page.screenshot({
      path: 'screenshots/phase2-5-agent-run-placeholder.png',
      fullPage: true,
    });
  });
});
