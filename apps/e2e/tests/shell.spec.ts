import { expect, test } from '@playwright/test';

test.describe('Phase 0 shell', () => {
  test('renders nav + default Work Graph surface', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('atlas-shell')).toBeVisible();
    await expect(page.getByRole('button', { name: /Work graph/i })).toBeVisible();
    await expect(page.getByTestId('surface-graph')).toBeVisible();
  });

  test('keyboard shortcut S switches to Spec surface', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('s');
    await expect(page.getByTestId('surface-spec')).toBeVisible();
  });

  test('theme toggle flips dark to light', async ({ page }) => {
    await page.goto('/');
    const shell = page.getByTestId('atlas-shell');
    const initialClass = await shell.getAttribute('class');
    await page.getByRole('button', { name: /toggle to/i }).click();
    await expect(shell).not.toHaveClass(initialClass ?? '');
  });

  test('Work Graph, Spec, Run, and Digest are all reachable via nav', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    for (const [label, testid] of [
      ['Work graph', 'surface-graph'],
      ['Spec', 'surface-spec'],
      ['Agent run', 'surface-run'],
      ['Digest', 'surface-digest'],
    ] as const) {
      await nav.getByRole('button', { name: new RegExp(`^${label}`, 'i') }).click();
      await expect(page.getByTestId(testid)).toBeVisible();
    }
  });
});
