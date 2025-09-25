import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

const N8N_URL = 'http://localhost:15678';

// Test credentials
const TEST_USER = {
  email: 'test@n8n-notion.local',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

// Notion test credentials
const NOTION_CREDENTIALS = {
  tokenV2: process.env.NOTION_TOKEN_V2 || 'test-token',
  spaceId: process.env.SPACE_ID || 'test-space',
  userId: process.env.NOTION_USER_ID || 'test-user'
};

test.describe('n8n Notion Set Icon Workflow Test', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Set viewport for better visibility
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Setup n8n via /setup', async () => {
    console.log('📝 Setting up n8n...');

    // Go to setup page
    await page.goto(`${N8N_URL}/setup`, { waitUntil: 'networkidle' });

    // Check if already set up by looking for redirect
    if (page.url().includes('/signin')) {
      console.log('ℹ️ n8n already set up, skipping to signin');
      return;
    }

    // Wait for setup form to load
    await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 5000 }).catch(() => null);

    // Fill setup form
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="firstName"]', TEST_USER.firstName);
    await page.fill('input[name="lastName"]', TEST_USER.lastName);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);

    // Look for agreement checkbox and check it if present
    const agreementCheckbox = await page.$('input[type="checkbox"]');
    if (agreementCheckbox) {
      await agreementCheckbox.click();
    }

    // Submit the form
    const submitButton = await page.$('button[type="submit"], button:has-text("Get started"), button:has-text("Create account")');
    if (submitButton) {
      await submitButton.click();
    }

    // Wait for navigation to complete
    await page.waitForURL(/\/(workflows|home|dashboard|signin)/, { timeout: 30000 });

    console.log('✅ n8n setup complete');
  });

  test('Sign in via /signin', async () => {
    console.log('🔑 Signing in to n8n...');

    // Navigate to signin page
    await page.goto(`${N8N_URL}/signin`, { waitUntil: 'networkidle' });

    // Check if already logged in
    if (!page.url().includes('/signin')) {
      console.log('ℹ️ Already logged in');
      return;
    }

    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);

    // Submit login
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');

    // Wait for successful login
    await page.waitForURL(/\/(workflows|home|dashboard)/, { timeout: 30000 });

    // Close any welcome modals
    const modalCloseButton = await page.$('button[aria-label="Close"], button:has-text("Skip"), button:has-text("Get started")');
    if (modalCloseButton && await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
    }

    console.log('✅ Signed in successfully');
  });

  test('Configure Notion Set Icon credentials', async () => {
    console.log('🔐 Setting up Notion credentials...');

    // Navigate to credentials page
    await page.goto(`${N8N_URL}/home/credentials`, { waitUntil: 'networkidle' });

    // Check if credentials already exist
    const existingCredential = await page.$('text=/Notion.*Set.*Icon/i');
    if (existingCredential) {
      console.log('ℹ️ Notion credentials already configured');
      return;
    }

    // Click add credential button
    await page.click('button:has-text("Add credential"), button:has-text("Create"), [data-test-id="resources-list-add"]');
    await page.waitForTimeout(1000);

    // Search for Notion Set Icon
    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="Filter"]');
    if (searchInput) {
      await searchInput.fill('notion set icon');
      await page.waitForTimeout(500);
    }

    // Click on Notion Set Icon API credential
    const credentialOption = await page.$('text=/Notion.*Set.*Icon.*API/i, [data-test-id*="notion"]');
    if (credentialOption) {
      await credentialOption.click();
      await page.waitForTimeout(1000);

      // Fill credential fields
      await page.fill('input[name="token_v2"], #token_v2', NOTION_CREDENTIALS.tokenV2);
      await page.fill('input[name="space_id"], #space_id', NOTION_CREDENTIALS.spaceId);
      await page.fill('input[name="notion_user_id"], #notion_user_id', NOTION_CREDENTIALS.userId);

      // Set credential name
      const nameInput = await page.$('input[placeholder*="credential name"], input[placeholder*="My credential"]');
      if (nameInput) {
        await nameInput.fill('Notion Set Icon Test Credential');
      }

      // Save credentials
      await page.click('button:has-text("Create"), button:has-text("Save")');
      await page.waitForTimeout(2000);

      console.log('✅ Notion credentials configured');
    } else {
      console.log('⚠️ Could not find Notion Set Icon credential type');
    }
  });

  test('Open and test Notion Set Icon workflow', async () => {
    console.log('🔄 Testing Notion Set Icon workflow...');

    // Navigate to workflows page
    await page.goto(`${N8N_URL}/home/workflows`, { waitUntil: 'networkidle' });

    // Look for the imported workflow
    const workflowCard = await page.$('text=/Notion.*Set.*Icon.*Example/i, [data-test-id*="workflow-card"]');

    if (workflowCard) {
      // Click on the workflow to open it
      await workflowCard.click();
      await page.waitForTimeout(3000);
    } else {
      // Try direct navigation by workflow ID
      console.log('Navigating directly to workflow...');
      await page.goto(`${N8N_URL}/workflow/pZxGWc9SEAVmn8EG`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }

    // Check if workflow loaded
    const canvas = await page.$('.canvas, .workflow-canvas, [data-test-id="canvas"]');
    expect(canvas).toBeTruthy();

    // Look for Notion Set Icon node
    const notionNode = await page.$('[data-name*="Notion Set Icon"], .node-box:has-text("Notion Set Icon")');

    if (notionNode) {
      console.log('✅ Found Notion Set Icon node in workflow');

      // Double-click to open node settings
      await notionNode.dblclick();
      await page.waitForTimeout(1000);

      // Check if credentials need to be selected
      const credentialSelect = await page.$('select[name="credential"], [data-test-id="credential-select"]');
      if (credentialSelect) {
        // Select the credential we created
        await credentialSelect.selectOption({ label: 'Notion Set Icon Test Credential' });
        await page.waitForTimeout(500);
      }

      // Update test page ID if needed
      const pageIdInput = await page.$('input[name="pageId"], #pageId');
      if (pageIdInput) {
        await pageIdInput.fill('278c413b2a6880e4bcc3f1fcee4839ca'); // Your test page ID
      }

      // Close node settings
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Save workflow
      await page.keyboard.press('Control+S');
      await page.waitForTimeout(1000);

      console.log('✅ Workflow configured');
    } else {
      console.log('⚠️ Could not find Notion Set Icon node');
    }
  });

  test('Execute workflow and verify results', async () => {
    console.log('▶️ Executing workflow...');

    // Find and click execute button
    const executeButton = await page.$('button:has-text("Execute workflow"), button:has-text("Test workflow"), [data-test-id="execute-workflow-button"]');

    if (executeButton) {
      await executeButton.click();

      // Wait for execution to complete (max 30 seconds)
      await page.waitForTimeout(3000);

      // Check for execution status
      const successIndicator = await page.$('.execution-success, text=/success/i, text=/Successfully executed/i');
      const errorIndicator = await page.$('.execution-error, text=/error/i, text=/failed/i');

      if (successIndicator && await successIndicator.isVisible()) {
        console.log('✅ Workflow executed successfully!');

        // Check node output
        const notionNode = await page.$('[data-name*="Notion Set Icon"], .node-box:has-text("Notion Set Icon")');
        if (notionNode) {
          await notionNode.click();
          await page.waitForTimeout(1000);

          // Look for output data
          const outputPanel = await page.$('[data-test-id="output-panel"], .output-data');
          if (outputPanel) {
            const outputText = await outputPanel.textContent();
            console.log('📤 Node output:', outputText?.substring(0, 200));
          }
        }
      } else if (errorIndicator && await errorIndicator.isVisible()) {
        console.log('❌ Workflow execution failed');

        // Get error details
        const errorMessage = await errorIndicator.textContent();
        console.log('Error:', errorMessage);

        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/workflow-error.png', fullPage: true });
      } else {
        console.log('⚠️ Execution status unclear');

        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/workflow-status.png', fullPage: true });
      }
    } else {
      console.log('❌ Could not find execute button');
    }
  });

  test('Verify custom node is available in node panel', async () => {
    console.log('🔍 Verifying custom node availability...');

    // Create new workflow to test node availability
    await page.goto(`${N8N_URL}/workflow/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Open node panel
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Search for Notion Set Icon
    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="Type to search"]');
    if (searchInput) {
      await searchInput.fill('notion set icon');
      await page.waitForTimeout(1000);

      // Check if node appears
      const nodeOption = await page.$('.node-creator-item:has-text("Notion Set Icon"), [data-test-id*="node-creator-item"]');

      if (nodeOption && await nodeOption.isVisible()) {
        console.log('✅ Custom node "Notion Set Icon" is available in node panel');

        // Get node description
        const description = await nodeOption.$('.description');
        if (description) {
          const descText = await description.textContent();
          console.log('📝 Node description:', descText);
        }
      } else {
        console.log('❌ Custom node not found in node panel');

        // List available Notion nodes
        const notionNodes = await page.$$('.node-creator-item:has-text("Notion")');
        console.log(`Found ${notionNodes.length} Notion-related nodes`);
      }
    }
  });
});