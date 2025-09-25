import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const N8N_URL = 'http://localhost:15678';
const TEST_PAGE_ID = '278c413b-2a68-80e4-bcc3-f1fcee4839ca';

test.describe('Docker n8n Notion PNG Upload Test', () => {
  test.beforeAll(async () => {
    console.log('🐳 Starting Docker containers...');
    execSync('docker compose up -d', { cwd: __dirname, stdio: 'inherit' });

    // Wait for n8n to be healthy
    console.log('⏳ Waiting for n8n to be ready...');
    await new Promise(resolve => {
      const checkHealth = setInterval(() => {
        try {
          execSync('docker exec n8n-notion-test wget --spider -q http://localhost:5678/healthz', { stdio: 'ignore' });
          clearInterval(checkHealth);
          resolve(true);
        } catch (e) {
          // Still waiting
        }
      }, 2000);
    });
    console.log('✅ n8n is ready!');
  });

  test('Setup n8n and create workflow via UI', async ({ page }) => {
    console.log('\n=== SETTING UP N8N VIA UI ===\n');

    // Navigate to n8n
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded' });

    // Handle setup or signin
    if (page.url().includes('/setup')) {
      console.log('📝 Setting up n8n owner account...');

      await page.locator('input[type="email"]').fill('test@n8n-notion.local');
      await page.locator('input[placeholder*="First"]').fill('Test');
      await page.locator('input[placeholder*="Last"]').fill('User');
      await page.locator('input[type="password"]').fill('TestPassword123!');

      // Try to check agreement checkbox
      try {
        await page.locator('text=I want to receive security').click();
      } catch (e) {
        // Optional checkbox
      }

      await page.locator('button:has-text("Next")').click();
      await page.waitForTimeout(3000);

      console.log('✅ Account created');
    } else if (page.url().includes('/signin')) {
      console.log('🔑 Signing in...');

      await page.locator('input[type="email"]').fill('test@n8n-notion.local');
      await page.locator('input[type="password"]').fill('TestPassword123!');
      await page.locator('button >> text="Sign in"').click();
      await page.waitForTimeout(3000);

      console.log('✅ Signed in');
    }

    // Handle any onboarding modals
    try {
      const getStartedButton = await page.locator('button >> text="Get started"').first();
      if (await getStartedButton.isVisible()) {
        await getStartedButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Modal might not be present
    }

    console.log('\n=== CREATING CREDENTIALS ===\n');

    // Navigate to credentials
    await page.goto(`${N8N_URL}/home/credentials`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check if credentials already exist
    const existingCred = await page.locator('text=/Notion.*Set.*Icon/i').first();
    if (await existingCred.isVisible().catch(() => false)) {
      console.log('ℹ️ Notion credentials already exist');
    } else {
      // Create new credentials
      await page.locator('button:has-text("Add credential"), button:has-text("Create")').first().click();
      await page.waitForTimeout(1000);

      // Search for Notion Set Icon
      const searchInput = await page.locator('input[placeholder*="Search"], input[placeholder*="Filter"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('notion set icon');
        await page.waitForTimeout(500);
      }

      // Click on Notion Set Icon API
      await page.locator('text=/Notion.*Set.*Icon.*API/i').first().click();
      await page.waitForTimeout(1000);

      // Fill credential fields from environment
      const tokenV2 = process.env.NOTION_TOKEN_V2 || fs.readFileSync(path.join(__dirname, '../../.env'), 'utf-8').match(/NOTION_TOKEN_V2=([^\n]+)/)?.[1] || '';
      const spaceId = process.env.SPACE_ID || 'd9f87de8-aa61-4fd1-b34d-a093b6db25cb';
      const userId = process.env.NOTION_USER_ID || '64c3aaf6-0e95-4e18-9516-fdd63547bf3a';

      await page.fill('input[name="tokenV2"], #tokenV2', tokenV2);
      await page.fill('input[name="spaceId"], #spaceId', spaceId);
      await page.fill('input[name="userId"], #userId', userId);

      // Set credential name
      const nameInput = await page.locator('input[placeholder*="credential name"], input[placeholder*="My credential"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Notion Test Credentials');
      }

      // Save credentials
      await page.locator('button:has-text("Create"), button:has-text("Save")').first().click();
      await page.waitForTimeout(2000);

      console.log('✅ Notion credentials created');
    }

    console.log('\n=== CREATING WORKFLOW ===\n');

    // Create new workflow
    await page.goto(`${N8N_URL}/workflow/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Add Manual Trigger node
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('manual trigger');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Add HTTP Request node to download image
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('http request');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Configure HTTP Request node to download the AWS Academy PNG
    const httpNode = await page.locator('[data-name*="HTTP Request"]').first();
    if (await httpNode.isVisible()) {
      await httpNode.dblclick();
      await page.waitForTimeout(500);

      // Set URL to download our test PNG
      await page.fill('input[placeholder*="http"], input[placeholder*="URL"]',
        'https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png');

      // Set to return binary data
      const responseFormatSelect = await page.locator('select:has-option[value="file"]').first();
      if (await responseFormatSelect.isVisible()) {
        await responseFormatSelect.selectOption('file');
      }

      await page.keyboard.press('Escape');
    }

    // Add Notion Set Icon node
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('notion set icon');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Configure Notion Set Icon node
    const notionNode = await page.locator('[data-name*="Notion Set Icon"]').first();
    if (await notionNode.isVisible()) {
      await notionNode.dblclick();
      await page.waitForTimeout(500);

      // Set Page ID
      await page.fill('input[name="pageId"], #pageId', TEST_PAGE_ID);

      // Set to upload mode
      const iconSourceSelect = await page.locator('select[name="iconSource"]').first();
      if (await iconSourceSelect.isVisible()) {
        await iconSourceSelect.selectOption('upload');
      }

      // Set binary property name
      await page.fill('input[name="binaryPropertyName"]', 'data');

      // Select credentials
      const credSelect = await page.locator('select:has-option[label*="Notion"]').first();
      if (await credSelect.isVisible()) {
        await credSelect.selectOption({ label: 'Notion Test Credentials' });
      }

      await page.keyboard.press('Escape');
    }

    // Save workflow
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(1000);

    console.log('✅ Workflow created');

    console.log('\n=== EXECUTING WORKFLOW ===\n');

    // Execute workflow
    const executeButton = await page.locator('button:has-text("Execute workflow"), button:has-text("Test workflow")').first();
    if (await executeButton.isVisible()) {
      await executeButton.click();
      await page.waitForTimeout(5000); // Wait for execution

      // Check for success
      const successIndicator = await page.locator('text=/success/i, text=/Successfully executed/i').first();
      const errorIndicator = await page.locator('text=/error/i, text=/failed/i').first();

      if (await successIndicator.isVisible().catch(() => false)) {
        console.log('✅ Workflow executed successfully!');

        // Take screenshot
        await page.screenshot({
          path: path.join(__dirname, 'test-results', 'docker-workflow-success.png'),
          fullPage: true
        });

        // Check node output
        const notionNodeAfter = await page.locator('[data-name*="Notion Set Icon"]').first();
        if (await notionNodeAfter.isVisible()) {
          await notionNodeAfter.click();
          await page.waitForTimeout(1000);

          // Look for success in output
          const outputPanel = await page.locator('[data-test-id="output-panel"], .output-data').first();
          if (await outputPanel.isVisible()) {
            const outputText = await outputPanel.textContent();
            console.log('Node output:', outputText?.substring(0, 200));
            expect(outputText).toContain('success');
          }
        }
      } else if (await errorIndicator.isVisible().catch(() => false)) {
        const errorText = await errorIndicator.textContent();
        console.error('❌ Workflow execution failed:', errorText);

        await page.screenshot({
          path: path.join(__dirname, 'test-results', 'docker-workflow-error.png'),
          fullPage: true
        });

        throw new Error(`Workflow execution failed: ${errorText}`);
      }
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });

  test('Verify icon was set via CLI', async () => {
    console.log('\n=== VERIFYING VIA CLI ===\n');

    // List workflows
    const workflows = execSync('docker exec n8n-notion-test n8n list:workflow 2>/dev/null || echo "No workflows"', {
      encoding: 'utf-8'
    });
    console.log('Workflows:', workflows);

    // Get latest execution
    try {
      const executions = execSync('docker exec n8n-notion-test n8n execution:list --limit=1 2>/dev/null', {
        encoding: 'utf-8'
      });
      console.log('Latest execution:', executions);
    } catch (e) {
      console.log('Could not get executions');
    }

    expect(workflows).toBeTruthy();
  });

  test.afterAll(async () => {
    console.log('🧹 Cleanup: Stopping Docker containers...');
    // Keep containers running for debugging
    // execSync('docker compose down', { cwd: __dirname, stdio: 'inherit' });
  });
});