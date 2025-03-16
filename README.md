# canvas-cli

Simple nodejs-based CLI client for interacting with a Canvas server instance.

## Installation

```bash
$ git clone git@github.com:canvas-ai/canvas-cli.git /path/to/cli
$ cd /path/to/cli
$ npm install
$ sudo ln -s $(pwd)/bin/canvas /usr/local/bin/canvas
$ sudo ln -s $(pwd)/bin/ws /usr/local/bin/ws
$ sudo ln -s $(pwd)/bin/context /usr/local/bin/context
# PR for a proper installer scripts welcome!
```

## Configuration

Configuration is stored in the following locations:

- **Linux**: `$HOME/.canvas/config/canvas-cli.json`
- **macOS**: `$HOME/.canvas/config/canvas-cli.json`
- **Windows**: `%USERPROFILE%\Canvas\config\canvas-cli.json`

You can configure the server URL and authentication token using:

```bash
canvas config set server.url http://localhost:8001/rest/v2
canvas config set auth.token your-auth-token
```

## Authentication

CLI client will automatically prompt for authentication if no token is found in the configuration. You can also explicitly authenticate using:

```bash
canvas login
```

This will start a three-step authentication process:

1. Login with your email and password to create a session
2. Use the session to generate a long-lived API token
3. Store the token in your configuration and logout the session

API token will be used for all subsequent CLI commands.
If you already have a token, you can set it directly:

```bash
canvas login YOUR_TOKEN
```

Or configure it using the config command:

```bash
canvas config set auth.token YOUR_TOKEN
```

### Troubleshooting Authentication

If you encounter authentication issues:

1. Ensure the server is running and accessible
2. Check your credentials are correct
3. Try running with debug enabled: `DEBUG=canvas:* ./bin/canvas login`
4. If you have a token from another source, use it directly with `canvas login YOUR_TOKEN`

## Supported modules

- contexts
- workspaces
- documents

## Supported data abstractions

- files
- notes
- tabs


## Commands

### Canvas

The main CLI for managing the Canvas server, users, and roles.

```bash
# Show server status
canvas server status

# Start/stop/restart the server
canvas server start
canvas server stop
canvas server restart

# Authenticate with the Canvas server
canvas login

# Check server connection
canvas ping

# List all users
canvas users

# List all roles
canvas roles

# Show current configuration
canvas config

# Set configuration value
canvas config set <key> <value>
```

### Workspaces

Manage user workspaces.

```bash
# List all workspaces
ws list

# Create a new workspace
ws create <name> [--description <desc>] [--color <color>] [--type <type>]

# Get workspace details
ws get <id>

# Update workspace properties
ws update <id> [--name <name>] [--description <desc>] [--color <color>] [--type <type>]

# Open a workspace
ws open <id>

# Close a workspace
ws close <id>

# Remove a workspace
ws remove <id>
```

### Contexts

Manage user contexts.

```bash
# List all contexts
context list

# Set the context URL
context set <url>

# Switch to a different context
context switch <id>

# Show current context URL
context url

# Show current context ID
context id

# Show current context path
context path

# Show context bitmaps
context bitmaps

# List all documents in the context
context documents [-f <feature>]

# List all notes in the context
context notes

# Get a specific note
context note get <id/hash>

# Add a new note
context note add <content> [--title <title>] [-t <tag>]

# Add a new tab
context tab add <url> [--title <title>] [--context <context>] [-t <tag>]

# List all tabs in the context
context tab list
```

### Role management

```bash
# List all roles
canvas roles

# Register a new role
canvas roles register /path/to/role/config.json

# Returns role information
canvas roles roleName 

# Returns the dockerfile for the role
canvas roles roleName dockerfile 

# Returns the start command for the role
canvas roles roleName start

# Role control commands
canvas roles roleName stop
canvas roles roleName restart
canvas roles roleName status
```

## Piping Data

You can pipe data to the CLI for various data abstractions(files, notes, tabs etc), assuming the parser can handle it :)

```bash
cat /var/log/syslog | grep -i err | grep nvidia | grep 202503 | context note add --title "nvidia errors"
cat /var/log/syslog | grep -i err | grep nvidia | grep 202503 | context query "any idea what this error is about?"
cat /var/log/syslog | grep -i err | grep nvidia | grep 202503 | context query "do we have any emails related to this?"
```

## Examples

```bash
# Create a new workspace
ws create "My Workspace" --description "My personal workspace" --color "#ff5500"

# Set the context URL to a specific workspace
context set my-workspace://work/project1

# Add a note with tags
context note add "This is a note" --title "My Note" -t important -t work

# Add a tab to a specific context
context tab add https://example.com --title "Example Website" --context "/different/context/url"
```

## Legacy interface doc(tb cleaned-up)

### Workspace tree management

```bash
context # Returns the current context object
context set /context/url
context id
context url
context tree
context tree move /path/1 /path/2 || context tree rename /path/1 2
context tree remove /path/2
context tree copy /path/1 /path/2 --recursive
context tree delete /path/1 # Fails if layer is part of a different path unless --force is used
```

### Context util functions

```bash
context paths
context bitmaps
context layers
context filters
```

### Data management within the context

```bash
context query "Natural language query with within the current context"
context list # Legacy method to return all documents stored for the current context
# Here we've taken data/abstraction/note as an example
context notes # list of notes stored for the current context --filter foo --filter bar --today ..
context notes query "Natural language query for your notes" --filter optionalFilter1 --filter f2
context notes get id/1234 # Returns a JSON document
context notes insert "Note content" --title "Note Title" || context notes ad
context notes copy id/1234 /context/path
context notes move id/1234 /context/path
context notes remove id/1234
context notes remove id/1234 /context/path
context notes remove sha1/hash
context notes delete id/1234
context notes update id/1234 "Optional new body" --tag work --tag !personal --title "newtitle"
context notes get id/1234 --tags # Returns the tags array
context notes get id/1234 --checksums # Returns the checksums array
context notes get id/1234 --versions # Returns the version IDs
context notes get id/1234 --version latest
context notes get id/1234 --version 3
context notes get id/1234 --metadata # Returns the whole metadata array
```

### Data management (global)

```bash
canvas notes list --context /foo --filter bar --filter baz --
```

**Happy interfacing**
