import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/');
    
    // Check for "Sign In" text or other login page indicators
    await expect(page.getByText(/Sign In/i)).toBeVisible();
    await expect(page.getByText(/RoadMaster/i)).toBeVisible();
  });

  test('should have correct metadata', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RoadMaster Pro/i);
  });
});
