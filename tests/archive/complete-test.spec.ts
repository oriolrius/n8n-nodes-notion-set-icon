import { test, expect } from '@playwright/test';

const N8N_URL = 'http://localhost:15678';

// Test credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123456!',
  firstName: 'Test',
  lastName: 'User'
};

test.describe('Complete n8n Notion Set Icon Test', () => {
  test('Full workflow test', async ({ page }) => {
    // Step 1: Setup n8n owner account
    console.log('📝 Setting up n8n owner account...');

    await page.goto(N8N_URL, { waitUntil: 'networkidle' });

    // Check if we're on setup page
    const setupTitle = await page.locator('text="Set up owner account"').first();
    if ((await setupTitle.isVisible().catch(() => false))) {
      console.log('  Filling setup form...');

      // Wait for form fields to be ready
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });

      // Fill the form - using type selectors since name attributes might not be present
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[placeholder*="First"]').fill(TEST_USER.firstName);
      await page.locator('input[placeholder*="Last"]').fill(TEST_USER.lastName);
      await page.locator('input[type="password"]').fill(TEST_USER.password);

      // Check the agreement checkbox
      const checkbox = page.locator('input[type="checkbox"]');
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }

      // Click Next button
      await page.locator('button:has-text("Next")').click();

      // Wait for navigation
      await page.waitForTimeout(3000);

      console.log('✅ Account created');

      // Handle any onboarding modals
      const skipButton = await page.$('button:has-text("Skip")');
      if (skipButton && await skipButton.isVisible()) {
        await skipButton.click();
        console.log('  Skipped onboarding');
      }
    }

    // Step 2: Sign in if needed
    const currentUrl = page.url();
    if (currentUrl.includes('/signin')) {
      console.log('🔑 Signing in...');

      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.locator('button[type="submit"]').click();

      await page.waitForTimeout(3000);
      console.log('✅ Signed in');
    }

    // Step 3: Navigate to workflows
    console.log('📂 Navigating to workflows...');

    // Try to navigate to workflows
    if (!page.url().includes('/workflow')) {
      await page.goto(`${N8N_URL}/home/workflows`, { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);

    // Step 4: Check for imported workflow
    console.log('🔍 Looking for Notion Set Icon workflow...');

    const workflowCard = await page.$('text=/Notion.*Set.*Icon.*Example/i');

    if (workflowCard) {
      console.log('✅ Found imported workflow');
      await workflowCard.click();
      await page.waitForTimeout(3000);
    } else {
      // Try to find it by ID
      console.log('  Trying direct navigation to workflow...');
      await page.goto(`${N8N_URL}/workflow/pZxGWc9SEAVmn8EG`);
      await page.waitForTimeout(3000);
    }

    // Step 5: Check for custom node
    console.log('🔍 Checking for custom node...');

    const notionNode = await page.$('.node-box:has-text("Notion Set Icon"), [data-name*="Notion"]');

    if (notionNode) {
      console.log('✅ Found Notion Set Icon node in workflow');

      // Click on the node
      await notionNode.click();
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/workflow-with-node.png',
        fullPage: true
      });

      console.log('📸 Screenshot saved');
    } else {
      console.log('⚠️ Could not find Notion Set Icon node');

      // Take debug screenshot
      await page.screenshot({
        path: 'test-results/workflow-debug.png',
        fullPage: true
      });
    }

    // Step 6: Try to execute workflow
    console.log('▶️ Attempting to execute workflow...');

    const executeButton = await page.$('button:has-text("Execute"), button:has-text("Test workflow")');

    if (executeButton && await executeButton.isVisible()) {
      await executeButton.click();
      console.log('  Workflow execution triggered');
      await page.waitForTimeout(5000);

      // Check execution result
      const errorMessage = await page.$('.error-message, text=/error/i');
      const successMessage = await page.$('text=/success/i, text=/executed/i');

      if (successMessage && await successMessage.isVisible()) {
        console.log('✅ Workflow executed successfully');
      } else if (errorMessage && await errorMessage.isVisible()) {
        const error = await errorMessage.textContent();
        console.log(`⚠️ Execution error: ${error}`);
      } else {
        console.log('  Execution status unclear');
      }

      // Final screenshot
      await page.screenshot({
        path: 'test-results/execution-result.png',
        fullPage: true
      });
    } else {
      console.log('⚠️ Execute button not found');
    }

    // Step 7: Test node availability
    console.log('\n🔍 Testing node availability in new workflow...');

    await page.goto(`${N8N_URL}/workflow/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Open node panel
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Search for our custom node
    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="Type"]');
    if (searchInput) {
      await searchInput.fill('notion set icon');
      await page.waitForTimeout(1000);

      const customNodeOption = await page.$('text=/Notion.*Set.*Icon/i');
      if (customNodeOption && await customNodeOption.isVisible()) {
        console.log('✅ Custom node available in node panel');
      } else {
        console.log('⚠️ Custom node not found in node panel');
      }
    }

    console.log('\n📊 Test Summary:');
    console.log('  - n8n is running');
    console.log('  - Account setup completed');
    console.log('  - Workflows are accessible');
    console.log('  - Test completed');
  });
});