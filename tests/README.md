# Test Suite Organization

## Overview
This test suite validates the n8n-notion-set-icon node functionality across different environments and use cases.

## Structure

```
tests/
├── e2e/                      # End-to-end tests
│   ├── docker/              # Docker-based n8n tests
│   │   ├── PRIMARY-main-workflow-test.spec.ts  ⭐ MAIN TEST - Most reliable
│   │   ├── setup-logout-login.spec.ts          # Original main test
│   │   ├── n8n-setup.spec.ts                   # Comprehensive setup test
│   │   ├── test-n8n-workflow.spec.ts           # Full workflow operations
│   │   ├── test-notion-png-cli.spec.ts         # CLI integration test
│   │   └── test-notion-png-full-ui.spec.ts     # Complete UI test
│   │
│   └── notion/              # Direct Notion API tests
│       ├── notion-connection.spec.ts           # Authentication & cookies
│       ├── notion-capture-packets.spec.ts      # Network debugging
│       ├── notion-set-icon.spec.ts             # Core icon operations
│       └── notion-upload-png-icon.spec.ts      # PNG upload functionality
│
├── unit/                    # Unit tests
│   └── cookie-parser.spec.ts                   # Cookie parsing utilities
│
├── fixtures/                # Test data and assets
│   ├── images/             # Test images
│   │   ├── test-icon.png
│   │   └── aws-academy-educator.png
│   ├── workflows/          # n8n workflow definitions
│   └── credentials/        # Example credentials
│
└── archive/                 # Old/duplicate tests (for reference)
    ├── ACTUAL-WORKING-TEST.spec.ts
    ├── FINAL-WORKING-TEST.spec.ts
    ├── working-test.spec.ts
    └── ... (other deprecated tests)
```

## Primary Test

### ⭐ `PRIMARY-main-workflow-test.spec.ts`
This is the **MOST IMPORTANT** and **MOST RELIABLE** test. It was originally `setup-logout-login.spec.ts` and has proven to work consistently.

**What it tests:**
- n8n account setup
- User logout/login cycle
- Credential configuration
- Complete workflow creation
- Full execution validation

## Running Tests

### Docker E2E Tests
```bash
cd tests/e2e/docker
npm test PRIMARY-main-workflow-test.spec.ts  # Run the main test
npm test                                      # Run all Docker tests
```

### Notion API Tests
```bash
cd tests/e2e/notion
npm test                                      # Run all Notion tests
```

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and pnpm
- `.env` file with Notion credentials:
  - `NOTION_TOKEN_V2`
  - `SPACE_ID`
  - `NOTION_USER_ID`

## Test Categories

### Critical Tests (Run First)
1. `PRIMARY-main-workflow-test.spec.ts` - Complete workflow validation
2. `n8n-setup.spec.ts` - Node setup and verification

### Integration Tests
1. `test-notion-png-cli.spec.ts` - CLI operations
2. `test-n8n-workflow.spec.ts` - Workflow operations
3. `test-notion-png-full-ui.spec.ts` - Full UI flow

### API Tests
1. `notion-connection.spec.ts` - Connection validation
2. `notion-set-icon.spec.ts` - Icon operations
3. `notion-upload-png-icon.spec.ts` - File uploads

## Archive Folder

The `archive/` folder contains old test iterations that have been replaced by the current test suite. These are kept for reference but should not be run as part of regular testing.

## Notes

- All Docker tests use Playwright for browser automation
- Tests interact with n8n running in Docker at `localhost:15678`
- The PRIMARY test is the most comprehensive and reliable
- Archive tests are deprecated but kept for historical reference