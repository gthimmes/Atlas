import { expect, test } from '@playwright/test';

// Phase 2.5 playback: first-run modal, help drawer, contextual popovers,
// informative empty states on Phase 3/4 surfaces.

test.describe('Phase 2.5 -- help system', () => {
  test('first-run modal appears on a fresh context and links into the drawer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('first-run-modal')).toBeVisible();
    await page.getByTestId('first-run-show-around').click();
    await expect(page.getByTestId('first-run-modal')).toBeHidden();
    await expect(page.getByTestId('help-drawer')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('help-article')).toHaveAttribute(
      'data-section',
      'reading-work-graph',
    );
  });

  test('dismiss sets firstRunSeen and modal does not return on reload', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('first-run-dismiss').click();
    await page.reload();
    await expect(page.getByTestId('first-run-modal')).toBeHidden();
  });

  test('? keyboard shortcut toggles the help drawer', async ({ page }) => {
    await page.goto('/');
    // Dismiss first-run to get out of the way.
    await page.getByTestId('first-run-dismiss').click();
    await page.keyboard.press('Shift+Slash');
    await expect(page.getByTestId('help-drawer')).toHaveAttribute('data-open', 'true');
    await page.keyboard.press('Shift+Slash');
    await expect(page.getByTestId('help-drawer')).toHaveAttribute('data-open', 'false');
  });

  test('help button in nav opens the drawer', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('first-run-dismiss').click();
    await page.getByTestId('help-button').click();
    await expect(page.getByTestId('help-drawer')).toHaveAttribute('data-open', 'true');
  });

  test('section navigation switches the article content', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('first-run-dismiss').click();
    await page.getByTestId('help-button').click();
    await page.getByTestId('help-section-readiness-gate').click();
    await expect(page.getByTestId('help-article')).toHaveAttribute(
      'data-section',
      'readiness-gate',
    );
    await expect(page.getByTestId('help-article')).toContainText('The readiness gate');
  });

  test('Agent run placeholder shows informative copy + link to help', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('first-run-dismiss').click();
    await page
      .getByRole('navigation')
      .getByRole('button', { name: /^Agent run/i })
      .click();
    await expect(page.getByTestId('coming-soon-run')).toBeVisible();
    await expect(page.getByTestId('coming-soon-run')).toContainText('Phase 3 — not built yet');
    await expect(page.getByTestId('coming-soon-run')).toContainText(/activity stream/i);
  });

  test('What-is-this popover on readiness deep-links to the readiness-gate section', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('first-run-dismiss').click();
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'spec');
      localStorage.setItem('atlas.activeSpec', 'spec_s142');
    });
    await page.reload();
    const panel = page.getByTestId('readiness-panel');
    await expect(panel).toBeVisible();
    await panel.getByTestId('whats-this-trigger').click();
    await panel.getByRole('button', { name: /Read more/i }).click();
    await expect(page.getByTestId('help-drawer')).toHaveAttribute('data-open', 'true');
    await expect(page.getByTestId('help-article')).toHaveAttribute(
      'data-section',
      'readiness-gate',
    );
  });
});
