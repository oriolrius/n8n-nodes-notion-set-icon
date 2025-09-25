import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const N8N_URL = 'http://localhost:15678';
const TEST_PAGE_ID = '278c413b-2a68-80e4-bcc3-f1fcee4839ca';

test.describe('Docker n8n Notion PNG Upload - Simple UI Test', () => {
  test.beforeAll(async () => {
    console.log('🐳 Checking Docker containers...');

    // Check if container is already running
    try {
      execSync('docker exec n8n-notion-test echo "Container is running"', { stdio: 'ignore' });
      console.log('✅ Container already running');
    } catch (e) {
      console.log('Starting Docker containers...');
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
    }

    // Ensure test-results directory exists
    const testResultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
  });

  test('Create and Execute Notion PNG Upload Workflow', async ({ page }) => {
    test.setTimeout(90000);

    console.log('\n=== ACCESSING N8N ===\n');

    // Navigate to n8n
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Handle signin (account should exist from previous tests)
    if (page.url().includes('/signin')) {
      console.log('🔑 Signing in...');
      await page.locator('input[type="email"]').fill('test@n8n-notion.local');
      await page.locator('input[type="password"]').fill('TestPassword123!');
      await page.locator('button >> text="Sign in"').click();
      await page.waitForTimeout(3000);
      console.log('✅ Signed in');
    }

    // Skip any modal
    try {
      const skipButton = page.locator('button:has-text("Skip"), button:has-text("Get started")').first();
      if (await skipButton.isVisible({ timeout: 2000 })) {
        await skipButton.click();
      }
    } catch (e) {
      // Modal might not be present
    }

    console.log('\n=== CREATING WORKFLOW ===\n');

    // Go directly to new workflow
    await page.goto(`${N8N_URL}/workflow/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Add Manual Trigger
    console.log('📌 Adding Manual Trigger...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('manual trigger');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Add HTTP Request node
    console.log('📌 Adding HTTP Request node...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('http request');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Configure HTTP Request
    console.log('⚙️ Configuring HTTP Request...');
    const httpNode = page.locator('[data-node-name*="HTTP Request"], [data-name*="HTTP Request"]').first();
    await httpNode.dblclick();
    await page.waitForTimeout(1000);

    // Set URL - use a simple test image from GitHub
    const urlInput = page.locator('input[placeholder*="http"], input[placeholder*="URL"]').first();
    await urlInput.clear();
    await urlInput.fill('https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png');

    await page.screenshot({
      path: path.join(__dirname, 'test-results', 'simple-http-config.png')
    });

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Add Notion Set Icon node
    console.log('📌 Adding Notion Set Icon node...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('notion set icon');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Configure Notion node
    console.log('⚙️ Configuring Notion Set Icon...');
    const notionNode = page.locator('[data-node-name*="Notion Set Icon"], [data-name*="Notion Set Icon"]').first();
    await notionNode.dblclick();
    await page.waitForTimeout(1000);

    // Set Page ID
    const pageIdInput = page.locator('input[name="pageId"], input#pageId').first();
    await pageIdInput.clear();
    await pageIdInput.fill(TEST_PAGE_ID);

    await page.screenshot({
      path: path.join(__dirname, 'test-results', 'simple-notion-config.png')
    });

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Take screenshot of complete workflow
    await page.screenshot({
      path: path.join(__dirname, 'test-results', 'simple-complete-workflow.png'),
      fullPage: true
    });

    // Save workflow
    console.log('💾 Saving workflow...');
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(1000);

    // Name the workflow if prompted
    const nameInput = page.locator('input[placeholder*="workflow name"], input[placeholder*="My workflow"]').first();
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.clear();
      await nameInput.fill('Simple Notion Test');
      await page.keyboard.press('Enter');
    }

    console.log('\n=== EXECUTING WORKFLOW ===\n');

    // Execute workflow
    console.log('🚀 Executing workflow...');
    const executeButton = page.locator('button:has-text("Execute workflow"), button:has-text("Test workflow")').first();
    if (await executeButton.isVisible()) {
      await executeButton.click();
      console.log('⏳ Waiting for execution...');
      await page.waitForTimeout(8000);

      // Take execution screenshot
      await page.screenshot({
        path: path.join(__dirname, 'test-results', 'simple-execution-result.png'),
        fullPage: true
      });

      // Check HTTP node output
      const httpNodeAfter = page.locator('[data-node-name*="HTTP Request"], [data-name*="HTTP Request"]').first();
      await httpNodeAfter.click();
      await page.waitForTimeout(1000);

      // Check if HTTP request succeeded
      const httpSuccess = await page.locator('text=/Binary data/i').isVisible({ timeout: 2000 }).catch(() => false);
      if (httpSuccess) {
        console.log('✅ HTTP Request successfully downloaded image');
      } else {
        console.log('❌ HTTP Request might have failed');
      }

      // Check Notion node
      const notionNodeAfter = page.locator('[data-node-name*="Notion Set Icon"], [data-name*="Notion Set Icon"]').first();
      await notionNodeAfter.click();
      await page.waitForTimeout(1000);

      // Look for any output or error
      const outputPanel = page.locator('[data-test-id*="output"], [class*="output"]').first();
      if (await outputPanel.isVisible({ timeout: 2000 })) {
        const outputText = await outputPanel.textContent();
        console.log('Notion node output:', outputText?.substring(0, 200));

        if (outputText?.includes('success')) {
          console.log('✅ Workflow executed successfully!');
        } else if (outputText?.includes('error')) {
          console.log('❌ Execution had errors');
        }
      }
    } else {
      console.log('❌ Execute button not found');
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });

  test('Check Execution History', async ({ page }) => {
    console.log('\n=== CHECKING EXECUTION HISTORY ===\n');

    // Sign in again if needed
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded' });

    if (page.url().includes('/signin')) {
      await page.locator('input[type="email"]').fill('test@n8n-notion.local');
      await page.locator('input[type="password"]').fill('TestPassword123!');
      await page.locator('button >> text="Sign in"').click();
      await page.waitForTimeout(2000);
    }

    // Go to executions
    await page.goto(`${N8N_URL}/home/executions`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: path.join(__dirname, 'test-results', 'simple-execution-history.png')
    });

    const executions = await page.locator('[data-test-id*="execution"], tr').count();
    console.log(`Found ${executions} executions in history`);
  });

  test.afterAll(async () => {
    console.log('\n=== SUMMARY ===\n');
    console.log('Docker containers remain running for manual inspection');
    console.log('Access n8n at: http://localhost:15678');
    console.log('Login: test@n8n-notion.local / TestPassword123!');
    console.log('\nTo stop containers: docker compose down');
  });
});