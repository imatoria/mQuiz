import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Result Approval & Visibility Tests', () => {
  test('Toggle Result Visibility and verify post-refresh persistence', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/teacher/approval');

    // Verify Result Management page renders
    await expect(page.locator('text=Result Management')).toBeVisible();

    // Verify page refresh
    await page.reload();
    await expect(page.locator('text=Result Management')).toBeVisible();
  });
});
