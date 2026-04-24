import { expect, test } from './_fixtures.js';

// Phase 2.7 playback: the project switcher replaces the static breadcrumb,
// and both the inline "+ New project" path and the Manage Projects dialog
// can create a new project.

test.describe('Phase 2.7 -- project switcher + create', () => {
  test('switcher shows the seeded Core project and its spec count', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('atlas.view', 'graph'));
    await page.reload();
    const switcher = page.getByTestId('project-switcher');
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText(/Core/);

    await switcher.click();
    const menu = page.getByTestId('project-switcher-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId('project-switcher-item-prj_core')).toBeVisible();
    await expect(menu.getByTestId('project-switcher-item-prj_core')).toContainText(/spec/);
  });

  test('Manage projects opens the dialog and can create a new project', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('atlas.view', 'graph'));
    await page.reload();
    await page.getByTestId('project-switcher').click();
    await page.getByTestId('project-switcher-manage').click();
    const dialog = page.getByTestId('projects-dialog');
    await expect(dialog).toBeVisible();

    const name = `Platform ${Date.now().toString(36).slice(-5)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await page.getByTestId('projects-new-name').fill(name);
    await page.getByTestId('projects-new-submit').click();

    // Row for the new project appears with 0 specs.
    await expect(dialog.getByText(name)).toBeVisible();
    await expect(dialog.getByText(slug)).toBeVisible();

    // The switcher reflects the new active project.
    await page.getByRole('button', { name: 'close projects' }).click();
    await expect(page.getByTestId('project-switcher')).toContainText(new RegExp(name));
  });

  test('switching projects filters the Work Graph', async ({ page, request }) => {
    // Ensure there is at least one extra project with no specs.
    const emptyProj = await request.post('http://localhost:5179/v1/tools/project.create', {
      data: { slug: `empty-${Date.now().toString(36).slice(-5)}`, name: 'Empty for filter test' },
    });
    expect(emptyProj.ok()).toBeTruthy();

    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('atlas.view', 'graph'));
    await page.reload();
    await expect(page.getByTestId('work-graph')).toBeVisible();

    // Switch to the empty project -> graph empty state appears.
    await page.getByTestId('project-switcher').click();
    const menu = page.getByTestId('project-switcher-menu');
    const emptyRow = menu.getByText('Empty for filter test').first();
    await emptyRow.click();

    await expect(page.getByTestId('graph-empty')).toBeVisible();
  });

  test('new spec defaults to the active project', async ({ page, request }) => {
    // Create an isolated project so the switcher + modal agree on what to pick.
    const slug = `default-check-${Date.now().toString(36).slice(-5)}`;
    const name = `Default Check ${Date.now()}`;
    const res = await request.post('http://localhost:5179/v1/tools/project.create', {
      data: { slug, name },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const projectId: string = body.id;

    await page.goto('/');
    // Pre-set the active project so the switcher opens already pointing at it.
    await page.evaluate((pid) => {
      localStorage.setItem('atlas.view', 'graph');
      localStorage.setItem('atlas.activeProject', pid);
    }, projectId);
    await page.reload();
    await expect(page.getByTestId('project-switcher')).toContainText(new RegExp(name));

    await page.getByTestId('new-spec-button').click();
    const select = page.getByTestId('new-spec-project');
    await expect(select).toHaveValue(projectId);
  });
});
