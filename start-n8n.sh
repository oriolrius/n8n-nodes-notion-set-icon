#!/bin/bash

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)
export NODE_TLS_REJECT_UNAUTHORIZED=0
export N8N_SECURE_COOKIE=false

# Set n8n configuration
export N8N_CUSTOM_EXTENSIONS=~/.n8n/nodes
export N8N_PORT=5678
export N8N_HOST=localhost

# Build the node first if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "Building the custom node..."
    pnpm build
fi

# Start n8n
echo "Starting n8n with custom Notion Set Icon node..."
echo "n8n will be available at: http://localhost:5678"
echo "Environment variables loaded:"
echo "- NOTION_TOKEN_V2: ${NOTION_TOKEN_V2:0:20}..."
echo "- SPACE_ID: $SPACE_ID"
echo "- NOTION_USER_ID: $NOTION_USER_ID"
echo ""
echo "Development workflow:"
echo "1. Make changes to the node code"
echo "2. Run 'pnpm build' to rebuild"
echo "3. Restart n8n (Ctrl+C and run this script again)"
echo ""

npx n8n start