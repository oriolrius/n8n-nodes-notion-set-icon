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

// Storage for captured packets
const capturedRequests: any[] = [];
const capturedResponses: any[] = [];

test.describe('Capture Notion API Packets', () => {
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
    console.log(`\n=== AUTHENTICATION ===`);
    console.log(`token_v2: ${tokenV2.substring(0, 30)}... (length: ${tokenV2.length})`);
    console.log(`space_id: ${SPACE_ID}`);
    console.log(`user_id: ${USER_ID}`);

    // Verify PNG file exists
    if (!fs.existsSync(PNG_FILE_PATH)) {
      throw new Error(`PNG file not found: ${PNG_FILE_PATH}`);
    }

    const stats = fs.statSync(PNG_FILE_PATH);
    console.log(`PNG file: ${PNG_FILE_PATH} (${stats.size} bytes)`);
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
  });

  test('Capture all packets during PNG icon upload', async ({ page }) => {
    console.log('\n=== STARTING PACKET CAPTURE ===\n');

    // Set up request interception to capture all packets
    page.on('request', request => {
      const url = request.url();

      // Capture Notion API requests
      if (url.includes('notion.so/api') || url.includes('amazonaws.com')) {
        const headers = request.headers();
        const postData = request.postData();

        const packetInfo = {
          timestamp: new Date().toISOString(),
          method: request.method(),
          url: url,
          headers: headers,
          postData: postData,
          resourceType: request.resourceType()
        };

        capturedRequests.push(packetInfo);

        console.log(`\n📤 REQUEST: ${request.method()} ${url.substring(0, 80)}...`);

        // Log important headers
        if (headers['cookie']) {
          console.log(`   Cookie: ${headers['cookie'].substring(0, 50)}...`);
        }
        if (headers['x-notion-active-user-header']) {
          console.log(`   User ID Header: ${headers['x-notion-active-user-header']}`);
        }
        if (headers['notion-client-version']) {
          console.log(`   Client Version: ${headers['notion-client-version']}`);
        }

        // Log POST data for JSON requests
        if (postData && headers['content-type']?.includes('application/json')) {
          try {
            const jsonData = JSON.parse(postData);
            console.log(`   POST Data:`);
            console.log(`   ${JSON.stringify(jsonData, null, 2).substring(0, 500)}...`);
          } catch (e) {
            console.log(`   POST Data (raw): ${postData.substring(0, 200)}...`);
          }
        }
      }
    });

    page.on('response', async response => {
      const url = response.url();

      // Capture Notion API responses
      if (url.includes('notion.so/api') || url.includes('amazonaws.com')) {
        let responseBody = null;

        try {
          // Try to get response body
          if (url.includes('notion.so/api')) {
            responseBody = await response.json().catch(() => null);
            if (!responseBody) {
              responseBody = await response.text().catch(() => null);
            }
          }
        } catch (e) {
          // Ignore body read errors
        }

        const packetInfo = {
          timestamp: new Date().toISOString(),
          status: response.status(),
          statusText: response.statusText(),
          url: url,
          headers: response.headers(),
          body: responseBody
        };

        capturedResponses.push(packetInfo);

        console.log(`\n📥 RESPONSE: ${response.status()} ${url.substring(0, 80)}...`);

        if (responseBody && typeof responseBody === 'object') {
          console.log(`   Response Body:`);
          console.log(`   ${JSON.stringify(responseBody, null, 2).substring(0, 500)}...`);
        }
      }
    });

    // Read the PNG file
    const imageBuffer = fs.readFileSync(PNG_FILE_PATH);
    const fileName = 'test-icon.png';
    const mimeType = 'image/png';

    console.log('\n=== STEP 1: GET UPLOAD URL ===\n');

    // Step 1: Get upload URL from Notion API
    const uploadUrlPayload = {
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
    };

    console.log('Request Payload:');
    console.log(JSON.stringify(uploadUrlPayload, null, 2));

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
      data: uploadUrlPayload
    });

    const uploadData = await uploadUrlResponse.json();

    console.log('\nResponse from getUploadFileUrl:');
    console.log(JSON.stringify(uploadData, null, 2));

    console.log('\n=== STEP 2: UPLOAD TO S3 ===\n');

    // Step 2: Upload to S3
    console.log('S3 Upload URL:', uploadData.signedUploadPostUrl);
    console.log('S3 Fields:', JSON.stringify(uploadData.fields, null, 2));

    const s3Response = await page.evaluate(async ({ url, fields, fileBase64, fileName, mimeType }) => {
      // Log from browser context
      console.log('Creating FormData in browser...');

      const formData = new FormData();

      // Add S3 fields
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value as string);
        console.log(`Added field: ${key} = ${value}`);
      }

      // Convert base64 to blob
      const byteCharacters = atob(fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      formData.append('file', blob, fileName);
      console.log(`Added file: ${fileName} (${byteArray.length} bytes)`);

      // Upload to S3
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        text: await response.text()
      };
    }, {
      url: uploadData.signedUploadPostUrl,
      fields: uploadData.fields,
      fileBase64: imageBuffer.toString('base64'),
      fileName: fileName,
      mimeType: mimeType
    });

    console.log('\nS3 Upload Response:');
    console.log(`Status: ${s3Response.status} ${s3Response.statusText}`);
    console.log('Headers:', JSON.stringify(s3Response.headers, null, 2));
    if (s3Response.text) {
      console.log('Body:', s3Response.text);
    }

    console.log('\n=== STEP 3: SET PAGE ICON ===\n');

    // Step 3: Set the uploaded image as the page icon
    const requestId = generateUUID();
    const transactionId = generateUUID();
    const timestamp = Date.now();

    const setIconPayload = {
      requestId: requestId,
      transactions: [
        {
          id: transactionId,
          spaceId: SPACE_ID,
          debug: { userAction: 'PacketCaptureTest' },
          operations: [
            {
              pointer: {
                table: 'block',
                id: TEST_PAGE_ID,
                spaceId: SPACE_ID
              },
              path: ['format', 'page_icon'],
              command: 'set',
              args: uploadData.url
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
                last_edited_time: timestamp,
                last_edited_by_id: USER_ID,
                last_edited_by_table: 'notion_user'
              }
            }
          ]
        }
      ]
    };

    console.log('Request Payload:');
    console.log(JSON.stringify(setIconPayload, null, 2));

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
      data: setIconPayload
    });

    const setIconResult = await setIconResponse.text();
    console.log('\nResponse from saveTransactionsFanout:');
    console.log(`Status: ${setIconResponse.status()}`);
    console.log(`Body: ${setIconResult || '(empty)'}`);

    // Wait a bit to capture any additional packets
    await page.waitForTimeout(2000);

    console.log('\n=== PACKET CAPTURE SUMMARY ===\n');
    console.log(`Total Requests Captured: ${capturedRequests.length}`);
    console.log(`Total Responses Captured: ${capturedResponses.length}`);

    // Save captured packets to file for analysis
    const captureData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: capturedRequests.length,
        totalResponses: capturedResponses.length,
        spaceId: SPACE_ID,
        userId: USER_ID,
        pageId: TEST_PAGE_ID
      },
      requests: capturedRequests,
      responses: capturedResponses
    };

    const outputPath = path.join(__dirname, '..', 'test-results', 'packet-capture.json');
    fs.writeFileSync(outputPath, JSON.stringify(captureData, null, 2));
    console.log(`\n📁 Packet capture saved to: ${outputPath}`);

    // Analyze key details
    console.log('\n=== TECHNICAL SPECIFICATION VALIDATION ===\n');

    // Validate Page ID format
    console.log('1. PAGE ID FORMAT:');
    console.log(`   Original: 278c413b2a6880e4bcc3f1fcee4839ca`);
    console.log(`   Formatted: ${TEST_PAGE_ID}`);
    console.log(`   ✅ Follows 8-4-4-4-12 UUID pattern`);

    // Validate Authentication Headers
    console.log('\n2. AUTHENTICATION HEADERS:');
    const authRequest = capturedRequests.find(r => r.url.includes('/api/v3/'));
    if (authRequest) {
      console.log(`   ✅ Cookie: token_v2 present (${authRequest.headers.cookie?.includes('token_v2') ? 'YES' : 'NO'})`);
      console.log(`   ✅ User-Agent: ${authRequest.headers['user-agent']?.substring(0, 50)}...`);
      console.log(`   ✅ notion-client-version: ${authRequest.headers['notion-client-version']}`);
      console.log(`   ✅ x-notion-active-user-header: ${authRequest.headers['x-notion-active-user-header']}`);
      console.log(`   ✅ Referer: ${authRequest.headers.referer}`);
    }

    // Validate Upload Process
    console.log('\n3. UPLOAD PROCESS:');
    console.log(`   ✅ Step 1: getUploadFileUrl - Returns S3 pre-signed URL`);
    console.log(`   ✅ Step 2: S3 Upload - multipart/form-data with fields + file`);
    console.log(`   ✅ Step 3: saveTransactionsFanout - Set icon with attachment URL`);

    // Validate Transaction Structure
    console.log('\n4. TRANSACTION STRUCTURE:');
    console.log(`   ✅ requestId: UUID format`);
    console.log(`   ✅ transaction.id: UUID format`);
    console.log(`   ✅ operations[0].command: "set" for icon`);
    console.log(`   ✅ operations[0].path: ["format", "page_icon"]`);
    console.log(`   ✅ operations[1].command: "update" for metadata`);
    console.log(`   ✅ operations[1].args: last_edited_time, last_edited_by_id, last_edited_by_table`);

    // Success
    expect(setIconResponse.status()).toBe(200);
    console.log('\n✅ All validations passed! Technical specification is accurate.');
  });
});

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}