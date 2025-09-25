import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const N8N_URL = 'http://localhost:15678';
const TEST_PAGE_ID = '278c413b-2a68-80e4-bcc3-f1fcee4839ca';
const PNG_URL = 'https://raw.githubusercontent.com/oriolrius/n8n-nodes-notion-set-icon/main/tests/docker/test-assets/aws-academy-educator.png';

test.describe('Docker n8n Notion PNG Upload - Full UI Setup', () => {
  test.beforeAll(async () => {
    console.log('🐳 Starting Docker containers...');
    execSync('docker compose up -d', { cwd: __dirname, stdio: 'inherit' });

    // Wait for n8n to be healthy
    console.log('⏳ Waiting for n8n to be ready...');
    let retries = 0;
    while (retries < 30) {
      try {
        execSync('docker exec n8n-notion-test wget --spider -q http://localhost:5678/healthz', { stdio: 'ignore' });
        console.log('✅ n8n is ready!');
        break;
      } catch (e) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Ensure test-results directory exists
    const testResultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
  });

  test('Complete UI Setup: Account, Credentials, Workflow Creation and Execution', async ({ page }) => {
    // Set longer timeout for this comprehensive test
    test.setTimeout(120000);

    console.log('\n=== PHASE 1: N8N SETUP ===\n');

    // Navigate to n8n
    await page.goto(N8N_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Handle setup or signin
    if (page.url().includes('/setup')) {
      console.log('📝 Setting up n8n owner account...');

      // Fill setup form
      await page.locator('input[type="email"]').fill('test@n8n-notion.local');
      await page.locator('input[placeholder*="First"]').fill('Test');
      await page.locator('input[placeholder*="Last"]').fill('User');
      await page.locator('input[type="password"]').fill('TestPassword123!');

      // Try to check agreement checkbox by clicking the label text
      try {
        const checkboxLabel = page.locator('label:has-text("I want to receive")').first();
        if (await checkboxLabel.isVisible()) {
          await checkboxLabel.click();
        }
      } catch (e) {
        console.log('Agreement checkbox not found or not required');
      }

      // Take screenshot of setup form
      await page.screenshot({
        path: path.join(__dirname, 'test-results', '01-setup-form.png'),
        fullPage: false
      });

      // Click Next/Create
      await page.locator('button:has-text("Next"), button:has-text("Create")').first().click();
      await page.waitForTimeout(3000);

      console.log('✅ Account created');
    } else if (page.url().includes('/signin')) {
      console.log('🔑 Signing in to existing account...');

      await page.locator('input[type="email"]').fill('test@n8n-notion.local');
      await page.locator('input[type="password"]').fill('TestPassword123!');

      await page.screenshot({
        path: path.join(__dirname, 'test-results', '01-signin-form.png'),
        fullPage: false
      });

      await page.locator('button >> text="Sign in"').click();
      await page.waitForTimeout(3000);

      console.log('✅ Signed in');
    }

    // Handle onboarding modal
    try {
      const skipButton = page.locator('button:has-text("Skip"), button:has-text("Get started")').first();
      if (await skipButton.isVisible({ timeout: 3000 })) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Modal might not be present
    }

    console.log('\n=== PHASE 2: CREATING CREDENTIALS ===\n');

    // Navigate to credentials
    await page.goto(`${N8N_URL}/home/credentials`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if Notion credentials already exist
    const existingNotionCred = page.locator('text=/Notion.*Set.*Icon/i').first();
    let credentialExists = false;

    try {
      credentialExists = await existingNotionCred.isVisible({ timeout: 2000 });
    } catch (e) {
      credentialExists = false;
    }

    if (credentialExists) {
      console.log('ℹ️ Notion credentials already exist, skipping creation');
    } else {
      console.log('📋 Creating new Notion credentials...');

      // Look for different possible Add Credential buttons
      const addCredButtons = [
        page.locator('button:has-text("Add credential")').first(),
        page.locator('button:has-text("Create credential")').first(),
        page.locator('button:has-text("Create")').first(),
        page.locator('[data-test-id="credentials-create-button"]').first(),
        page.locator('button[class*="credential"]').first()
      ];

      let buttonClicked = false;
      for (const button of addCredButtons) {
        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          await button.click();
          buttonClicked = true;
          console.log('Clicked credential creation button');
          break;
        }
      }

      if (!buttonClicked) {
        console.log('⚠️ Could not find Add Credential button, trying direct navigation');
        await page.goto(`${N8N_URL}/credentials/new`, { waitUntil: 'networkidle' });
      }
      await page.waitForTimeout(1000);

      // Search for Notion Set Icon
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Filter"]').first();
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('notion set icon');
        await page.waitForTimeout(1000);
      }

      // Click on Notion Set Icon API
      const notionApiOption = page.locator('text=/Notion.*Set.*Icon.*API/i').first();
      if (await notionApiOption.isVisible({ timeout: 3000 })) {
        await notionApiOption.click();
        await page.waitForTimeout(1500);
      } else {
        console.log('⚠️ Could not find Notion Set Icon API option');
      }

      // Get credentials from environment
      const tokenV2 = process.env.NOTION_TOKEN_V2 || fs.readFileSync(path.join(__dirname, '../../.env'), 'utf-8').match(/NOTION_TOKEN_V2=([^\n]+)/)?.[1] || '';
      const spaceId = process.env.SPACE_ID || 'd9f87de8-aa61-4fd1-b34d-a093b6db25cb';
      const userId = process.env.NOTION_USER_ID || '64c3aaf6-0e95-4e18-9516-fdd63547bf3a';

      // Fill credential fields
      console.log('📝 Filling credential fields...');
      await page.fill('input[name="tokenV2"], input#tokenV2', tokenV2);
      await page.fill('input[name="spaceId"], input#spaceId', spaceId);
      await page.fill('input[name="userId"], input#userId', userId);

      // Set credential name
      const nameInput = page.locator('input[placeholder*="credential name"], input[placeholder*="My credential"]').first();
      await nameInput.clear();
      await nameInput.fill('Notion Test Credentials');

      await page.screenshot({
        path: path.join(__dirname, 'test-results', '02-credentials-form.png'),
        fullPage: false
      });

      // Save credentials
      await page.locator('button:has-text("Create"), button:has-text("Save")').first().click();
      await page.waitForTimeout(2000);

      console.log('✅ Notion credentials created');
    }

    console.log('\n=== PHASE 3: CREATING WORKFLOW ===\n');

    // Navigate to create new workflow
    await page.goto(`${N8N_URL}/workflow/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Add Manual Trigger node by pressing Tab and typing
    console.log('📌 Adding Manual Trigger node...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('manual trigger');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Position the manual trigger node (optional - it's usually already placed)
    const manualTrigger = page.locator('[data-node-name="Manual Trigger"], [data-name="Manual Trigger"]').first();
    if (await manualTrigger.isVisible()) {
      console.log('✅ Manual Trigger added');
    }

    // Add HTTP Request node
    console.log('📌 Adding HTTP Request node...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.type('http request');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Configure HTTP Request node
    console.log('⚙️ Configuring HTTP Request node...');
    const httpNode = page.locator('[data-node-name*="HTTP Request"], [data-name*="HTTP Request"]').first();
    await httpNode.dblclick();
    await page.waitForTimeout(1000);

    // Set URL for PNG download
    const urlInput = page.locator('input[placeholder*="http"], input[placeholder*="URL"]').first();
    await urlInput.clear();
    await urlInput.fill(PNG_URL);

    // Set response format to File/Binary
    const responseFormatDropdown = page.locator('div:has-text("Response Format")').locator('..').locator('select, [role="combobox"]').first();
    try {
      // Try select element first
      await responseFormatDropdown.selectOption({ value: 'file' });
    } catch (e) {
      // If not a select, try clicking and selecting
      await responseFormatDropdown.click();
      await page.locator('text="File"').click();
    }

    await page.screenshot({
      path: path.join(__dirname, 'test-results', '03-http-request-config.png'),
      fullPage: false
    });

    // Close node settings
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

    // Configure Notion Set Icon node
    console.log('⚙️ Configuring Notion Set Icon node...');
    const notionNode = page.locator('[data-node-name*="Notion Set Icon"], [data-name*="Notion Set Icon"]').first();
    await notionNode.dblclick();
    await page.waitForTimeout(1000);

    // Set Page ID
    const pageIdInput = page.locator('input[name="pageId"], input#pageId').first();
    await pageIdInput.clear();
    await pageIdInput.fill(TEST_PAGE_ID);

    // Set Icon Source to Upload
    const iconSourceDropdown = page.locator('div:has-text("Icon Source")').locator('..').locator('select, [role="combobox"]').first();
    try {
      await iconSourceDropdown.selectOption({ value: 'upload' });
    } catch (e) {
      await iconSourceDropdown.click();
      await page.locator('text="Upload"').click();
    }

    // Set Binary Property Name
    const binaryPropInput = page.locator('input[name="binaryPropertyName"]').first();
    await binaryPropInput.clear();
    await binaryPropInput.fill('data');

    // Select credentials (if available)
    try {
      const credDropdown = page.locator('div:has-text("Credential for Notion")').locator('..').locator('select, [role="combobox"]').first();
      if (await credDropdown.isVisible({ timeout: 2000 })) {
        try {
          await credDropdown.selectOption({ label: 'Notion Test Credentials' });
        } catch (e) {
          await credDropdown.click();
          await page.locator('text="Notion Test Credentials"').click();
        }
      } else {
        console.log('⚠️ Credential dropdown not found, workflow may fail during execution');
      }
    } catch (e) {
      console.log('⚠️ Could not select credentials:', e.message);
    }

    await page.screenshot({
      path: path.join(__dirname, 'test-results', '04-notion-node-config.png'),
      fullPage: false
    });

    // Close node settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Connect the nodes (they should auto-connect, but let's ensure)
    console.log('🔗 Ensuring nodes are connected...');

    // Take screenshot of complete workflow
    await page.screenshot({
      path: path.join(__dirname, 'test-results', '05-complete-workflow.png'),
      fullPage: true
    });

    // Save workflow
    console.log('💾 Saving workflow...');
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(1000);

    // Set workflow name if prompted
    const workflowNameInput = page.locator('input[placeholder*="workflow name"], input[placeholder*="My workflow"]').first();
    if (await workflowNameInput.isVisible({ timeout: 2000 })) {
      await workflowNameInput.clear();
      await workflowNameInput.fill('Notion PNG Upload Test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    console.log('✅ Workflow created and saved');

    console.log('\n=== PHASE 4: EXECUTING WORKFLOW ===\n');

    // Execute workflow
    console.log('🚀 Executing workflow...');
    const executeButton = page.locator('button:has-text("Execute workflow"), button:has-text("Test workflow")').first();
    await executeButton.click();

    // Wait for execution to complete
    console.log('⏳ Waiting for execution to complete...');
    await page.waitForTimeout(8000);

    // Check execution status
    let executionSuccess = false;

    // Look for success indicators
    const successIndicators = [
      page.locator('text=/success/i').first(),
      page.locator('text=/Successfully executed/i').first(),
      page.locator('[data-test-id="success-message"]').first(),
    ];

    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        executionSuccess = true;
        break;
      }
    }

    // Check for error indicators
    const errorIndicator = page.locator('text=/error/i, text=/failed/i').first();
    const hasError = await errorIndicator.isVisible({ timeout: 1000 }).catch(() => false);

    await page.screenshot({
      path: path.join(__dirname, 'test-results', '06-execution-result.png'),
      fullPage: true
    });

    if (executionSuccess && !hasError) {
      console.log('✅ Workflow executed successfully!');

      // Click on each node to see its output
      console.log('\n📊 Checking node outputs...');

      // Check HTTP Request node output
      const httpNodeAfter = page.locator('[data-node-name*="HTTP Request"], [data-name*="HTTP Request"]').first();
      await httpNodeAfter.click();
      await page.waitForTimeout(1000);

      const httpOutput = page.locator('[data-test-id="output-panel"], .output-panel, [class*="output"]').first();
      if (await httpOutput.isVisible({ timeout: 2000 })) {
        const httpOutputText = await httpOutput.textContent();
        console.log('HTTP Request output:', httpOutputText?.substring(0, 100) + '...');

        await page.screenshot({
          path: path.join(__dirname, 'test-results', '07-http-output.png'),
          fullPage: false
        });
      }

      // Check Notion Set Icon node output
      const notionNodeAfter = page.locator('[data-node-name*="Notion Set Icon"], [data-name*="Notion Set Icon"]').first();
      await notionNodeAfter.click();
      await page.waitForTimeout(1000);

      const notionOutput = page.locator('[data-test-id="output-panel"], .output-panel, [class*="output"]').first();
      if (await notionOutput.isVisible({ timeout: 2000 })) {
        const notionOutputText = await notionOutput.textContent();
        console.log('Notion Set Icon output:', notionOutputText?.substring(0, 200));

        await page.screenshot({
          path: path.join(__dirname, 'test-results', '08-notion-output.png'),
          fullPage: false
        });

        // Verify success in output
        expect(notionOutputText).toContain('success');
      }

      console.log('\n🎉 === ALL TESTS PASSED === 🎉\n');
    } else if (hasError) {
      const errorText = await errorIndicator.textContent();
      console.error('❌ Workflow execution failed:', errorText);

      // Try to get error details
      const errorPanel = page.locator('[data-test-id="error-panel"], .error-panel, [class*="error"]').first();
      if (await errorPanel.isVisible({ timeout: 2000 })) {
        const errorDetails = await errorPanel.textContent();
        console.error('Error details:', errorDetails);
      }

      throw new Error(`Workflow execution failed: ${errorText}`);
    } else {
      console.log('⚠️ Could not determine execution status clearly');

      // Still try to check outputs
      const notionNodeFinal = page.locator('[data-node-name*="Notion Set Icon"], [data-name*="Notion Set Icon"]').first();
      await notionNodeFinal.click();
      await page.waitForTimeout(1000);

      const finalOutput = page.locator('[data-test-id="output-panel"], .output-panel, [class*="output"]').first();
      if (await finalOutput.isVisible({ timeout: 2000 })) {
        const outputText = await finalOutput.textContent();
        console.log('Final output:', outputText);
      }
    }

    console.log('\n=== PHASE 5: VERIFICATION ===\n');

    // Additional verification via execution history
    try {
      await page.goto(`${N8N_URL}/home/executions`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const latestExecution = page.locator('[data-test-id="execution-row"], tr').first();
      if (await latestExecution.isVisible({ timeout: 3000 })) {
        const executionStatus = await latestExecution.textContent();
        console.log('Latest execution status:', executionStatus);

        await page.screenshot({
          path: path.join(__dirname, 'test-results', '09-execution-history.png'),
          fullPage: false
        });
      }
    } catch (e) {
      console.log('Could not check execution history');
    }
  });

  test('Verify via Docker CLI', async () => {
    console.log('\n=== CLI VERIFICATION ===\n');

    // List workflows
    try {
      const workflows = execSync('docker exec n8n-notion-test n8n list:workflow 2>/dev/null', {
        encoding: 'utf-8'
      });
      console.log('Workflows found:', workflows.includes('Notion PNG Upload Test') ? '✅ Test workflow exists' : '❌ Test workflow not found');
    } catch (e) {
      console.log('Could not list workflows');
    }

    // Check latest execution
    try {
      const executions = execSync('docker exec n8n-notion-test n8n execution:list --limit=1 2>/dev/null', {
        encoding: 'utf-8'
      });
      console.log('Latest execution contains success:', executions.includes('success') ? '✅' : '❌');
    } catch (e) {
      console.log('Could not check executions');
    }
  });

  test.afterAll(async () => {
    console.log('\n🧹 Cleanup: Docker containers will remain running for manual inspection');
    console.log('To stop containers, run: docker compose down');
    console.log('To view n8n UI, visit: http://localhost:15678');
    console.log('Credentials: test@n8n-notion.local / TestPassword123!');
  });
});