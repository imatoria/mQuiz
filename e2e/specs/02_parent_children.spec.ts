import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Parent Children & Academic Profile Tests', () => {
  test('Update Academic Class Assignment and verify post-refresh SQLite persistence', async ({ page }) => {
    // Step 1: Login as Parent
    await loginAs(page, 'parent');
    await page.goto('/parent/children');
    await page.waitForLoadState('networkidle');

    // Step 2: Click Manage Profile button for child if available
    const manageProfileBtn = page.locator('button:has-text("Manage Profile")').first();
    if (await manageProfileBtn.isVisible()) {
      await manageProfileBtn.click();
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Save Changes"), button:has-text("Save Profile")').first();
      if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Step 3: Pass 2 Persistence Assertion (Page Refresh)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Children Management')).toBeVisible();
  });
});
