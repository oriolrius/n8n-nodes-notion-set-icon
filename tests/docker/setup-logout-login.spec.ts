import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const N8N_URL = 'http://localhost:15678';
const TEST_EMAIL = 'test@n8n-notion.local';
const TEST_PASSWORD = 'TestPassword123!';

test.describe('n8n Setup, Logout, and Login', () => {
  test.describe.configure({ retries: 0 }); // No retries
  test.beforeAll(async () => {
    console.log('🧹 Removing existing database...');

    // Stop containers
    execSync('docker compose down', { cwd: __dirname });

    // Remove volume to clear database
    try {
      execSync('docker volume rm docker_n8n-data', { cwd: __dirname });
      console.log('✅ Database volume removed');
    } catch (e) {
      console.log('No volume to remove');
    }

    // Start fresh n8n
    console.log('🐳 Starting fresh n8n...');
    execSync('docker compose up -d', { cwd: __dirname });

    // Wait for n8n to be ready
    console.log('⏳ Waiting for n8n to be ready...');
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        execSync('curl -s http://localhost:15678/healthz', { stdio: 'ignore' });
        ready = true;
        break;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (ready) {
      console.log('✅ n8n is ready!');
    } else {
      throw new Error('n8n failed to start');
    }
  });

  test('Setup n8n, logout, and login', async ({ page }) => {
    test.setTimeout(30000); // 30 seconds timeout
    console.log('\n=== PHASE 1: SETUP ===\n');

    // Go to n8n - should redirect to setup
    await page.goto(N8N_URL);
    await page.waitForLoadState('networkidle');

    const setupUrl = page.url();
    console.log('URL after navigation:', setupUrl);

    // Should be on setup page
    expect(setupUrl).toContain('/setup');
    console.log('✅ On setup page');

    // Fill setup form - 4 fields and checkbox
    console.log('Filling setup form...');

    // Email field
    const emailField = page.locator('input[type="email"]');
    await emailField.fill(TEST_EMAIL);
    console.log('✓ Email filled');

    // First name field
    const firstNameField = page.locator('input[name="firstName"], input[placeholder*="First"]').first();
    await firstNameField.fill('Test');
    console.log('✓ First name filled');

    // Last name field
    const lastNameField = page.locator('input[name="lastName"], input[placeholder*="Last"]').first();
    await lastNameField.fill('User');
    console.log('✓ Last name filled');

    // Password field
    const passwordField = page.locator('input[type="password"]');
    await passwordField.fill(TEST_PASSWORD);
    console.log('✓ Password filled');

    // Check the agreement checkbox by clicking the label
    const checkboxLabel = page.locator('label:has-text("I want to receive")').first();
    await checkboxLabel.click();
    console.log('✓ Checkbox checked');

    // Click Next button
    const nextButton = page.locator('button:has-text("Next")').first();
    await nextButton.click();
    console.log('✅ Clicked Next button');

    // Wait for navigation away from setup
    await page.waitForTimeout(3000);

    const afterSetupUrl = page.url();
    console.log('URL after setup:', afterSetupUrl);

    // Should be logged in automatically
    expect(afterSetupUrl).not.toContain('/setup');
    expect(afterSetupUrl).not.toContain('/signin');
    console.log('✅ Automatically logged in after setup');

    // Take screenshot of logged in state
    await page.screenshot({ path: 'test-results/after-setup.png' });

    console.log('\n=== PHASE 2: LOGOUT ===\n');

    // Try to close any "Get Started" modal
    const getStartedBtn = page.locator('button:has-text("Get started")').first();
    if (await getStartedBtn.isVisible({ timeout: 1000 })) {
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
      console.log('Clicked Get Started');
    }

    // Close all modals - press escape 3 times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    console.log('Pressed Escape 3 times to close modals');

    // Navigate directly to /signout
    await page.goto(`${N8N_URL}/signout`);
    await page.waitForTimeout(2000);

    const afterLogoutUrl = page.url();
    console.log('URL after logout:', afterLogoutUrl);

    // Should be on signin page
    expect(afterLogoutUrl).toContain('/signin');
    console.log('✅ Successfully logged out');

    console.log('\n=== PHASE 3: LOGIN ===\n');

    // Navigate to /signin explicitly
    await page.goto(`${N8N_URL}/signin`);
    await page.waitForLoadState('networkidle');

    // Now login with the same credentials
    console.log('Logging in with created credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Click Sign In
    await page.click('button:has-text("Sign in")');
    console.log('Clicked Sign In');

    // Wait for login
    await page.waitForTimeout(3000);

    const afterLoginUrl = page.url();
    console.log('URL after login:', afterLoginUrl);

    // Should be logged in
    expect(afterLoginUrl).not.toContain('/signin');
    expect(afterLoginUrl).not.toContain('/setup');

    // Take final screenshot
    await page.screenshot({ path: 'test-results/after-login-success.png' });

    console.log('✅ Successfully logged in with created credentials!');
    console.log('\n=== ALL PHASES COMPLETED SUCCESSFULLY ===\n');
  });
});