# CLAUDE.md - Project Instructions for n8n-notion-set-icon

## Project Overview
This is an n8n community node package that enables setting custom icons on Notion pages via the Notion API.

## Tech Stack
- **Language**: TypeScript
- **Runtime**: Node.js (>=18.10)
- **Package Manager**: pnpm (10.12.3)
- **Framework**: n8n workflow automation platform
- **Target**: ES2022, CommonJS modules
- **Main Dependencies**: n8n-workflow, form-data

## Project Structure
```
├── credentials/           # Notion API credential definitions
│   └── NotionSetIconApi.credentials.ts
├── nodes/                # n8n node implementations
│   └── NotionSetIcon/
│       └── NotionSetIcon.node.ts
├── dist/                 # Compiled JavaScript output
├── examples/             # Usage examples
├── .github/workflows/    # CI/CD pipelines
├── start-n8n.sh         # Local development script
└── .env.example         # Environment template
```

## Key Commands

### Development
```bash
# Install dependencies (use pnpm only)
pnpm install

# Build the project (TypeScript compilation + gulp build)
pnpm build

# Watch mode for development
pnpm dev

# Start local n8n with custom node
pnpm start
# or
./start-n8n.sh

# Lint the code
pnpm lint

# Fix linting issues
pnpm lintfix

# Format code with Prettier
pnpm format
```

### Release
```bash
# Patch release (1.0.0 -> 1.0.1)
pnpm release

# Minor release (1.0.0 -> 1.1.0)
pnpm release:minor

# Major release (1.0.0 -> 2.0.0)
pnpm release:major
```

## Code Style & Conventions

### TypeScript Configuration
- Strict mode enabled (`strict: true`)
- No implicit any, strict null checks
- ES2022 target with CommonJS modules
- Declaration files generated

### ESLint Rules
- Uses `@typescript-eslint/parser`
- Extends `plugin:n8n-nodes-base/community`
- n8n-specific node development rules enabled
- All n8n-nodes-base rules set to 'warn' level

### File Naming
- TypeScript source: `.ts` extension
- Node files: `{NodeName}.node.ts`
- Credentials: `{CredentialName}.credentials.ts`

### Code Patterns
- Implements `INodeType` interface for nodes
- Implements `ICredentialType` for credentials
- Uses async/await for asynchronous operations
- Error handling with `NodeOperationError`
- Returns `INodeExecutionData[][]` from execute method

### Import Style
```typescript
import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';
```

## Development Workflow

### Local Testing Setup
1. Copy `.env.example` to `.env`
2. Add Notion credentials:
   - `NOTION_TOKEN_V2`: From browser cookies
   - `SPACE_ID`: Notion workspace ID
   - `NOTION_USER_ID`: User ID from Notion
3. Run `pnpm start` to launch n8n locally
4. Access n8n at `http://localhost:5678`

### Making Changes
1. Modify code in `nodes/` or `credentials/`
2. Run `pnpm build` to compile
3. Restart n8n (Ctrl+C and `pnpm start`)
4. Test changes in n8n workflow

### Before Committing
1. Run `pnpm lint` to check for issues
2. Run `pnpm build` to ensure compilation
3. Fix any linting errors with `pnpm lintfix`
4. Format code with `pnpm format`

## CI/CD Pipeline

### GitHub Actions Workflows
- **CI/CD** (`ci.yml`): Runs on push, PR, and release
  - Tests on Node.js 18, 20, 22
  - Runs linting and build
  - Publishes to npm on release/tag

- **Release** (`release.yml`): Automated release workflow

### Automated Checks
1. pnpm install with frozen lockfile
2. ESLint validation
3. TypeScript compilation
4. Build output verification

## Important Notes

### Security Considerations
- Never commit `.env` files with real credentials
- Token V2 is sensitive - handle with care
- Use environment variables for credentials
- TLS verification disabled in development only

### n8n Node Requirements
- Must export class implementing `INodeType`
- Include proper `displayName` and `name`
- Define credentials in `credentials` array
- Specify inputs/outputs with `NodeConnectionType`
- Return data in `INodeExecutionData[][]` format

### Error Handling
- Use `NodeOperationError` for user-facing errors
- Include `itemIndex` for batch processing
- Provide clear error messages
- Handle binary data with `assertBinaryData`

### Binary Data Handling
- Use `this.helpers.assertBinaryData()` for validation
- Convert base64 to Buffer when needed
- Support file uploads via form-data

## Testing Guidelines
- No automated tests currently configured
- Manual testing via local n8n instance
- Test both URL and file upload icon sources
- Verify with different Notion page formats

## Publishing Process
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes
4. Create git tag: `git tag v1.0.x`
5. Push tag: `git push --tags`
6. GitHub Actions will auto-publish to npm

## Common Issues & Solutions

### Build Failures
- Ensure pnpm version 10.12.3
- Check Node.js version >= 18.10
- Run `pnpm install --frozen-lockfile`

### Credential Issues
- Verify token_v2 is current and valid
- Check space_id and user_id match workspace
- Ensure cookies haven't expired

### Development Environment
- Build dist/ folder if missing: `pnpm build`
- Restart n8n after code changes
- Check `~/.n8n/nodes` for custom extensions

## External Resources
- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Nodes Guide](https://docs.n8n.io/integrations/community-nodes/)
- [Notion API Documentation](https://developers.notion.com/)
- [GitHub Repository](https://github.com/oriolrius/n8n-nodes-notion-set-icon)
- [NPM Package](https://www.npmjs.com/package/n8n-nodes-notion-set-icon)