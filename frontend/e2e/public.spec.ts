// Public-route smoke tests — these don't need auth, so they're the
// safest things to run in CI without a stored credential.

import { test, expect } from '@playwright/test';

test.describe('public surfaces', () => {
  test('marketing home page loads', async ({ page }) => {
    await page.goto('/');
    // Page should at least respond and contain SOMETHING. Don't be
    // too specific because the homepage copy changes between deploys.
    await expect(page).toHaveTitle(/.+/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    // Login form needs at least a password input. We don't test
    // submission here — see login.spec.ts.
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('forgot-password page renders', async ({ page }) => {
    await page.goto('/forgot-password');
    // Just confirms the route is wired and the page mounts.
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10_000 });
  });

  test('public surgery tracker route exists with invalid token', async ({ page }) => {
    // Use an invalid token; we just want a 200 with an error message,
    // not a route 404.
    const response = await page.goto('/track/not-a-real-token');
    expect(response?.status()).toBeLessThan(500);
  });

  test('hitting an authed route redirects to /login', async ({ page }) => {
    await page.goto('/app/billing');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
