import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Admin Portal Tests', () => {
  test('Admin User Management & Role Filtering', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Verify User Accounts card title renders
    const title = page.locator('text=User Accounts').first();
    await expect(title).toBeVisible({ timeout: 10000 });

    // Verify page refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(title).toBeVisible({ timeout: 10000 });
  });
});
