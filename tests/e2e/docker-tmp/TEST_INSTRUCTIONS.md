# Docker Test Instructions for Notion PNG Upload

## Overview
This test validates that the n8n-notion-set-icon node can upload PNG files to Notion pages using Docker-based n8n instance.

## Prerequisites
- Docker and Docker Compose installed
- Notion credentials in `.env` file (NOTION_TOKEN_V2, SPACE_ID, NOTION_USER_ID)
- Test page ID: `278c413b-2a68-80e4-bcc3-f1fcee4839ca`

## Test Setup

### 1. Start Docker Environment
```bash
cd tests/docker
docker compose up -d
```

### 2. Access n8n Interface
- Open browser at: http://localhost:15678
- Login with:
  - Email: `test@n8n-notion.local`
  - Password: `TestPassword123!`

## Manual Workflow Test

### Option A: Import Pre-built Workflow

1. Navigate to Workflows page
2. Click "Import from File"
3. Select: `tests/docker/workflows/notion-png-upload-workflow.json`
4. Open the imported workflow

### Option B: Create Workflow Manually

1. Create new workflow
2. Add nodes in sequence:
   - **Manual Trigger** (for testing)
   - **HTTP Request** node:
     - URL: `https://raw.githubusercontent.com/oriolrius/n8n-nodes-notion-set-icon/main/tests/docker/test-assets/aws-academy-educator.png`
     - Response Format: File
   - **Notion Set Icon** node:
     - Page ID: `278c413b-2a68-80e4-bcc3-f1fcee4839ca`
     - Icon Source: Upload
     - Binary Property: `data`

### 3. Configure Credentials

1. Go to Credentials page
2. Create "Notion Set Icon API" credential
3. Enter from `.env` file:
   - Token V2: (from NOTION_TOKEN_V2)
   - Space ID: (from SPACE_ID)
   - User ID: (from NOTION_USER_ID)

### 4. Execute Workflow

1. Click "Execute Workflow" button
2. Wait for completion (should show green success indicators)
3. Check output panel for success response

## Verification

### 1. Check Notion Page
- Open Notion in browser
- Navigate to the test page
- Verify AWS Academy badge is set as icon

### 2. Check via CLI
```bash
# List workflows
docker exec n8n-notion-test n8n list:workflow

# Check executions
docker exec n8n-notion-test n8n execution:list --limit=1
```

### 3. Check Logs
```bash
docker logs n8n-notion-test --tail 50
```

## Expected Results

✅ **Success Indicators:**
- Workflow executes without errors
- All nodes show green checkmarks
- Output contains: `"success": true`
- Notion page shows AWS Academy PNG as icon

❌ **Common Issues:**
- **401 Error**: Token expired - update NOTION_TOKEN_V2
- **404 Error**: Invalid page ID - verify test page exists
- **Connection Error**: Check Docker network configuration

## Automated Test

Run the full Playwright test suite:
```bash
cd tests/docker
npx playwright test test-notion-png-cli.spec.ts --reporter=list
```

## Cleanup

Stop Docker containers:
```bash
docker compose down
```

Remove test data:
```bash
docker volume rm docker_n8n-data
```

## Test Files

- **PNG Asset**: `test-assets/aws-academy-educator.png`
- **Workflow JSON**: `workflows/notion-png-upload-workflow.json`
- **Docker Config**: `docker-compose.yml`
- **Playwright Test**: `test-notion-png-cli.spec.ts`

## Notes

- The test uses the same PNG file as the Playwright browser test
- The workflow replicates the exact steps from the validated Playwright test
- Custom node is mounted from `dist/` directory (run `pnpm build` first)
- Credentials are stored in Docker volume and persist between restarts