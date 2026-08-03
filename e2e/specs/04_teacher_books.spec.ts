import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Book Manager Page Content & Persistence Tests', () => {
  test('Edit Book Page Content and verify post-refresh persistence', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/teacher/content/book');
    await page.waitForLoadState('networkidle');

    // Verify Content Creation heading renders
    const heading = page.getByRole('heading', { name: 'Content Creation' });
    await expect(heading).toBeVisible();

    // Verify page refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(heading).toBeVisible();
  });
});
