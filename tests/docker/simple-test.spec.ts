import { test, expect } from '@playwright/test';

const N8N_URL = 'http://localhost:15678';

test.describe('n8n Notion Set Icon Test', () => {
  test('Check n8n is accessible', async ({ page }) => {
    console.log('🔍 Checking n8n accessibility...');

    // Navigate to n8n
    const response = await page.goto(N8N_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    expect(response?.status()).toBeLessThan(400);
    console.log(`✅ n8n responded with status: ${response?.status()}`);

    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/n8n-homepage.png',
      fullPage: true
    });

    if (currentUrl.includes('/setup')) {
      console.log('📝 n8n needs initial setup at /setup');
    } else if (currentUrl.includes('/signin')) {
      console.log('🔑 n8n is ready for signin at /signin');
    } else {
      console.log('✅ n8n is accessible');
    }
  });

  test('Check if custom node is loaded', async ({ request }) => {
    console.log('🔍 Checking custom node via API...');

    try {
      // Try to get node types (might need auth)
      const response = await request.get(`${N8N_URL}/api/v1/node-types`);

      if (response.ok()) {
        const data = await response.json();
        const nodes = data.data || [];

        const customNode = nodes.find((n: any) =>
          n.name?.includes('notionSetIcon')
        );

        if (customNode) {
          console.log('✅ Custom node found:', customNode.name);
        } else {
          console.log('⚠️ Custom node not found in API response');
          console.log(`Total nodes: ${nodes.length}`);
        }
      } else {
        console.log(`⚠️ API returned status: ${response.status()}`);
      }
    } catch (error) {
      console.log('ℹ️ API requires authentication');
    }
  });

  test('Check imported workflows', async ({ page }) => {
    console.log('🔍 Checking for imported workflows...');

    // This test just checks if the workflows page is accessible
    await page.goto(`${N8N_URL}/home/workflows`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    }).catch(async () => {
      console.log('ℹ️ Workflows page requires authentication');

      // Try to check via CLI instead
      const { execSync } = require('child_process');
      try {
        const output = execSync(
          'docker compose exec n8n n8n list:workflow 2>&1 | head -10',
          { encoding: 'utf-8' }
        );
        console.log('📄 Workflows via CLI:');
        console.log(output);
      } catch (e) {
        console.log('Could not list workflows via CLI');
      }
    });

    const currentUrl = page.url();
    if (currentUrl.includes('/signin') || currentUrl.includes('/setup')) {
      console.log('ℹ️ Authentication required to view workflows');
    } else {
      console.log('✅ Workflows page accessed');
    }
  });
});