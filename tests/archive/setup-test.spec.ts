import { test, expect } from '@playwright/test';

const N8N_URL = 'http://localhost:15678';

test.describe('n8n Setup Test', () => {
  test('Setup n8n owner account', async ({ page }) => {
    console.log('🚀 Starting n8n setup test...');

    // Navigate directly to root which should redirect to setup
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded' });

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-initial-page.png' });
    console.log('📸 Initial page screenshot saved');

    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // If we're on the setup page, fill it out
    if (currentUrl.includes('/setup') || currentUrl === N8N_URL + '/') {
      console.log('📝 On setup page, filling form...');

      // Wait a bit for the form to fully render
      await page.waitForTimeout(2000);

      // Take screenshot of setup form
      await page.screenshot({ path: 'test-results/02-setup-form.png' });

      try {
        // Try different selector strategies
        const emailInput = await page.locator('input[type="email"]').first();
        await emailInput.fill('test@example.com');
        console.log('✅ Email filled');

        // Look for first name field - try multiple strategies
        const firstNameInput = await page.locator('input').nth(1); // Second input field
        await firstNameInput.fill('Test');
        console.log('✅ First name filled');

        const lastNameInput = await page.locator('input').nth(2); // Third input field
        await lastNameInput.fill('User');
        console.log('✅ Last name filled');

        const passwordInput = await page.locator('input[type="password"]').first();
        await passwordInput.fill('TestPassword123!');
        console.log('✅ Password filled');

        // Try to click the checkbox label (the checkbox itself is hidden)
        try {
          await page.locator('text=I want to receive security and product updates').click();
          console.log('✅ Checkbox checked');
        } catch (e) {
          console.log('⚠️ Could not check checkbox (optional)');
        }

        // Take screenshot before submitting
        await page.screenshot({ path: 'test-results/03-form-filled.png' });

        // Find and click the Next/Submit button
        const nextButton = await page.locator('button').filter({ hasText: 'Next' }).first();
        console.log('🔘 Clicking Next button...');
        await nextButton.click();

        // Wait for navigation
        await page.waitForTimeout(5000);

        // Take final screenshot
        await page.screenshot({ path: 'test-results/04-after-setup.png' });

        const newUrl = page.url();
        console.log(`📍 New URL after setup: ${newUrl}`);

        if (newUrl.includes('/signin')) {
          console.log('✅ Setup complete - redirected to signin');
        } else if (newUrl.includes('/workflow')) {
          console.log('✅ Setup complete - logged in to workflows');
        } else {
          console.log(`⚠️ Unknown state after setup: ${newUrl}`);
        }

      } catch (error) {
        console.error('❌ Error during setup:', error);
        await page.screenshot({ path: 'test-results/error-state.png' });
        throw error;
      }
    } else if (currentUrl.includes('/signin')) {
      console.log('ℹ️ n8n already set up - on signin page');
    } else {
      console.log('ℹ️ n8n in unexpected state');
    }
  });
});