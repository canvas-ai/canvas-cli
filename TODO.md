# TODO (till 23.3.2025) 

## Context management API

```
# Module commands
context list
context switch <id>
context set <url>
context create <name> --description <foo> --color <bar>
context destroy <id>

# Getters
context url
context id
context paths
context tree
context workspace

# Document management
context note add "note-content" --title "note-title" --tags "tag1,tag2" --path <optional-path-to-json-or-md-file>
context notes
context tabs
context tab add <url> -t <tag1> -t <tab2>
```

## Workspaces

```
# Simplified API
ws list # Lists all workspaces in index
ws open <id || path> # Initializes a workspace from a path or id
ws enter <id> <optional-path> # Opens the workspace in the current context
ws close <id> # Closes the workspace shutting down its db
ws create <name> --description <foo> --color <bar> --path <optional-workspace-path>
ws remove <id> # Removes the workspace from the index
ws destroy <id> # Removes data from disk
```

## Internalls

- transports/rest.client.js
- transports/ws.client.js

## Canvas

```
# server controls
canvas server start
canvas server stop
canvas server restart
canvas server status
# Connection
canvas ping (/rest/v2/ping)
canvas login (/rest/v2/auth/login)
canvas logout  (/rest/v2/auth/logout)
canvas status   #isConnected (/rest/v2/ping)
                #isAuthenticated (/rest/auth/me)
canvas sessions # Returns all sessions?
```
