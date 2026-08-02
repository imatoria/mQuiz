import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

test.describe('Profile & Authentication Persistence Tests', () => {
  test('Edit Student Profile Full Name and verify post-refresh SQLite persistence', async ({ page }) => {
    // Step 1: Login as Student
    await loginAs(page, 'student');
    await page.goto('/student/profile');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now().toString().slice(-4);
    const updatedName = `Praveen Student Test ${timestamp}`;

    // Step 2: Fill updated full name
    const fullNameInput = page.locator('#full_name');
    await expect(fullNameInput).toBeVisible({ timeout: 10000 });
    await fullNameInput.click();
    await fullNameInput.fill('');
    await fullNameInput.type(updatedName);

    // Step 3: Click Save Changes
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Step 4: Pass 1 Immediate Value Assertion
    await expect(fullNameInput).toHaveValue(updatedName);

    // Step 5: Pass 2 Persistence Assertion (Page Refresh / F5)
    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedFullNameInput = page.locator('#full_name');
    await expect(reloadedFullNameInput).toHaveValue(updatedName);
  });
});
