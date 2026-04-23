import { test as base } from '@playwright/test';

// Default fixture: most tests want the first-run modal out of the way,
// so they pre-set the dismissed flag via page.addInitScript (runs before
// the app's JavaScript). Tests that *need* to see the modal should import
// `test` directly from '@playwright/test' instead.

export const test = base.extend<{}>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('atlas.firstRunSeen', 'true');
      } catch {
        // Some early-lifecycle calls may not yet have localStorage; ignored.
      }
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
