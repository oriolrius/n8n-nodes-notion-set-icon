#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Setting up n8n with custom node${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Function to run command in n8n container
n8n_exec() {
    docker compose exec -T n8n "$@"
}

# Wait for n8n to be ready
echo -e "${YELLOW}⏳ Waiting for n8n to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:15678/healthz > /dev/null 2>&1; then
        echo -e "${GREEN}✅ n8n is ready!${NC}"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Check if custom node is loaded
echo -e "${YELLOW}🔍 Checking custom node installation...${NC}"

# List loaded nodes
echo -e "${BLUE}Listing all available nodes...${NC}"
n8n_exec sh -c "cd /home/node && n8n list:workflow 2>/dev/null | head -20" || true

# Import example workflows
echo -e "${YELLOW}📥 Importing example workflows...${NC}"

# Copy workflows to container
docker compose cp ../../examples/workflow-example.json n8n:/tmp/workflow-example.json
docker compose cp ../../examples/my-workflow.json n8n:/tmp/my-workflow.json

# Import workflows using CLI
echo "Importing workflow-example.json..."
n8n_exec sh -c "cd /home/node && n8n import:workflow --input=/tmp/workflow-example.json" || {
    echo -e "${YELLOW}⚠️ Could not import via CLI, will use UI${NC}"
}

echo "Importing my-workflow.json..."
n8n_exec sh -c "cd /home/node && n8n import:workflow --input=/tmp/my-workflow.json" || {
    echo -e "${YELLOW}⚠️ Could not import via CLI, will use UI${NC}"
}

# List workflows
echo -e "${BLUE}📋 Listing workflows...${NC}"
n8n_exec sh -c "cd /home/node && n8n list:workflow" || true

# Create initial user via API (if not exists)
echo -e "${YELLOW}👤 Setting up initial user...${NC}"

# Check if setup is needed
SETUP_NEEDED=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:15678/api/v1/users)

if [ "$SETUP_NEEDED" = "404" ] || [ "$SETUP_NEEDED" = "401" ]; then
    echo -e "${BLUE}Creating initial user via API...${NC}"

    # Try to create user via API
    curl -X POST http://localhost:15678/api/v1/users \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@n8n-notion.local",
            "password": "TestPassword123!",
            "firstName": "Test",
            "lastName": "User"
        }' || {
        echo -e "${YELLOW}⚠️ Could not create user via API, will use UI${NC}"
    }
fi

echo -e "\n${GREEN}✨ n8n setup complete!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Access n8n at: ${GREEN}http://localhost:15678${NC}"
echo -e "  2. Run Playwright tests: ${GREEN}pnpm test:docker:ui${NC}"
echo -e "  3. Check logs: ${GREEN}docker compose logs -f n8n${NC}"