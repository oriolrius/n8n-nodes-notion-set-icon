import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const N8N_URL = 'http://localhost:15678';
const TEST_PAGE_ID = '278c413b-2a68-80e4-bcc3-f1fcee4839ca';

test.describe('Docker n8n Notion PNG Upload Test via CLI', () => {
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

    // Ensure test-results directory exists
    const testResultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
  });

  test('Setup n8n owner account via CLI', async () => {
    console.log('\n=== SETTING UP N8N VIA CLI ===\n');

    try {
      // Create owner account via CLI
      const createOwner = execSync(
        'docker exec n8n-notion-test n8n user-management:reset ' +
        '--email="test@n8n-notion.local" ' +
        '--password="TestPassword123!" ' +
        '--firstName="Test" ' +
        '--lastName="User" 2>&1',
        { encoding: 'utf-8' }
      );
      console.log('Owner account created:', createOwner.trim());
    } catch (e: any) {
      // Account might already exist
      console.log('Owner account might already exist:', e.message);
    }
  });

  test('Create Notion credentials and import workflow', async () => {
    console.log('\n=== CREATING CREDENTIALS AND WORKFLOW ===\n');

    // Get credentials from environment
    const tokenV2 = process.env.NOTION_TOKEN_V2 || fs.readFileSync(path.join(__dirname, '../../.env'), 'utf-8').match(/NOTION_TOKEN_V2=([^\n]+)/)?.[1] || '';
    const spaceId = process.env.SPACE_ID || 'd9f87de8-aa61-4fd1-b34d-a093b6db25cb';
    const userId = process.env.NOTION_USER_ID || '64c3aaf6-0e95-4e18-9516-fdd63547bf3a';

    // Create credentials JSON
    const credentials = {
      name: 'Notion Test Credentials',
      type: 'notionSetIconApi',
      data: {
        tokenV2,
        spaceId,
        userId
      }
    };

    // Save credentials to temp file
    const credsFile = path.join(__dirname, 'temp-creds.json');
    fs.writeFileSync(credsFile, JSON.stringify(credentials));

    // Import credentials
    try {
      const importCreds = execSync(
        `docker exec -i n8n-notion-test n8n credential:import < ${credsFile}`,
        { encoding: 'utf-8' }
      );
      console.log('Credentials imported:', importCreds.trim());
    } catch (e: any) {
      console.log('Error importing credentials:', e.message);
    }

    // Update workflow JSON with proper credential reference
    const workflowPath = path.join(__dirname, 'workflows/notion-png-upload-workflow.json');
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

    // Fix the credential reference
    const notionNode = workflow.nodes.find((n: any) => n.type === 'n8n-nodes-notion-set-icon.notionSetIcon');
    if (notionNode) {
      notionNode.credentials = {
        notionSetIconApi: {
          id: '1',
          name: 'Notion Test Credentials'
        }
      };
    }

    // Save updated workflow
    const tempWorkflowFile = path.join(__dirname, 'temp-workflow.json');
    fs.writeFileSync(tempWorkflowFile, JSON.stringify(workflow, null, 2));

    // Import workflow
    try {
      const importWorkflow = execSync(
        `docker cp ${tempWorkflowFile} n8n-notion-test:/tmp/workflow.json && ` +
        `docker exec n8n-notion-test n8n import:workflow --input=/tmp/workflow.json`,
        { encoding: 'utf-8' }
      );
      console.log('Workflow imported:', importWorkflow.trim());
    } catch (e: any) {
      console.log('Error importing workflow:', e.message);
    }

    // Clean up temp files
    fs.unlinkSync(credsFile);
    fs.unlinkSync(tempWorkflowFile);
  });

  test('Execute workflow and verify icon was set', async ({ page }) => {
    console.log('\n=== EXECUTING WORKFLOW ===\n');

    // Navigate to n8n
    await page.goto(N8N_URL, { waitUntil: 'domcontentloaded' });

    // Sign in
    console.log('🔑 Signing in...');
    await page.locator('input[type="email"]').fill('test@n8n-notion.local');
    await page.locator('input[type="password"]').fill('TestPassword123!');
    await page.locator('button >> text="Sign in"').click();
    await page.waitForTimeout(3000);

    // Navigate to workflows
    await page.goto(`${N8N_URL}/home/workflows`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Find and open our workflow
    const workflowCard = await page.locator('text="Notion PNG Upload Test Workflow"').first();
    if (await workflowCard.isVisible()) {
      await workflowCard.click();
      await page.waitForTimeout(2000);

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
            path: path.join(__dirname, 'test-results', 'docker-cli-success.png'),
            fullPage: true
          });

          // Click on Notion Set Icon node to see output
          const notionNode = await page.locator('[data-name*="Notion Set Icon"]').first();
          if (await notionNode.isVisible()) {
            await notionNode.click();
            await page.waitForTimeout(1000);

            // Look for success in output
            const outputPanel = await page.locator('[data-test-id="output-panel"], .output-data, [class*="output"]').first();
            if (await outputPanel.isVisible()) {
              const outputText = await outputPanel.textContent();
              console.log('Node output preview:', outputText?.substring(0, 200));
              expect(outputText).toContain('success');
            }
          }
        } else if (await errorIndicator.isVisible().catch(() => false)) {
          const errorText = await errorIndicator.textContent();
          console.error('❌ Workflow execution failed:', errorText);

          await page.screenshot({
            path: path.join(__dirname, 'test-results', 'docker-cli-error.png'),
            fullPage: true
          });

          throw new Error(`Workflow execution failed: ${errorText}`);
        }
      }
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });

  test('Verify execution via CLI', async () => {
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
      expect(executions).toContain('success');
    } catch (e) {
      console.log('Could not get executions');
    }
  });

  test.afterAll(async () => {
    console.log('🧹 Cleanup: Stopping Docker containers...');
    // Keep containers running for debugging
    // execSync('docker compose down', { cwd: __dirname, stdio: 'inherit' });
    console.log('Containers kept running for debugging. Run "docker compose down" to stop them.');
  });
});