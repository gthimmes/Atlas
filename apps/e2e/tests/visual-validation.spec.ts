import { expect, test } from '@playwright/test';

// One-off: captures dark + light screenshots of the Phase 0 shell for
// manual visual validation. Safe to leave in the suite -- screenshots are
// not visual-regression tested (yet).

test.describe('Phase 0 visual validation', () => {
  test('captures dark theme screenshot', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('atlas-shell')).toHaveClass(/theme-dark/);
    await page.screenshot({ path: 'screenshots/phase0-dark.png', fullPage: true });
  });

  test('captures light theme screenshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /toggle to/i }).click();
    await expect(page.getByTestId('atlas-shell')).toHaveClass(/theme-light/);
    await page.screenshot({ path: 'screenshots/phase0-light.png', fullPage: true });
  });
});
