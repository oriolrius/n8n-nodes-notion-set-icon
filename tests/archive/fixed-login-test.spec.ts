import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const N8N_URL = 'http://localhost:15678';

test.describe('Fixed Docker Login Test', () => {
  test('Actually login to n8n properly', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Navigating to n8n...');
    await page.goto(N8N_URL);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/signin')) {
      console.log('On signin page, attempting login...');

      // Wait for email input to be visible
      const emailInput = page.locator('input[type="email"]');
      await emailInput.waitFor({ state: 'visible' });
      await emailInput.click();
      await emailInput.fill('test@n8n-notion.local');

      // Wait for password input
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.click();
      await passwordInput.fill('TestPassword123!');

      // Click sign in button
      const signInButton = page.locator('button:has-text("Sign in")');
      await signInButton.click();

      // Wait for navigation away from signin
      await page.waitForURL((url) => !url.toString().includes('/setup'), { timeout: 10000 });

      const afterLoginUrl = page.url();
      console.log('After login URL:', afterLoginUrl);

      if (afterLoginUrl.includes('/signin')) {
        throw new Error('Login failed - still on signin page');
      }

      console.log('✅ Successfully logged in');
    } else if (currentUrl.includes('/setup')) {
      console.log('On setup page, creating account...');

      // Create new account
      await page.fill('input[type="email"]', 'test@n8n-notion.local');
      await page.fill('input[placeholder*="First"]', 'Test');
      await page.fill('input[placeholder*="Last"]', 'User');
      await page.fill('input[type="password"]', 'TestPassword123!');

      const nextButton = page.locator('button:has-text("Next")');
      await nextButton.click();

      await page.waitForURL((url) => !url.includes('/setup'), { timeout: 10000 });
      console.log('✅ Account created');
    }

    // Verify we're logged in by checking URL
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    expect(finalUrl).not.toContain('/signin');
    expect(finalUrl).not.toContain('/setup');
  });
});