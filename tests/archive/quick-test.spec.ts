import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const N8N_URL = 'http://localhost:15678';

test.describe('Quick Docker Test', () => {
  test('Verify Docker n8n is running and accessible', async ({ page }) => {
    // Check if n8n is healthy
    try {
      const health = execSync('curl -s http://localhost:15678/healthz', { encoding: 'utf-8' });
      console.log('✅ n8n is healthy:', health);
    } catch (e) {
      console.log('❌ n8n not accessible, starting containers...');
      execSync('docker compose up -d', { cwd: __dirname, stdio: 'inherit' });
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Navigate to n8n
    await page.goto(N8N_URL);
    await page.waitForTimeout(2000);

    // Check if we're on signin or setup page
    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('/signin') || url.includes('/setup')) {
      console.log('✅ n8n is accessible');

      // Try to sign in with existing account
      if (url.includes('/signin')) {
        await page.fill('input[type="email"]', 'test@n8n-notion.local');
        await page.fill('input[type="password"]', 'TestPassword123!');
        await page.click('button:has-text("Sign in")');
        await page.waitForTimeout(2000);

        const afterLoginUrl = page.url();
        if (!afterLoginUrl.includes('/signin')) {
          console.log('✅ Successfully logged in');
        }
      }
    }

    expect(page.url()).not.toContain('/error');
  });
});