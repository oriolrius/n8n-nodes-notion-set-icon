#!/bin/bash

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Development-only settings (remove for production)
# Warning: This disables TLS certificate verification - only use in development!
export NODE_TLS_REJECT_UNAUTHORIZED=0
export N8N_SECURE_COOKIE=false

# Set n8n configuration
export N8N_CUSTOM_EXTENSIONS=~/.n8n/nodes
export N8N_PORT=5678
export N8N_HOST=localhost

# Enable task runners to avoid deprecation warning
export N8N_RUNNERS_ENABLED=true

# User Management - Create initial owner account
# On first run, n8n will create this user account
export N8N_USER_MANAGEMENT_DISABLED=false
export N8N_AUTH_EXCLUDE_ENDPOINTS=none
export N8N_USER_MANAGEMENT_JWT_SECRET=your-jwt-secret-key-change-this-in-production

# Note: Basic auth is deprecated. On first run, use these credentials at the signup page:
# Email: test@example.com
# Password: The2password.
# After first setup, these env vars are ignored and login uses the created account

# Build the node first if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "Building the custom node..."
    pnpm build
fi

# Start n8n
echo "Starting n8n with custom Notion Set Icon node..."
echo "n8n will be available at: http://localhost:5678"
echo ""
echo "=== AUTHENTICATION ==="
echo "On first run: Sign up with these credentials at http://localhost:5678/setup"
echo "  Email: test@example.com"
echo "  Password: The2password."
echo "After setup: Use http://localhost:5678/signin with the same credentials"
echo ""
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

n8n start