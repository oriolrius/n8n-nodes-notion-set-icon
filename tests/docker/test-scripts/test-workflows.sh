#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

N8N_URL=${N8N_URL:-"http://n8n:5678"}
WORKFLOWS_DIR="/workflows"

echo -e "${BLUE}🔍 Testing n8n workflows...${NC}"

# Wait for n8n to be ready
echo -e "${BLUE}⏳ Waiting for n8n...${NC}"
for i in {1..30}; do
    if curl -s "${N8N_URL}/healthz" > /dev/null; then
        echo -e "${GREEN}✅ n8n is ready!${NC}"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Check if custom node is loaded
echo -e "${BLUE}🔍 Checking custom node...${NC}"
NODE_CHECK=$(curl -s "${N8N_URL}/api/v1/node-types" | jq -r '.data[] | select(.name | contains("notion-set-icon"))')

if [ -n "$NODE_CHECK" ]; then
    echo -e "${GREEN}✅ Custom node is loaded${NC}"
else
    echo -e "${RED}❌ Custom node not found${NC}"
    exit 1
fi

# Import workflows
echo -e "${BLUE}📥 Importing workflows...${NC}"
for workflow in ${WORKFLOWS_DIR}/*.json; do
    if [ -f "$workflow" ]; then
        filename=$(basename "$workflow")
        echo "Importing $filename..."

        # Read and modify workflow
        workflow_data=$(cat "$workflow" | jq '.name += " - Test"')

        # Import workflow
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$workflow_data" \
            "${N8N_URL}/api/v1/workflows")

        workflow_id=$(echo "$response" | jq -r '.data.id')

        if [ "$workflow_id" != "null" ]; then
            echo -e "${GREEN}✅ Imported: $filename (ID: $workflow_id)${NC}"
        else
            echo -e "${RED}❌ Failed to import: $filename${NC}"
            echo "$response"
        fi
    fi
done

echo -e "${GREEN}✅ Test complete!${NC}"