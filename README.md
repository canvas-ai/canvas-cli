# canvas-cli

## Installation

```bash
$ git clone git@github.com:canvas-ai/canvas-cli.git /path/to/cli
$ cd /path/to/cli
$ yarn install
$ ln -s src/context-query.js /path/to/a/path/in/PATH/q # :)
$ ln -s src/context.js /path/to/a/path/in/PATH/context # :)
$ ln -s src/canvas.js /path/to/a/path/in/PATH/canvas # :)
# PR for a proper installer scripts welcome!
```

## Supported modules

- services
- roles

## Supported data abstractions

- files
- notes
- tabs

## Runtime

```bash
# Client 
context connect optionalSessionName
context disconnect
context status
# Functionally equivalent canvas iface
canvas connect optionalSessionName
canvas disconnect
canvas status
# Server runtime controls (assuming docker or pm2)
canvas server start
canvas server stop
canvas server restart
canvas server status
canvas server attach # should we _really_ implement docker attache / exec functions?
```

## Context/context tree management

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

## Context util functions

```bash
context paths
context bitmaps
context layers
context filters
```

## Data management within the context

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

## Data management (global)

```bash
canvas notes list --context /foo --filter bar --filter baz --
```

## Session management

```bash
context sessions # Returns a list of sessions
context sessions connect sessName # Selects the chosen session
context sessions create sessName /optiona/base/url
context sessions delete sessName
# Functionally equivalent
canvas sessions
canvas sessions connect sessName # Selects the chosen session
canvas sessions create sessName /optiona/base/url
canvas sessions delete sessName
```

## Role management

```bash
canvas roles
canvas roles register /path/to/role
canvas roles roleName # Returns role information
canvas roles roleName dockerfile 
canvas roles roleName start
canvas roles roleName stop
canvas roles roleName restart
canvas roles roleName status
```
