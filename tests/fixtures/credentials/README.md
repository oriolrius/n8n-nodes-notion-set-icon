# Credentials Example File

## About credentials.example.json

This file shows the structure of credentials **AUTO-GENERATED** by the test `setup-logout-login.spec.ts`.

## How the test generates this file:

1. Test reads `NOTION_TOKEN_V2`, `SPACE_ID`, and `NOTION_USER_ID` from `.env`
2. Creates this JSON structure with actual values
3. Saves as: `tests/e2e/docker/test-assets/temp-credentials.json`
4. Copies file to Docker container as `/tmp/credentials.json`
5. Imports credentials using: `n8n import:credentials --input=/tmp/credentials.json`

## Usage

This example shows the structure - replace placeholder values with actual credentials from `.env` when using manually.