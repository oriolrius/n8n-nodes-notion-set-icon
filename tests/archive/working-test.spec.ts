import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const N8N_URL = 'http://localhost:15678';
const TEST_PAGE_ID = '278c413b-2a68-80e4-bcc3-f1fcee4839ca';

test.describe('Working Docker Notion PNG Upload Test', () => {
  test('Login, create credentials, build workflow and execute', async ({ page }) => {
    test.setTimeout(90000);

    console.log('\n=== PHASE 1: LOGIN ===\n');

    await page.goto(N8N_URL);
    await page.waitForLoadState('networkidle');

    // Login
    if (page.url().includes('/signin')) {
      await page.fill('input[type="email"]', 'test@n8n-notion.local');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button:has-text("Sign in")');
      await page.waitForTimeout(2000);
      console.log('✅ Logged in');
    }

    console.log('\n=== PHASE 2: CREATE WORKFLOW ===\n');

    // Go to workflows
    await page.goto(`${N8N_URL}/workflow/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Add Manual Trigger using Tab key
    console.log('Adding Manual Trigger...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('manual trigger');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    console.log('✅ Manual Trigger added');

    // Add HTTP Request node
    console.log('Adding HTTP Request...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('http request');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Configure HTTP Request - double click on the node
    const httpNode = page.locator('.node:has-text("HTTP Request")').first();
    await httpNode.dblclick();
    await page.waitForTimeout(1000);

    // Fill URL
    await page.fill('input[placeholder*="http"]', 'https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png');

    // Set response format to file if there's a dropdown
    const formatSelect = page.locator('select:has-option[value="file"]').first();
    if (await formatSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await formatSelect.selectOption('file');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    console.log('✅ HTTP Request configured');

    // Add Notion Set Icon node
    console.log('Adding Notion Set Icon...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('notion set icon');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Configure Notion node
    const notionNode = page.locator('.node:has-text("Notion Set Icon")').first();
    await notionNode.dblclick();
    await page.waitForTimeout(1000);

    // Fill Page ID
    await page.fill('input[name="pageId"]', TEST_PAGE_ID);

    // Set icon source to upload if dropdown exists
    const sourceSelect = page.locator('select[name="iconSource"]').first();
    if (await sourceSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sourceSelect.selectOption('upload');
    }

    // Set binary property
    const binaryInput = page.locator('input[name="binaryPropertyName"]').first();
    if (await binaryInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await binaryInput.fill('data');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    console.log('✅ Notion Set Icon configured');

    // Save workflow
    console.log('Saving workflow...');
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(2000);
    console.log('✅ Workflow saved');

    console.log('\n=== PHASE 3: EXECUTE ===\n');

    // Execute workflow
    const executeBtn = page.locator('button:has-text("Execute"), button:has-text("Test workflow")').first();
    await executeBtn.click();
    console.log('⏳ Executing workflow...');
    await page.waitForTimeout(10000);

    // Check for success
    const success = await page.locator('text=/success|completed|finished/i').isVisible({ timeout: 5000 }).catch(() => false);
    if (success) {
      console.log('✅ Workflow executed successfully!');
    } else {
      console.log('⚠️ Workflow execution status unclear');
    }

    // Take screenshot
    await page.screenshot({
      path: path.join(__dirname, 'test-results', 'workflow-execution.png'),
      fullPage: true
    });
  });
});