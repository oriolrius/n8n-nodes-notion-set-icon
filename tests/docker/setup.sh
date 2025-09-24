#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 N8n Custom Node Docker Test Setup${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Check if we're in the right directory
if [ ! -f "../../package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from tests/docker directory${NC}"
    exit 1
fi

# Step 1: Build the node
echo -e "${YELLOW}📦 Building the custom node...${NC}"
cd ../..
if pnpm build; then
    echo -e "${GREEN}✅ Node built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build node${NC}"
    exit 1
fi

cd tests/docker

# Step 2: Prepare custom node directory for Docker
echo -e "${YELLOW}📁 Preparing custom node for Docker...${NC}"

# Clean up old custom-node directory
rm -rf custom-node
mkdir -p custom-node/node_modules/n8n-nodes-notion-set-icon

# Copy built files
cp -r ../../dist custom-node/node_modules/n8n-nodes-notion-set-icon/
cp ../../package.json custom-node/node_modules/n8n-nodes-notion-set-icon/

# Create a minimal package.json for the custom extensions folder
cat > custom-node/package.json <<EOF
{
  "name": "n8n-custom-extensions",
  "version": "1.0.0",
  "description": "Custom n8n extensions",
  "n8n": {
    "nodes": [
      "node_modules/n8n-nodes-notion-set-icon/dist/nodes/NotionSetIcon/NotionSetIcon.node.js"
    ],
    "credentials": [
      "node_modules/n8n-nodes-notion-set-icon/dist/credentials/NotionSetIconApi.credentials.js"
    ]
  }
}
EOF

echo -e "${GREEN}✅ Custom node prepared${NC}"

# Step 3: Check for .env file
if [ ! -f "../../.env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo -e "${YELLOW}   Creating template .env file...${NC}"

    cat > .env <<EOF
# Notion credentials (required for testing)
NOTION_TOKEN_V2=your_token_here
SPACE_ID=your_space_id_here
NOTION_USER_ID=your_user_id_here
EOF

    echo -e "${YELLOW}   Please update .env with your Notion credentials${NC}"
else
    echo -e "${GREEN}✅ .env file found${NC}"
    # Copy .env to docker directory
    cp ../../.env .
fi

# Step 4: Create test results directory
mkdir -p test-results
echo -e "${GREEN}✅ Test results directory created${NC}"

# Step 5: Make scripts executable
chmod +x validation/validate.js 2>/dev/null || true
chmod +x test-scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✅ Scripts made executable${NC}"

echo -e "\n${GREEN}✨ Setup complete!${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Update .env with your Notion credentials (if needed)"
echo -e "  2. Run: ${GREEN}docker compose build${NC}"
echo -e "  3. Run: ${GREEN}docker compose up -d n8n${NC}"
echo -e "  4. Run: ${GREEN}docker compose run validator${NC}"
echo -e "\nOr simply run: ${GREEN}make test${NC}"