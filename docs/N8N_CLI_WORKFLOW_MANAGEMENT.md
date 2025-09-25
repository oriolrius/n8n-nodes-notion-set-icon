# n8n CLI Workflow Management Guide

## Overview
This guide documents how to use the n8n CLI for exporting, importing, and testing workflows and credentials.

## Prerequisites
- n8n CLI installed and configured
- Access to n8n instance
- Valid workflow and credential IDs

## Workflow Operations

### 1. Export Workflow
Export a workflow to a JSON file for backup or transfer:

```bash
n8n export:workflow --id=WPNuBFi52Nb4w2Ur --output=/tmp/workflow.json
```

**Parameters:**
- `--id`: The workflow ID to export
- `--output`: Path where the JSON file will be saved

### 2. Export Credentials
Export credentials in decrypted format:

```bash
n8n export:credentials --decrypted --id=RGQWg0agSiVFi2dc --output=/tmp/credentials.json
```

**Parameters:**
- `--decrypted`: Export credentials in plain text (handle with care!)
- `--id`: The credential ID to export
- `--output`: Path where the credentials JSON will be saved

**⚠️ Security Warning:** Decrypted credentials contain sensitive information. Never commit these files to version control.

### 3. Import Workflow
Import a workflow from a JSON file:

```bash
n8n import:workflow --input=/tmp/workflow.json
```

**Parameters:**
- `--input`: Path to the workflow JSON file

### 4. Import Credentials
Import credentials from a JSON file:

```bash
n8n import:credentials --input=/tmp/credentials.json
```

**Parameters:**
- `--input`: Path to the credentials JSON file

### 5. Execute Workflow
Run a workflow directly from the CLI:

```bash
n8n execute --id WPNuBFi52Nb4w2Ur
```

**Parameters:**
- `--id`: The workflow ID to execute

## Complete Workflow Migration Example

Here's a complete example of exporting, importing, and testing a workflow:

```bash
# Step 1: Export workflow and credentials from source
n8n export:workflow --id=WPNuBFi52Nb4w2Ur --output=/tmp/workflow.json
n8n export:credentials --decrypted --id=RGQWg0agSiVFi2dc --output=/tmp/credentials.json

# Step 2: Import into target instance
n8n import:workflow --input=/tmp/workflow.json
n8n import:credentials --input=/tmp/credentials.json

# Step 3: Test the imported workflow
n8n execute --id WPNuBFi52Nb4w2Ur

# Step 4: Clean up temporary files (optional but recommended)
rm /tmp/workflow.json
rm /tmp/credentials.json
```

## Additional CLI Commands

### List Workflows
```bash
n8n list:workflow
```

### Get Workflow Info
```bash
n8n info:workflow --id=WPNuBFi52Nb4w2Ur
```

### Activate/Deactivate Workflow
```bash
# Activate
n8n update:workflow --id=WPNuBFi52Nb4w2Ur --active=true

# Deactivate
n8n update:workflow --id=WPNuBFi52Nb4w2Ur --active=false
```

## Best Practices

1. **Backup Strategy**: Regularly export critical workflows and credentials
2. **Security**: Always delete temporary credential files after use
3. **Version Control**: Store workflow JSONs (without credentials) in git
4. **Testing**: Always test imported workflows in a development environment first
5. **Documentation**: Document workflow IDs and their purposes

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you have write permissions for output paths
2. **Workflow Not Found**: Verify the workflow ID exists
3. **Import Fails**: Check JSON file integrity and compatibility
4. **Execution Errors**: Verify all required credentials are imported

### Debug Mode
Run commands with verbose output:
```bash
n8n execute --id WPNuBFi52Nb4w2Ur --verbose
```

## Environment Variables

Set these for easier CLI usage:
```bash
export N8N_HOST=http://localhost:5678
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=user
export N8N_BASIC_AUTH_PASSWORD=password
```

## Security Considerations

- Never share decrypted credential files
- Use secure file permissions: `chmod 600 /tmp/credentials.json`
- Delete temporary files immediately after use
- Consider using encrypted storage for backups
- Rotate credentials regularly

## References

- [n8n CLI Documentation](https://docs.n8n.io/api/cli-commands/)
- [n8n Workflow Management](https://docs.n8n.io/workflows/)
- [n8n Security Best Practices](https://docs.n8n.io/hosting/security/)