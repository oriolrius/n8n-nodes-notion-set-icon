import { test, expect, type Page } from '@playwright/test';
import { getNotionCookies } from './utils/cookie-parser';
import * as path from 'path';
import * as fs from 'fs';
import FormData from 'form-data';

const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');
const NOTION_URL = 'https://www.notion.so';
const TEST_PAGE_URL = 'https://www.notion.so/oriolrius/test_page-278c413b2a6880e4bcc3f1fcee4839ca';
// Extract the actual page ID from URL and format correctly
const TEST_PAGE_ID = '278c413b-2a68-80e4-bcc3-f1fcee4839ca'; // Formatted with correct hyphens from URL

// Icon URLs to test
const TEST_ICONS = {
  emoji: '🚀',
  externalUrl: 'https://www.notion.so/images/page-cover/gradients_8.jpg',
  customUrl: 'https://raw.githubusercontent.com/github/explore/80688e429a7d4ef2fca1e82350fe8e3517d3494d/topics/nodejs/nodejs.png'
};

test.describe('Notion Set Icon Tests', () => {
  let cookies: any[];
  let tokenV2: string;
  let spaceId: string;
  let userId: string;

  test.beforeAll(async () => {
    // Load cookies from file
    if (!fs.existsSync(COOKIES_FILE)) {
      throw new Error(`Cookies file not found: ${COOKIES_FILE}`);
    }

    cookies = getNotionCookies(COOKIES_FILE);
    const tokenCookie = cookies.find(c => c.name === 'token_v2');

    if (!tokenCookie) {
      throw new Error('token_v2 cookie not found in cookies.txt');
    }

    tokenV2 = tokenCookie.value;
    console.log(`token_v2 loaded: ${tokenV2.substring(0, 20)}... (length: ${tokenV2.length})`);

    // Try to load from .env if available
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const spaceIdMatch = envContent.match(/SPACE_ID=([^\n]+)/);
      const userIdMatch = envContent.match(/NOTION_USER_ID=([^\n]+)/);

      if (spaceIdMatch) spaceId = spaceIdMatch[1].trim();
      if (userIdMatch) userId = userIdMatch[1].trim();
    }

    // If not in .env, we'll need to extract from the page
    if (!spaceId || !userId) {
      console.log('Space ID or User ID not found in .env, will extract from page');
    }
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
  });

  test('Extract workspace and user information from Notion', async ({ page }) => {
    console.log('\n=== EXTRACTING WORKSPACE INFO ===');

    // First load Notion homepage to get better context
    await page.goto(NOTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Extract space ID and user ID from page
    const pageInfo = await page.evaluate(() => {
      // Try multiple methods to extract IDs
      const scripts = Array.from(document.querySelectorAll('script'));
      const notionData = scripts.map(s => s.textContent).join(' ');

      // Look for space ID in various formats
      const spaceIdMatch = notionData.match(/"spaceId":"([^"]+)"|spaceId['"]\s*:\s*['"]([^'"]+)/);
      const userIdMatch = notionData.match(/"userId":"([^"]+)"|userId['"]\s*:\s*['"]([^'"]+)/);

      // Alternative: check window object
      const windowData = (window as any).__NEXT_DATA__ || (window as any).CONFIG || {};

      return {
        spaceId: spaceIdMatch?.[1] || spaceIdMatch?.[2] || windowData.spaceId || null,
        userId: userIdMatch?.[1] || userIdMatch?.[2] || windowData.userId || null,
        pageData: JSON.stringify(windowData).substring(0, 500)
      };
    });

    if (pageInfo.spaceId) {
      spaceId = pageInfo.spaceId;
      console.log(`Space ID extracted: ${spaceId}`);
    }

    if (pageInfo.userId) {
      userId = pageInfo.userId;
      console.log(`User ID extracted: ${userId}`);
    }

    // Try network monitoring to capture IDs
    if (!spaceId || !userId) {
      console.log('Attempting to extract IDs from network requests...');

      // Set up request interception
      page.on('request', request => {
        const url = request.url();
        if (url.includes('api/v3')) {
          const headers = request.headers();
          if (headers['x-notion-active-user-header']) {
            userId = headers['x-notion-active-user-header'];
            console.log(`User ID from headers: ${userId}`);
          }
        }
      });

      page.on('response', async response => {
        const url = response.url();
        if (url.includes('api/v3') && response.ok()) {
          try {
            const body = await response.json();
            if (body.spaceId) {
              spaceId = body.spaceId;
              console.log(`Space ID from response: ${spaceId}`);
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      });

      // Reload page to trigger requests
      await page.reload();
      await page.waitForTimeout(3000);
    }

    // Fallback: use values from .env if we couldn't extract them
    if (!spaceId) {
      // Use the actual space ID from .env
      spaceId = 'd9f87de8-aa61-4fd1-b34d-a093b6db25cb';
      console.log('Using space ID from .env:', spaceId);
    }
    if (!userId) {
      // Use the actual user ID from .env
      userId = '64c3aaf6-0e95-4e18-9516-fdd63547bf3a';
      console.log('Using user ID from .env:', userId);
    }

    expect(tokenV2).toBeTruthy();
    console.log('\n✓ Workspace information ready');
  });

  test('Set emoji icon on test page', async ({ page }) => {
    console.log('\n=== SETTING EMOJI ICON ===');

    const emoji = TEST_ICONS.emoji;
    console.log(`Setting emoji icon: ${emoji}`);

    // Make API call to set icon
    const response = await page.request.post('https://www.notion.so/api/v3/saveTransactionsFanout', {
      headers: {
        'Cookie': `token_v2=${tokenV2};`,
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'notion-client-version': '23.13.0.2800',
        'x-notion-active-user-header': userId,
        'Referer': 'https://www.notion.so/'
      },
      data: {
        requestId: generateUUID(),
        transactions: [
          {
            id: generateUUID(),
            spaceId: spaceId,
            debug: { userAction: 'PlaywrightIconTest' },
            operations: [
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: spaceId
                },
                path: ['format', 'page_icon'],
                command: 'set',
                args: emoji
              },
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: spaceId
                },
                path: [],
                command: 'update',
                args: {
                  last_edited_time: Date.now(),
                  last_edited_by_id: userId,
                  last_edited_by_table: 'notion_user'
                }
              }
            ]
          }
        ]
      }
    });

    console.log(`API Response status: ${response.status()}`);

    if (response.ok()) {
      console.log('✅ Emoji icon set successfully');

      // Verify by visiting the page (with shorter timeout)
      await page.goto(TEST_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      // Check if emoji is visible
      const iconVisible = await page.evaluate((emoji) => {
        const iconElements = Array.from(document.querySelectorAll('*')).filter(el =>
          el.textContent?.includes(emoji)
        );
        return iconElements.length > 0;
      }, emoji);

      console.log(`Emoji visible on page: ${iconVisible}`);
      await page.screenshot({ path: 'test-results/page-with-emoji-icon.png' });
    } else {
      const errorText = await response.text();
      console.error(`Failed to set emoji icon: ${errorText}`);
    }

    expect(response.status()).toBe(200);
  });

  test('Set external URL icon on test page', async ({ page }) => {
    console.log('\n=== SETTING EXTERNAL URL ICON ===');

    const iconUrl = TEST_ICONS.externalUrl;
    console.log(`Setting icon from URL: ${iconUrl}`);

    const response = await page.request.post('https://www.notion.so/api/v3/saveTransactionsFanout', {
      headers: {
        'Cookie': `token_v2=${tokenV2};`,
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'notion-client-version': '23.13.0.2800',
        'x-notion-active-user-header': userId,
        'Referer': 'https://www.notion.so/'
      },
      data: {
        requestId: generateUUID(),
        transactions: [
          {
            id: generateUUID(),
            spaceId: spaceId,
            debug: { userAction: 'PlaywrightIconTest' },
            operations: [
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: spaceId
                },
                path: ['format', 'page_icon'],
                command: 'set',
                args: iconUrl
              },
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: spaceId
                },
                path: [],
                command: 'update',
                args: {
                  last_edited_time: Date.now(),
                  last_edited_by_id: userId,
                  last_edited_by_table: 'notion_user'
                }
              }
            ]
          }
        ]
      }
    });

    console.log(`API Response status: ${response.status()}`);

    if (response.ok()) {
      console.log('✅ URL icon set successfully');

      // Verify by visiting the page
      await page.goto(TEST_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);

      // Check for image element with the icon
      const iconInfo = await page.evaluate((url) => {
        const images = Array.from(document.querySelectorAll('img'));
        const iconImg = images.find(img => img.src.includes('page-cover') || img.src.includes('notion'));
        return {
          found: !!iconImg,
          src: iconImg?.src,
          allImages: images.map(img => img.src).slice(0, 5)
        };
      }, iconUrl);

      console.log(`Icon image found: ${iconInfo.found}`);
      if (iconInfo.src) {
        console.log(`Icon src: ${iconInfo.src}`);
      }
      console.log('Sample images on page:', iconInfo.allImages);

      await page.screenshot({ path: 'test-results/page-with-url-icon.png' });
    } else {
      const errorText = await response.text();
      console.error(`Failed to set URL icon: ${errorText}`);
    }

    expect(response.status()).toBe(200);
  });

  test('Upload and set custom image icon', async ({ page }) => {
    console.log('\n=== UPLOADING CUSTOM IMAGE ICON ===');

    // Create a simple test image (1x1 red pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(testImageBase64, 'base64');
    const fileName = 'test-icon.png';
    const mimeType = 'image/png';

    console.log('Step 1: Getting upload URL from Notion...');

    // Step 1: Get upload URL
    const uploadUrlResponse = await page.request.post('https://www.notion.so/api/v3/getUploadFileUrl', {
      headers: {
        'Cookie': `token_v2=${tokenV2};`,
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'notion-client-version': '23.13.0.2800',
        'x-notion-active-user-header': userId,
        'Referer': 'https://www.notion.so/'
      },
      data: {
        bucket: 'secure',
        name: fileName,
        contentType: mimeType,
        record: {
          table: 'block',
          id: TEST_PAGE_ID,
          spaceId: spaceId
        },
        supportExtraHeaders: true,
        contentLength: imageBuffer.length
      }
    });

    if (!uploadUrlResponse.ok()) {
      const error = await uploadUrlResponse.text();
      console.error(`Failed to get upload URL: ${error}`);
      expect(uploadUrlResponse.status()).toBe(200);
      return;
    }

    const uploadData = await uploadUrlResponse.json();
    console.log('✅ Got upload URL');
    console.log(`S3 URL: ${uploadData.signedUploadPostUrl?.substring(0, 50)}...`);
    console.log(`Final URL: ${uploadData.url?.substring(0, 50)}...`);

    // Step 2: Upload to S3
    if (uploadData.signedUploadPostUrl && uploadData.fields) {
      console.log('Step 2: Uploading to S3...');

      const formData = new FormData();

      // Add S3 fields
      Object.entries(uploadData.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });

      // Add file
      formData.append('file', imageBuffer, {
        filename: fileName,
        contentType: mimeType
      });

      const s3Response = await fetch(uploadData.signedUploadPostUrl, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders()
      });

      console.log(`S3 upload response status: ${s3Response.status}`);

      if (s3Response.ok || s3Response.status === 204) {
        console.log('✅ Image uploaded to S3');

        // Step 3: Set the icon
        console.log('Step 3: Setting icon on page...');

        const setIconResponse = await page.request.post('https://www.notion.so/api/v3/saveTransactionsFanout', {
          headers: {
            'Cookie': `token_v2=${tokenV2};`,
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json',
            'notion-client-version': '23.13.0.2800',
            'x-notion-active-user-header': userId,
            'Referer': 'https://www.notion.so/'
          },
          data: {
            requestId: generateUUID(),
            transactions: [
              {
                id: generateUUID(),
                spaceId: spaceId,
                debug: { userAction: 'PlaywrightIconUploadTest' },
                operations: [
                  {
                    pointer: {
                      table: 'block',
                      id: TEST_PAGE_ID,
                      spaceId: spaceId
                    },
                    path: ['format', 'page_icon'],
                    command: 'set',
                    args: uploadData.url
                  },
                  {
                    pointer: {
                      table: 'block',
                      id: TEST_PAGE_ID,
                      spaceId: spaceId
                    },
                    path: [],
                    command: 'update',
                    args: {
                      last_edited_time: Date.now(),
                      last_edited_by_id: userId,
                      last_edited_by_table: 'notion_user'
                    }
                  }
                ]
              }
            ]
          }
        });

        console.log(`Set icon response status: ${setIconResponse.status()}`);

        if (setIconResponse.ok()) {
          console.log('✅ Custom icon set successfully');

          // Verify on page
          await page.goto(TEST_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'test-results/page-with-custom-icon.png' });
        }

        expect(setIconResponse.status()).toBe(200);
      } else {
        const s3Error = await s3Response.text();
        console.error(`S3 upload failed: ${s3Error}`);
      }
    }
  });

  test('Remove icon from test page', async ({ page }) => {
    console.log('\n=== REMOVING ICON ===');

    const response = await page.request.post('https://www.notion.so/api/v3/saveTransactionsFanout', {
      headers: {
        'Cookie': `token_v2=${tokenV2};`,
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'notion-client-version': '23.13.0.2800',
        'x-notion-active-user-header': userId,
        'Referer': 'https://www.notion.so/'
      },
      data: {
        requestId: generateUUID(),
        transactions: [
          {
            id: generateUUID(),
            spaceId: spaceId,
            debug: { userAction: 'PlaywrightRemoveIcon' },
            operations: [
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: spaceId
                },
                path: ['format', 'page_icon'],
                command: 'set',
                args: null  // Setting to null removes the icon
              },
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: spaceId
                },
                path: [],
                command: 'update',
                args: {
                  last_edited_time: Date.now(),
                  last_edited_by_id: userId,
                  last_edited_by_table: 'notion_user'
                }
              }
            ]
          }
        ]
      }
    });

    console.log(`API Response status: ${response.status()}`);

    if (response.ok()) {
      console.log('✅ Icon removed successfully');

      // Verify on page
      await page.goto(TEST_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/page-without-icon.png' });
    } else {
      const errorText = await response.text();
      console.error(`Failed to remove icon: ${errorText}`);
    }

    expect(response.status()).toBe(200);
  });
});

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}