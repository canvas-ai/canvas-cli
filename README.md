# Canvas CLI

A command-line interface for managing Canvas workspaces, contexts, and documents.

## Installation

### Local Development

#### Quick Install (Recommended)
```bash
# Run the installation script
./scripts/install.sh
```

#### Manual Install
```bash
# Make the binary executable
chmod +x bin/canvas

# Create symlink to your local bin directory
ln -sf /home/idnc_sk/Code/Canvas/canvas-server/src/ui/cli/bin/canvas ~/.local/bin/canvas

# Ensure ~/.local/bin is in your PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install PM2 for server management (optional)
npm install -g pm2
```

### Global Installation
```bash
# Install dependencies
npm install

# Link globally
npm link
```

## Usage

```bash
# Show help
canvas --help

# List workspaces
canvas workspace list
canvas ws list

# List contexts
canvas context list
canvas ctx list

# Create a context
canvas context create universe://work/project --name "My Project"

# Show current configuration
canvas config show

# Set server URL
canvas config set server.url http://localhost:8001/rest/v2
```

## Commands

### Workspace Management
- `canvas workspace list` - List all workspaces
- `canvas workspace show <id>` - Show workspace details
- `canvas workspace create <name>` - Create new workspace
- `canvas workspace update <id>` - Update workspace
- `canvas workspace delete <id> --force` - Delete workspace

### Context Management
- `canvas context list` - List all contexts
- `canvas context list --workspace <id>` - Filter contexts by workspace
- `canvas context show <id>` - Show context details
- `canvas context create <url>` - Create new context
- `canvas context use <id>` - Set current context
- `canvas context current` - Show current context
- `canvas context tree` - Show context tree

### Document Management
- `canvas document list` - List documents in current context
- `canvas note add --title "Title" < content.txt` - Add note from stdin
- `canvas file add ./script.sh --title "Script"` - Add file
- `canvas todo add --title "Task" --due "2024-12-31"` - Add todo

### Authentication
- `canvas auth status` - Show authentication status
- `canvas auth login` - Login to Canvas server
- `canvas auth tokens` - List API tokens

### Configuration
- `canvas config show` - Show current configuration
- `canvas config set <key> <value>` - Set configuration value
- `canvas config get <key>` - Get configuration value

### Server Management (Local)
- `canvas server start` - Start Canvas server locally with PM2
- `canvas server stop` - Stop Canvas server
- `canvas server restart` - Restart Canvas server
- `canvas server status` - Show server status (local + remote)
- `canvas server logs` - Show server logs

## Architecture

- **Workspaces**: Isolated LMDB databases, each user has "universe" as home
- **Contexts**: Views/filters on top of workspaces with `workspace://path` URLs
- **Documents**: Can be accessed via both contexts and workspaces

## Server Management

The CLI includes built-in server management for local development using PM2:

### Features
- **Start/Stop/Restart**: Full lifecycle management of Canvas server
- **Status Monitoring**: Shows both PM2 process status and API connectivity
- **Log Streaming**: Real-time log viewing with configurable line count
- **Auto-restart**: PM2 handles automatic restarts on crashes
- **Environment Variables**: Supports admin user auto-generation from env.js

### Requirements
- PM2 must be installed globally: `npm install -g pm2`
- Canvas server code must be available locally
- Server management only works for local instances
- Remote servers should be managed by their hosting platform

### Server Setup

The CLI can manage a local Canvas server, but requires the server code to be available. You have several options:

#### Option 1: Environment Variable (Recommended for development)
```bash
export CANVAS_SERVER_ROOT=/path/to/your/canvas-server
canvas server start
```

#### Option 2: Clone Server as Submodule (Standalone CLI)
```bash
# Clone Canvas server into ./server directory
git clone https://github.com/canvas-ai/canvas-server ./server
cd ./server && npm run update-submodules
npm install

# Now you can manage the server
canvas server start
```

#### Option 3: Standalone Server Installation
```bash
# Clone Canvas server separately
git clone https://github.com/canvas-ai/canvas-server
cd canvas-server && npm install

# Set environment variable
export CANVAS_SERVER_ROOT=$(pwd)
canvas server start
```

### Admin User Generation
When starting the server locally, Canvas will automatically generate admin credentials if not set:
- Check the server logs for generated admin email/password
- Use environment variables to set custom admin credentials:
  ```bash
  export CANVAS_ADMIN_EMAIL="admin@example.com"
  export CANVAS_ADMIN_PASSWORD="your-secure-password"
  canvas server start
  ```

## Configuration

Configuration is stored in `~/.canvas/config/canvas-cli.json`:

```json
{
  "server": {
    "url": "http://localhost:8001/rest/v2",
    "auth": {
      "type": "token",
      "token": "canvas-server-token"
    }
  },
  "session": {
    "context": {
      "id": "canvas-cli.machine-id",
      "clientArray": ["client/app/canvas-cli", "..."]
    }
  }
}
```

## Examples

```bash
# Start local Canvas server
canvas server start

# Check server status
canvas server status

# List all workspaces
canvas ws list

# Create a new context
canvas ctx create work://project/feature-123 --name "Feature 123"

# Add a note from stdin
echo "Meeting notes from today" | canvas note add --title "Daily Standup"

# Add a file
canvas file add ./deploy.sh --title "Deployment Script"

# List contexts in universe workspace
canvas ctx list --workspace universe

# Show context tree
canvas ctx tree --workspace universe

# View server logs
canvas server logs --lines 100
```

## Global Options

- `-h, --help` - Show help
- `-v, --version` - Show version
- `-c, --context` - Set context for command
- `-w, --workspace` - Set workspace for command
- `-f, --format` - Output format (table, json, csv)
- `-r, --raw` - Raw JSON output
- `-d, --debug` - Enable debug output

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
