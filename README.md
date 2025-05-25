# Canvas CLI

A comprehensive command-line interface for managing Canvas workspaces, contexts, and documents.

## Installation

```bash
npm install -g canvas-cli
```

## Configuration

The CLI stores configuration in `~/.canvas/config/canvas-cli.json` (or `%USERPROFILE%\Canvas\config\canvas-cli.json` on Windows).

### Initial Setup

1. Set the Canvas server URL:
```bash
canvas config set server.url http://localhost:8001/rest/v2
```

2. Authenticate with the server:
```bash
# Using username/password
canvas auth login your-username --password your-password

# Or set an API token directly
canvas auth set-token canvas-your-token-here
```

3. Verify connection:
```bash
canvas auth status
```

## Commands

### Workspaces

```bash
# List all workspaces
canvas workspace list

# Create a new workspace
canvas workspace create "My Project" --description "Project workspace"

# Show workspace details
canvas workspace show workspace-id

# Set current workspace
canvas workspace use workspace-id

# Show current workspace
canvas workspace current

# Update workspace
canvas workspace update workspace-id --name "New Name"

# Delete workspace
canvas workspace delete workspace-id --force
```

### Contexts

```bash
# List contexts in current workspace
canvas context list

# Create a new context
canvas context create /work/project --name "My Project"

# Show context details
canvas context show context-id

# Set current context
canvas context use context-id

# Show current context
canvas context current

# Show context tree
canvas context tree

# Update context
canvas context update context-id --name "New Name"

# Delete context
canvas context delete context-id --force
```

### Documents

The CLI supports multiple document schemas: `note`, `file`, `todo`, `email`, `tab`.

```bash
# List documents in current context
canvas document list

# List documents by schema
canvas note list
canvas todo list
canvas file list

# Add documents
canvas note add --title "Meeting Notes" < notes.txt
canvas file add ./script.sh --title "Deploy Script"
canvas todo add --title "Fix Bug" --priority high --due "2024-01-15"
canvas email add --subject "Important" --from "user@example.com"
canvas tab add --title "Documentation" --url "https://docs.example.com"

# Show document details
canvas document show document-id

# Update document
canvas document update document-id --title "New Title"

# Search documents
canvas document search "keyword"

# Delete document
canvas document delete document-id --force
```

### Authentication

```bash
# Login with username/password
canvas auth login username --password password

# Create API token
canvas auth create-token "CLI Access" --save

# Set API token manually
canvas auth set-token canvas-your-token

# Show authentication status
canvas auth status

# List API tokens
canvas auth tokens

# Delete API token
canvas auth delete-token token-id --force

# Logout
canvas auth logout
```

### Configuration

```bash
# Show all configuration
canvas config show

# Show specific configuration key
canvas config get server.url

# Set configuration value
canvas config set server.url http://localhost:8001/rest/v2

# List all configuration keys
canvas config list

# Edit configuration file
canvas config edit

# Validate configuration
canvas config validate

# Reset to defaults
canvas config reset --force
```

## Global Options

- `-h, --help` - Show help
- `-v, --version` - Show version
- `-c, --context` - Set context for command
- `-w, --workspace` - Set workspace for command
- `-f, --format` - Output format (table, json, csv)
- `-r, --raw` - Raw JSON output
- `-d, --debug` - Enable debug output

## Examples

### Piping Data

```bash
# Add note from stdin
cat meeting-notes.txt | canvas note add --title "Team Meeting $(date)"

# Add file content
canvas file add ./config.json --title "App Configuration"

# Add log analysis
grep ERROR /var/log/app.log | canvas note add --title "Error Analysis $(date)"
```

### Working with Different Schemas

```bash
# Create a todo with due date
canvas todo add --title "Review PR" --priority high --due "2024-01-20"

# Add email record
canvas email add --subject "Project Update" --from "manager@company.com" --to "team@company.com"

# Save browser tab
canvas tab add --title "API Documentation" --url "https://api.example.com/docs"
```

### Batch Operations

```bash
# List all todos in current context
canvas todo list --format json | jq '.[] | select(.completed == false)'

# Export all notes as CSV
canvas note list --format csv > notes.csv
```

## Configuration Keys

Common configuration keys:

- `server.url` - Canvas server URL
- `server.auth.token` - API token
- `server.auth.type` - Auth type (token/jwt)
- `session.workspace` - Current workspace
- `session.context.id` - Current context
- `connectors.ollama.host` - Ollama server URL
- `connectors.ollama.model` - Default Ollama model

## Environment Variables

- `CANVAS_USER_HOME` - Override user home directory
- `SERVER_MODE` - Set to 'server' for server mode
- `SERVER_HOME` - Server home directory (when SERVER_MODE=server)
- `DEBUG` - Enable debug logging (e.g., `DEBUG=canvas:*`)

## Troubleshooting

### Connection Issues

```bash
# Check authentication status
canvas auth status

# Validate configuration
canvas config validate

# Test server connection
canvas config get server.url
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=canvas:* canvas workspace list

# Or use the debug flag
canvas workspace list --debug
```

### Configuration Issues

```bash
# Show configuration file location
canvas config path

# Reset configuration
canvas config reset --force

# Edit configuration manually
canvas config edit
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Debugging

```bash
DEBUG=canvas:* npm start
```
