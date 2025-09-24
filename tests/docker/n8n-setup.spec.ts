import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const N8N_URL = process.env.N8N_URL || 'http://localhost:15678';
const WORKFLOWS_DIR = path.join(__dirname, '../../examples');

// Test user credentials
const TEST_USER = {
  email: 'test@n8n-notion.local',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

// Notion credentials from environment
const NOTION_CREDENTIALS = {
  tokenV2: process.env.NOTION_TOKEN_V2 || '',
  spaceId: process.env.SPACE_ID || '',
  userId: process.env.NOTION_USER_ID || ''
};

test.describe('n8n Custom Node Setup and Testing', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Setup n8n instance with user', async () => {
    console.log('🚀 Setting up n8n instance...');

    await page.goto(N8N_URL, { waitUntil: 'networkidle' });

    // Check if setup is needed
    const isSetupNeeded = await page.locator('text=/welcome|create.*account/i').isVisible().catch(() => false);

    if (isSetupNeeded) {
      console.log('📝 Creating initial user...');

      // Fill in signup form
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="firstName"]', TEST_USER.firstName);
      await page.fill('input[name="lastName"]', TEST_USER.lastName);
      await page.fill('input[name="password"]', TEST_USER.password);

      // Submit signup
      await page.click('button[type="submit"]');

      // Wait for dashboard or workflow page
      await page.waitForURL(/\/(workflows|home|dashboard)/, { timeout: 30000 });

      console.log('✅ User created successfully');
    } else {
      console.log('ℹ️ n8n already set up, attempting login...');

      // Try to login
      const loginButton = await page.locator('text=/sign.*in|log.*in/i');
      if (await loginButton.isVisible()) {
        await page.fill('input[name="email"]', TEST_USER.email);
        await page.fill('input[name="password"]', TEST_USER.password);
        await loginButton.click();
        await page.waitForURL(/\/(workflows|home|dashboard)/, { timeout: 30000 });
      }
    }

    // Skip any onboarding modals
    const skipButton = await page.locator('button:has-text("Skip")');
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click();
    }

    expect(page.url()).toContain(N8N_URL);
    console.log('✅ n8n setup complete');
  });

  test('Verify custom node is available', async () => {
    console.log('🔍 Checking custom node availability...');

    // Navigate to workflows page
    await page.goto(`${N8N_URL}/workflows`, { waitUntil: 'networkidle' });

    // Create new workflow
    await page.click('button:has-text("New Workflow"), button:has-text("Add Workflow")');
    await page.waitForTimeout(2000);

    // Open node panel
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Search for our custom node
    await page.fill('input[placeholder*="Search"], input[placeholder*="Type"]', 'notion set icon');
    await page.waitForTimeout(1000);

    // Check if node appears in search results
    const customNode = await page.locator('.node-item, .node-creator-item').filter({ hasText: /notion.*set.*icon/i });
    const nodeExists = await customNode.isVisible().catch(() => false);

    if (nodeExists) {
      console.log('✅ Custom node "Notion Set Icon" found');

      // Get node details
      const nodeText = await customNode.textContent();
      console.log(`   Node details: ${nodeText}`);
    } else {
      console.log('⚠️ Custom node not found in UI');

      // List available Notion nodes for debugging
      const notionNodes = await page.locator('.node-item, .node-creator-item').filter({ hasText: /notion/i }).all();
      console.log(`   Found ${notionNodes.length} Notion-related nodes`);
      for (const node of notionNodes) {
        const text = await node.textContent();
        console.log(`   - ${text}`);
      }
    }

    expect(nodeExists).toBeTruthy();
  });

  test('Configure Notion credentials', async () => {
    console.log('🔐 Setting up Notion credentials...');

    // Navigate to credentials page
    await page.goto(`${N8N_URL}/credentials`, { waitUntil: 'networkidle' });

    // Click on add credential button
    await page.click('button:has-text("Add Credential"), button:has-text("Create New")');
    await page.waitForTimeout(1000);

    // Search for Notion Set Icon API
    await page.fill('input[placeholder*="Search"], input[placeholder*="Filter"]', 'notion set icon');
    await page.waitForTimeout(1000);

    const credentialType = await page.locator('text=/notion.*set.*icon.*api/i');
    if (await credentialType.isVisible()) {
      await credentialType.click();

      // Fill in credential fields
      await page.fill('input[name="token_v2"]', NOTION_CREDENTIALS.tokenV2);
      await page.fill('input[name="space_id"]', NOTION_CREDENTIALS.spaceId);
      await page.fill('input[name="notion_user_id"]', NOTION_CREDENTIALS.userId);

      // Set credential name
      await page.fill('input[placeholder*="name"], input[name="name"]', 'Notion Set Icon Test');

      // Save credentials
      await page.click('button:has-text("Create"), button:has-text("Save")');
      await page.waitForTimeout(2000);

      console.log('✅ Notion credentials configured');
    } else {
      console.log('⚠️ Notion Set Icon credential type not found');
    }
  });

  test('Import and test example workflow', async () => {
    console.log('📥 Importing example workflow...');

    // Read example workflow
    const workflowPath = path.join(WORKFLOWS_DIR, 'workflow-example.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // Navigate to workflows page
    await page.goto(`${N8N_URL}/workflows`, { waitUntil: 'networkidle' });

    // Import workflow via menu
    await page.click('button[aria-label*="menu"], button:has-text("☰")');
    await page.click('text=/import.*from.*file|import.*workflow/i');

    // Upload workflow file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(workflowPath);

    await page.waitForTimeout(2000);

    // Check if workflow loaded
    const workflowName = await page.locator('.workflow-name, input[placeholder*="workflow name"]').textContent();
    console.log(`   Imported workflow: ${workflowName || 'Unknown'}`);

    // Look for our custom node in the workflow
    const notionNode = await page.locator('.node-box, .node').filter({ hasText: /notion.*set.*icon/i });
    const nodeFound = await notionNode.isVisible().catch(() => false);

    if (nodeFound) {
      console.log('✅ Custom node found in workflow');

      // Try to execute the workflow
      await page.click('button:has-text("Execute Workflow"), button:has-text("Run")');
      await page.waitForTimeout(3000);

      // Check execution result
      const successIndicator = await page.locator('.success, text=/success|completed/i');
      const hasSuccess = await successIndicator.isVisible().catch(() => false);

      if (hasSuccess) {
        console.log('✅ Workflow executed successfully');
      } else {
        console.log('⚠️ Workflow execution did not complete as expected');
      }
    } else {
      console.log('⚠️ Custom node not found in imported workflow');
    }

    expect(nodeFound).toBeTruthy();
  });

  test('Verify node properties and operations', async () => {
    console.log('🔧 Testing node configuration...');

    // Double-click on the Notion Set Icon node to open properties
    const notionNode = await page.locator('.node-box, .node').filter({ hasText: /notion.*set.*icon/i });

    if (await notionNode.isVisible()) {
      await notionNode.dblclick();
      await page.waitForTimeout(1000);

      // Check for resource dropdown
      const resourceField = await page.locator('select[name="resource"], input[name="resource"]');
      if (await resourceField.isVisible()) {
        const resourceValue = await resourceField.inputValue();
        console.log(`   Resource: ${resourceValue}`);
      }

      // Check for operation dropdown
      const operationField = await page.locator('select[name="operation"], input[name="operation"]');
      if (await operationField.isVisible()) {
        const operationValue = await operationField.inputValue();
        console.log(`   Operation: ${operationValue}`);
      }

      // Check available parameters
      const parameters = await page.locator('.parameter-item label, .param-label').allTextContents();
      console.log('   Available parameters:');
      parameters.forEach(param => {
        if (param.trim()) {
          console.log(`   - ${param.trim()}`);
        }
      });

      // Close node properties
      await page.keyboard.press('Escape');

      console.log('✅ Node properties verified');
    }
  });

  test('Create workflow with custom node from scratch', async () => {
    console.log('🔨 Creating new workflow with custom node...');

    // Create new workflow
    await page.goto(`${N8N_URL}/workflow/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Add trigger node (Manual Trigger)
    await page.keyboard.press('Tab');
    await page.fill('input[placeholder*="Search"], input[placeholder*="Type"]', 'manual trigger');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Add our custom node
    await page.keyboard.press('Tab');
    await page.fill('input[placeholder*="Search"], input[placeholder*="Type"]', 'notion set icon');
    await page.waitForTimeout(500);

    const customNodeOption = await page.locator('.node-item, .node-creator-item').filter({ hasText: /notion.*set.*icon/i });
    if (await customNodeOption.isVisible()) {
      await customNodeOption.click();
      await page.waitForTimeout(1000);

      // Configure the node
      await page.fill('input[name="pageId"]', 'test-page-id');
      await page.selectOption('select[name="iconSource"]', 'url');
      await page.fill('input[name="iconUrl"]', 'https://www.notion.so/icons/star_yellow.svg');

      // Save node configuration
      await page.keyboard.press('Escape');

      // Save workflow
      await page.fill('.workflow-name input, input[placeholder*="workflow name"]', 'Test Notion Icon Workflow');
      await page.keyboard.press('Enter');

      console.log('✅ Workflow created with custom node');

      // Try to execute
      await page.click('button:has-text("Execute Workflow"), button:has-text("Run")');
      await page.waitForTimeout(3000);

      const executionStatus = await page.locator('.execution-status, .status').textContent();
      console.log(`   Execution status: ${executionStatus || 'Unknown'}`);
    } else {
      console.log('❌ Could not add custom node to workflow');
    }
  });
});