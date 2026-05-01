import { test, expect } from '@playwright/test';

/**
 * Smoke E2E: log in and confirm the dashboard renders.
 * The credentials are read from env so different environments can override:
 *   E2E_USERNAME (default: admin)
 *   E2E_PASSWORD (required — refuse to run with the demo default)
 *
 * Run locally:
 *   E2E_PASSWORD='your-password' npx playwright test --project=chromium
 */

const USERNAME = process.env.E2E_USERNAME || 'admin';
const PASSWORD = process.env.E2E_PASSWORD;

test.describe('login flow', () => {
  test.skip(!PASSWORD, 'set E2E_PASSWORD to run');

  test('admin can log in and see the dashboard', async ({ page }) => {
    await page.goto('/login');

    // Login form is the first labeled input/password input on the page.
    const userInput = page.locator('input').first();
    await userInput.fill(USERNAME);
    const passInput = page.locator('input[type="password"]');
    await passInput.fill(PASSWORD as string);

    await page.getByRole('button', { name: /sign in/i }).click();

    // Logged-in shell shows the sidebar with "Dashboard" entry.
    await expect(page.getByText(/dashboard/i).first()).toBeVisible({ timeout: 15_000 });

    // Smoke: navigate to Audit Log, verify the heading.
    await page.goto('/audit-log');
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible({ timeout: 10_000 });
  });
});
