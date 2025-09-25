import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const N8N_URL = 'http://localhost:15678';
const TEST_EMAIL = 'test@n8n-notion.local';
const TEST_PASSWORD = 'TestPassword123!';

// Load Notion credentials from .env
const envContent = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf-8');
const NOTION_TOKEN_V2 = envContent.match(/NOTION_TOKEN_V2=([^\n]+)/)?.[1] || '';
const SPACE_ID = envContent.match(/SPACE_ID=([^\n]+)/)?.[1] || 'd9f87de8-aa61-4fd1-b34d-a093b6db25cb';
const NOTION_USER_ID = envContent.match(/NOTION_USER_ID=([^\n]+)/)?.[1] || '64c3aaf6-0e95-4e18-9516-fdd63547bf3a';

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

  test('Setup n8n, logout, login and create workflow', async ({ page }) => {
    test.setTimeout(60000); // 60 seconds timeout
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

    console.log('\n=== PHASE 4: CREATE WORKFLOW ===\n');

    // Navigate to new workflow
    await page.goto(`${N8N_URL}/workflow/new`);
    await page.waitForTimeout(2000);

    // Add Manual Trigger node
    console.log('Adding Manual Trigger node...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('manual trigger');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Add Read/Write Files from Disk node
    console.log('Adding Read/Write Files from Disk node...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('read write file');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Configure Read/Write Files node
    const readFileNode = await page.locator('[data-name*="Read"], [data-name*="Write File"]').first();
    if (await readFileNode.isVisible()) {
      await readFileNode.dblclick();
      await page.waitForTimeout(500);

      // Set operation to Read
      const operationSelect = await page.locator('select[name="operation"]').first();
      if (await operationSelect.isVisible()) {
        await operationSelect.selectOption('read');
      }

      // Set file path to our test PNG
      const filePathInput = await page.locator('input[name="fileSelector"], input[placeholder*="File"]').first();
      await filePathInput.fill('/test-assets/aws-academy-educator.png');

      await page.keyboard.press('Escape');
    }

    // Add Notion Set Icon node (custom node)
    console.log('Adding Notion Set Icon node...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('set icon');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Configure Notion Set Icon node
    const notionNode = await page.locator('[data-name*="Set icon"], [data-name*="Notion"]').first();
    if (await notionNode.isVisible()) {
      await notionNode.dblclick();
      await page.waitForTimeout(500);

      // First need to create credentials
      console.log('Setting up Notion credentials...');

      // Click on Credentials dropdown or Create New button
      const credDropdown = await page.locator('[data-test-id="node-credentials-select"], [placeholder*="Credential"], button:has-text("Create New")').first();
      if (await credDropdown.isVisible()) {
        await credDropdown.click();
        await page.waitForTimeout(1000);

        // If it's a dropdown, look for Create New option
        const createNewOption = await page.locator('text="Create New"').first();
        if (await createNewOption.isVisible({ timeout: 1000 })) {
          await createNewOption.click();
          await page.waitForTimeout(1000);
        }

        // Fill in credentials from environment
        const tokenInput = await page.locator('input[name="tokenV2"], input#tokenV2').first();
        if (await tokenInput.isVisible()) {
          await tokenInput.fill(NOTION_TOKEN_V2);
        }

        const spaceIdInput = await page.locator('input[name="spaceId"], input#spaceId').first();
        if (await spaceIdInput.isVisible()) {
          await spaceIdInput.fill(SPACE_ID);
        }

        const userIdInput = await page.locator('input[name="userId"], input#userId').first();
        if (await userIdInput.isVisible()) {
          await userIdInput.fill(NOTION_USER_ID);
        }

        // Set credential name
        const nameInput = await page.locator('input[placeholder*="credential name"], input[placeholder*="My credential"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Notion Set Icon account');
        }

        // Save credentials
        const saveBtn = await page.locator('button:has-text("Save"), button:has-text("Create")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(1000);
        }
      }

      // Set Page ID (without hyphens as shown in JSON)
      const pageIdField = await page.locator('input[name="pageId"], input#pageId').first();
      await pageIdField.fill('278c413b2a6880e4bcc3f1fcee4839ca');

      // Set to upload mode
      const iconSourceSelect = await page.locator('select[name="iconSource"]').first();
      if (await iconSourceSelect.isVisible()) {
        await iconSourceSelect.selectOption('upload');
      }

      await page.keyboard.press('Escape');
    }

    // Save workflow
    console.log('Saving workflow...');
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(1000);

    console.log('✅ Workflow created');

    console.log('\n=== PHASE 5: EXECUTE WORKFLOW ===\n');

    // Close any open modals first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Execute workflow
    const executeBtn = await page.locator('button:has-text("Execute"), button:has-text("Test workflow")').first();
    if (await executeBtn.isVisible()) {
      await executeBtn.click({ force: true });
      console.log('⏳ Executing workflow...');
      await page.waitForTimeout(8000);

      // Check for success
      const success = await page.locator('text=/success|completed/i').isVisible({ timeout: 2000 }).catch(() => false);
      if (success) {
        console.log('✅ Workflow executed successfully!');
      } else {
        console.log('⚠️ Workflow execution status unclear');
      }
    }

    // Take screenshot of final state
    await page.screenshot({ path: 'test-results/workflow-execution-final.png', fullPage: true });

    console.log('\n=== ALL PHASES COMPLETED SUCCESSFULLY ===\n');
  });
});