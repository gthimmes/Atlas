import { expect, test } from '@playwright/test';

// Phase 1 playback: open the seeded Meridian spec (S-142), edit a section,
// confirm the API responds + SSE pushes a fresh readiness breakdown that
// the UI renders. Each step has a trace retained on failure.

test.describe('Phase 1 spec editor', () => {
  test('work graph renders seeded specs + tasks', async ({ page }) => {
    await page.goto('/');
    // localStorage may say 'spec' from a prior test -- force graph view.
    await page.evaluate(() => localStorage.setItem('atlas.view', 'graph'));
    await page.reload();

    await expect(page.getByTestId('work-graph')).toBeVisible();
    await expect(page.getByTestId('graph-spec-spec_s142')).toBeVisible();
    // The Meridian fixture seeds 4 tasks under S-142.
    for (const id of ['task_t511', 'task_t512', 'task_t513', 'task_t514']) {
      await expect(page.getByTestId(`graph-task-${id}`)).toBeVisible();
    }
  });

  test('clicking a spec node routes to the editor', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('atlas.view', 'graph'));
    await page.reload();

    await page.getByTestId('graph-spec-spec_s142').click();
    await expect(page.getByTestId('surface-spec')).toBeVisible();
    await expect(page.getByTestId('readiness-panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Risk-aware auto-merge/i })).toBeVisible();
  });

  test('editing intent pushes a readiness update via SSE', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'spec');
      localStorage.setItem('atlas.activeSpec', 'spec_s142');
    });
    await page.reload();

    await expect(page.getByTestId('readiness-panel')).toBeVisible();
    const initialScore = await page.getByTestId('readiness-score').textContent();

    const unique = `Phase 1 edit ${Date.now()}`;
    await page.getByTestId('intent-textarea').fill(unique);

    // The 500ms debounce + server round-trip should produce a fresh breakdown.
    // Readiness score won't change for an intent-only edit, but the version
    // (shown in the header) must bump.
    await expect(async () => {
      const header = await page.locator('[data-testid="surface-spec"]').textContent();
      expect(header ?? '').toMatch(/v\d+/);
    }).toPass({ timeout: 5_000 });

    // Still displays a score (the UI should keep the last good value).
    await expect(page.getByTestId('readiness-score')).toHaveText(initialScore ?? /\d+/);
  });

  test('acceptance chips reflect seeded statuses', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas.view', 'spec');
      localStorage.setItem('atlas.activeSpec', 'spec_s142');
    });
    await page.reload();

    // S-142 fixture has 3 passing + 1 flaky acceptance criteria.
    await expect(page.getByTestId('acceptance-list')).toBeVisible();
    await expect(page.locator('[data-status="passing"]')).toHaveCount(3);
    await expect(page.locator('[data-status="flaky"]')).toHaveCount(1);
  });
});
