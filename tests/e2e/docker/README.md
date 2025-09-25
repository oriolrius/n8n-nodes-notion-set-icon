# Minimal n8n Docker Test Setup

## Overview
This is a minimal, clean setup for testing the n8n-notion-set-icon node with Docker.

## Structure
```
docker/
├── docker-compose.yml          # Minimal n8n service configuration
├── n8n-workflow-integration.spec.ts  # Complete integration test
├── custom-node/               # Built n8n custom node
│   ├── nodes/                # Node implementation
│   ├── credentials/          # Credential definitions
│   └── package.json
├── test-assets/
│   └── workflow.json         # Test workflow definition
└── .env                      # Symlink to project .env
```

## Requirements
- Docker and Docker Compose
- Node.js 18+ and pnpm
- Playwright
- `.env` file with:
  - `NOTION_TOKEN_V2`
  - `SPACE_ID`
  - `NOTION_USER_ID`

## Running the Test

### Quick Start
```bash
# From project root
cd tests/e2e/docker

# Start Docker containers
docker compose up -d

# Run the test
npx playwright test n8n-workflow-integration.spec.ts

# Stop containers
docker compose down
```

### What the Test Does
1. **Setup Phase**: Creates fresh n8n instance with clean database
2. **User Management**: Creates user account, logout, login cycle
3. **Workflow Import**: Imports test workflow and credentials via CLI
4. **Execution**: Runs the Notion Set Icon workflow
5. **Validation**: Verifies successful execution

## Test Details

### Test Name
`n8n-workflow-integration.spec.ts` (formerly setup-logout-login.spec.ts)

### Test Flow
1. Removes any existing n8n database
2. Starts fresh n8n container
3. Creates user via web UI
4. Tests logout/login functionality
5. Imports workflow and credentials from files
6. Executes workflow via CLI
7. Validates execution success

### Key Features
- Minimal dependencies
- Clean folder structure
- No unnecessary files
- Uses official n8n Docker image
- Automated credential creation from .env
- Complete integration testing

## Maintenance
- Custom node files are in `custom-node/`
- Test workflow is in `test-assets/workflow.json`
- No build files needed in this folder
- Everything runs from pre-built artifacts

## Troubleshooting
- Ensure port 15678 is available
- Check `.env` has valid Notion credentials
- Run `pnpm build` in project root if node changes
- Use `docker logs n8n-notion-test` for container logs