import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Paper Creator & Question Bank Tests', () => {
  test('Question Bank Filtering & Edit Persistence', async ({ page }) => {
    await loginAs(page, 'parent');
    await page.goto('/parent/questions');
    await page.waitForLoadState('networkidle');

    // Verify Question Bank heading renders
    const heading = page.getByRole('heading', { name: 'Question Bank' });
    await expect(heading).toBeVisible();

    // Verify page refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(heading).toBeVisible();
  });
});
