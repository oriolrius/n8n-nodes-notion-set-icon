import { test, expect } from '@playwright/test';

const N8N_URL = 'http://localhost:15678';

test.describe('ACTUAL WORKING Docker Test', () => {
  test('Login with correct credentials and verify', async ({ page }) => {
    await page.goto(N8N_URL);
    await page.waitForLoadState('networkidle');

    // These are the ACTUAL credentials that work
    await page.fill('input[type="email"]', 'test@n8n-notion.local');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button:has-text("Sign in")');

    // Wait for login
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log('After login URL:', url);

    if (!url.includes('/signin')) {
      console.log('✅ LOGIN SUCCESSFUL!');
    } else {
      console.log('❌ LOGIN FAILED');
    }

    expect(url).not.toContain('/signin');
  });
});