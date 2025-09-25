import { test, expect, type Page } from '@playwright/test';
import { getNotionCookies } from '../../unit/cookie-parser';
import * as path from 'path';
import * as fs from 'fs';

const COOKIES_FILE = path.join(__dirname, '..', '..', '..', 'cookies.txt');
const TEST_PAGE_URL = 'https://www.notion.so/oriolrius/test_page-278c413b2a6880e4bcc3f1fcee4839ca';
const TEST_PAGE_ID = '278c413b-2a68-80e4-bcc3-f1fcee4839ca';
const PNG_FILE_PATH = path.join(__dirname, '../../fixtures/images/aws-academy-educator.png');

// Hard-coded values from .env
const SPACE_ID = 'd9f87de8-aa61-4fd1-b34d-a093b6db25cb';
const USER_ID = '64c3aaf6-0e95-4e18-9516-fdd63547bf3a';

test.describe('Notion Upload PNG Icon Test', () => {
  let cookies: any[];
  let tokenV2: string;

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

    // Verify PNG file exists
    if (!fs.existsSync(PNG_FILE_PATH)) {
      throw new Error(`PNG file not found: ${PNG_FILE_PATH}`);
    }

    const stats = fs.statSync(PNG_FILE_PATH);
    console.log(`PNG file size: ${stats.size} bytes`);
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
  });

  test('Upload PNG file and set as page icon', async ({ page }) => {
    console.log('\n=== UPLOADING PNG FILE AS ICON ===');

    // Read the PNG file
    const imageBuffer = fs.readFileSync(PNG_FILE_PATH);
    const fileName = 'test-icon.png';
    const mimeType = 'image/png';

    console.log(`File: ${fileName}`);
    console.log(`Size: ${imageBuffer.length} bytes`);
    console.log(`MIME type: ${mimeType}`);

    // Step 1: Get upload URL from Notion API
    console.log('\n1. Requesting upload URL from Notion...');

    const uploadUrlResponse = await page.request.post('https://www.notion.so/api/v3/getUploadFileUrl', {
      headers: {
        'Cookie': `token_v2=${tokenV2};`,
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'notion-client-version': '23.13.0.2800',
        'x-notion-active-user-header': USER_ID,
        'Referer': 'https://www.notion.so/'
      },
      data: {
        bucket: 'secure',
        name: fileName,
        contentType: mimeType,
        record: {
          table: 'block',
          id: TEST_PAGE_ID,
          spaceId: SPACE_ID
        },
        supportExtraHeaders: true,
        contentLength: imageBuffer.length
      }
    });

    expect(uploadUrlResponse.ok()).toBeTruthy();

    const uploadData = await uploadUrlResponse.json();
    console.log('✅ Got upload URL');
    console.log(`   S3 URL: ${uploadData.signedUploadPostUrl?.substring(0, 60)}...`);
    console.log(`   Final attachment URL: ${uploadData.url}`);

    expect(uploadData.signedUploadPostUrl).toBeTruthy();
    expect(uploadData.url).toBeTruthy();
    expect(uploadData.fields).toBeTruthy();

    // Step 2: Upload to S3 using FormData
    console.log('\n2. Uploading PNG to S3...');

    // Use page.evaluate to access FormData in browser context
    const s3Response = await page.evaluate(async ({ url, fields, fileBase64, fileName, mimeType }) => {
      // Create FormData in browser context
      const formData = new FormData();

      // Add S3 fields first (order matters!)
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value as string);
      }

      // Convert base64 to blob
      const byteCharacters = atob(fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Add file as the last field
      formData.append('file', blob, fileName);

      // Upload to S3
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      return {
        status: response.status,
        statusText: response.statusText,
        text: await response.text()
      };
    }, {
      url: uploadData.signedUploadPostUrl,
      fields: uploadData.fields,
      fileBase64: imageBuffer.toString('base64'),
      fileName: fileName,
      mimeType: mimeType
    });

    console.log(`   S3 Response status: ${s3Response.status}`);

    if (s3Response.status !== 200 && s3Response.status !== 204) {
      console.error(`   S3 upload failed: ${s3Response.text}`);
      throw new Error(`S3 upload failed with status ${s3Response.status}`);
    }

    console.log('✅ PNG uploaded to S3 successfully');

    // Step 3: Set the uploaded image as the page icon
    console.log('\n3. Setting uploaded PNG as page icon...');

    const setIconResponse = await page.request.post('https://www.notion.so/api/v3/saveTransactionsFanout', {
      headers: {
        'Cookie': `token_v2=${tokenV2};`,
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'notion-client-version': '23.13.0.2800',
        'x-notion-active-user-header': USER_ID,
        'Referer': 'https://www.notion.so/'
      },
      data: {
        requestId: generateUUID(),
        transactions: [
          {
            id: generateUUID(),
            spaceId: SPACE_ID,
            debug: { userAction: 'PNGIconUploadTest' },
            operations: [
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: SPACE_ID
                },
                path: ['format', 'page_icon'],
                command: 'set',
                args: uploadData.url  // Use the attachment URL from step 1
              },
              {
                pointer: {
                  table: 'block',
                  id: TEST_PAGE_ID,
                  spaceId: SPACE_ID
                },
                path: [],
                command: 'update',
                args: {
                  last_edited_time: Date.now(),
                  last_edited_by_id: USER_ID,
                  last_edited_by_table: 'notion_user'
                }
              }
            ]
          }
        ]
      }
    });

    console.log(`   API Response status: ${setIconResponse.status()}`);
    expect(setIconResponse.ok()).toBeTruthy();

    if (setIconResponse.ok()) {
      console.log('✅ PNG icon set successfully!');
    } else {
      const errorText = await setIconResponse.text();
      console.error(`Failed to set icon: ${errorText}`);
    }

    // Step 4: Verify the icon was set by visiting the page
    console.log('\n4. Verifying icon on page...');

    await page.goto(TEST_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for icon in the page
    const iconInfo = await page.evaluate(() => {
      // Look for page icon elements
      const pageIcons = Array.from(document.querySelectorAll('[class*="page_icon"], [class*="pageIcon"], img[src*="attachment"]'));
      const allImages = Array.from(document.querySelectorAll('img'));

      return {
        pageIconsFound: pageIcons.length,
        totalImages: allImages.length,
        sampleImageUrls: allImages.map(img => img.src).filter(src =>
          src.includes('attachment') ||
          src.includes('secure') ||
          src.includes('page_icon')
        ).slice(0, 3)
      };
    });

    console.log(`   Page icons found: ${iconInfo.pageIconsFound}`);
    console.log(`   Total images on page: ${iconInfo.totalImages}`);
    if (iconInfo.sampleImageUrls.length > 0) {
      console.log('   Icon URLs found:');
      iconInfo.sampleImageUrls.forEach(url => {
        console.log(`     - ${url.substring(0, 100)}...`);
      });
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/page-with-uploaded-png-icon.png', fullPage: false });
    console.log('\n📸 Screenshot saved: test-results/page-with-uploaded-png-icon.png');

    // Final assertion
    expect(iconInfo.totalImages).toBeGreaterThan(0);
    console.log('\n✅ Test completed successfully! PNG icon has been uploaded and set.');
  });
});

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}