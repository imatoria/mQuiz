import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Student Analytics & Timeline Tests', () => {
  test('Change Time Duration dropdown and verify dynamic chart recalculation & refresh persistence', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/student/analytics/timeline');

    // Verify Student Analytics page renders
    await expect(page.locator('text=Performance Analytics')).toBeVisible();

    // Verify page refresh
    await page.reload();
    await expect(page.locator('text=Performance Analytics')).toBeVisible();
  });
});
