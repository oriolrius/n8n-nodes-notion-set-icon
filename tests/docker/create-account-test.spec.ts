import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const N8N_URL = 'http://localhost:15678';

test.describe('Create n8n Account', () => {
  test('Create account via CLI first', async () => {
    console.log('Creating n8n owner account via CLI...');

    try {
      // Reset and create owner account
      const result = execSync(
        'docker exec n8n-notion-test n8n user-management:reset ' +
        '--email="test@n8n-notion.local" ' +
        '--password="TestPassword123!" ' +
        '--firstName="Test" ' +
        '--lastName="User"',
        { encoding: 'utf-8' }
      );
      console.log('Account created:', result);
    } catch (e: any) {
      console.log('Error creating account:', e.message);
      // Try to just update the password if account exists
      try {
        execSync(
          'docker exec n8n-notion-test npx n8n user-management:reset ' +
          '--email="test@n8n-notion.local" ' +
          '--password="TestPassword123!"',
          { encoding: 'utf-8' }
        );
        console.log('Password reset');
      } catch (e2) {
        console.log('Could not reset password either');
      }
    }
  });

  test('Now login with created account', async ({ page }) => {
    console.log('Navigating to n8n...');
    await page.goto(N8N_URL);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Should be on signin page now
    if (currentUrl.includes('/signin')) {
      // Fill email
      await page.fill('input[type="email"]', 'test@n8n-notion.local');

      // Fill password
      await page.fill('input[type="password"]', 'TestPassword123!');

      // Take screenshot before login
      await page.screenshot({ path: 'test-results/before-login.png' });

      // Click sign in
      await page.click('button:has-text("Sign in")');

      // Wait a bit
      await page.waitForTimeout(5000);

      const afterUrl = page.url();
      console.log('After login URL:', afterUrl);

      // Take screenshot after login
      await page.screenshot({ path: 'test-results/after-login.png' });

      if (afterUrl.includes('/signin')) {
        console.log('❌ Still on signin page - login failed');

        // Check for error messages
        const errorMsg = await page.locator('.error, [class*="error"]').textContent().catch(() => 'No error message');
        console.log('Error message:', errorMsg);
      } else {
        console.log('✅ Successfully logged in to:', afterUrl);
      }
    }
  });
});