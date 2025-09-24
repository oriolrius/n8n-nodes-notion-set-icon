# Docker-based n8n Node Validation Tests

This directory contains a comprehensive test suite to validate that the n8n-notion-set-icon node is properly installed and compatible with the latest version of n8n.

## 🎯 What It Tests

1. **Node Installation**: Verifies the custom node is properly loaded by n8n
2. **Node Structure**: Validates all required files and properties are present
3. **Credential Types**: Ensures credential types are registered correctly
4. **Workflow Import**: Tests that example workflows can be imported
5. **Node Execution**: Creates and runs test workflows with the custom node
6. **Performance**: Validates API response times and resource usage
7. **Version Compatibility**: Checks compatibility with latest n8n version

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and pnpm installed
- `.env` file with Notion credentials (copy from project root)

### Running Tests

```bash
# One-command test execution
make test

# Or step by step:
make setup      # Prepare files and build node
make build      # Build Docker images
make up         # Start n8n container
make validate   # Run validation suite
```

## 📋 Available Commands

```bash
make help       # Show all available commands
make setup      # Initial setup (build node, prepare files)
make build      # Build Docker images
make up         # Start n8n container
make validate   # Run comprehensive validation
make test       # Run all tests (setup + validate)
make status     # Check container status
make logs       # Show all container logs
make logs-n8n   # Show only n8n logs
make shell      # Open shell in n8n container
make down       # Stop containers
make clean      # Clean up everything
make rebuild    # Clean and rebuild everything
```

## 📊 Test Results

Test results are saved in JSON format to `test-results/` directory with timestamps.

Example output:
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "n8nUrl": "http://n8n:5678",
  "expectedNode": "n8n-nodes-notion-set-icon.notionSetIcon",
  "expectedVersion": "1.0.4",
  "tests": [
    {
      "test": "N8n Health Check",
      "passed": true,
      "message": "Ready in 3.2s"
    },
    {
      "test": "Node Installation",
      "passed": true,
      "message": "Node installed (v1.0.4)"
    }
  ],
  "summary": {
    "total": 10,
    "passed": 10,
    "failed": 0,
    "warnings": 0
  }
}
```

## 🔍 Validation Details

### Node Installation Check
- Verifies the node appears in n8n's node types list
- Validates version matches expected version
- Checks display name and description

### File Structure Validation
- `/home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon/package.json`
- `/home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon/dist/nodes/NotionSetIcon/NotionSetIcon.node.js`
- `/home/node/.n8n/custom/node_modules/n8n-nodes-notion-set-icon/dist/credentials/NotionSetIconApi.credentials.js`

### Node Properties
Required properties checked:
- name
- displayName
- description
- version
- defaults
- inputs/outputs
- properties (including resource and operation)

### Performance Metrics
- API response time (should be < 1000ms)
- Node loading time
- Memory usage

## 🐛 Troubleshooting

### Node not found in n8n
1. Check that `pnpm build` ran successfully
2. Verify files exist in `custom-node/` directory
3. Check n8n logs: `make logs-n8n`

### Container won't start
1. Check port 5678 is not in use
2. Run `make clean` then `make rebuild`

### Tests fail
1. Check test results in `test-results/` directory
2. View detailed logs: `make logs`
3. Open shell and debug: `make shell`

## 📁 Directory Structure

```
tests/docker/
├── docker-compose.yml      # Docker services configuration
├── Dockerfile.validator    # Validator service image
├── Makefile               # Build and test commands
├── setup.sh               # Setup script
├── README.md              # This file
├── custom-node/           # Built node files (generated)
├── test-results/          # Test output (generated)
└── validation/
    └── validate.js        # Main validation script
```

## 🔄 CI/CD Integration

To integrate with CI/CD:

```yaml
# GitHub Actions example
- name: Test n8n Node
  run: |
    cd tests/docker
    make test
```

## 📝 Notes

- The validator will exit with code 1 if any tests fail
- All test workflows are automatically cleaned up after testing
- The n8n container runs without authentication for testing
- Test results include timestamps for tracking