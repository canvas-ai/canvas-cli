#!/bin/bash

# Canvas CLI Installation Script
set -e

echo "🎨 Canvas CLI Installation"
echo "=========================="
echo

# Get the CLI directory (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$CLI_DIR/bin"

# Check if we're in the right directory
if [ ! -d "$BIN_DIR" ]; then
    echo "❌ Error: bin directory not found at $BIN_DIR"
    echo "Please run this script from the Canvas CLI directory or its parent."
    exit 1
fi

echo "📁 CLI Directory: $CLI_DIR"
echo "📂 Bin Directory: $BIN_DIR"
echo

# Create ~/.local/bin if it doesn't exist
LOCAL_BIN="$HOME/.local/bin"
if [ ! -d "$LOCAL_BIN" ]; then
    echo "📂 Creating $LOCAL_BIN directory..."
    mkdir -p "$LOCAL_BIN"
fi

echo "🔗 Creating symlinks for binaries in $BIN_DIR to $LOCAL_BIN..."

# Loop through all files in the bin directory
for SCRIPT_PATH in "$BIN_DIR"/*; do
    if [ -f "$SCRIPT_PATH" ]; then
        SCRIPT_NAME=$(basename "$SCRIPT_PATH")
        SYMLINK_TARGET="$LOCAL_BIN/$SCRIPT_NAME"

        echo "   Processing $SCRIPT_NAME..."

        # Make binary executable
        echo "     🔐 Making $SCRIPT_NAME executable..."
        chmod +x "$SCRIPT_PATH"

        # Create symlink
        echo "     🔗 Creating symlink: $SYMLINK_TARGET -> $SCRIPT_PATH"

        if [ -L "$SYMLINK_TARGET" ] || [ -f "$SYMLINK_TARGET" ]; then
            echo "        Removing existing file/symlink at $SYMLINK_TARGET..."
            rm "$SYMLINK_TARGET"
        fi

        ln -sf "$SCRIPT_PATH" "$SYMLINK_TARGET"
        echo "        ✅ Symlink created for $SCRIPT_NAME."
    else
        echo "   Skipping $SCRIPT_PATH (not a regular file)."
    fi
done


# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
    echo "⚠️  Warning: $LOCAL_BIN is not in your PATH"
    echo "   Add this line to your ~/.bashrc or ~/.zshrc:"
    echo "   export PATH=\"$HOME/.local/bin:\$PATH\""
    echo
    echo "   Or run this command:"
    echo "   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc"
    echo
else
    echo "✅ $LOCAL_BIN is already in your PATH"
fi

# Check for PM2
echo "🔍 Checking for PM2..."
if command -v pm2 >/dev/null 2>&1; then
    echo "✅ PM2 is installed ($(pm2 --version))"
else
    echo "⚠️  PM2 is not installed"
    echo "   Install it for server management: npm install -g pm2"
fi

echo
echo "🎉 Installation complete!"
echo
echo "Test your installation by opening a new terminal or sourcing your shell config (e.g., source ~/.bashrc),"
echo "then try commands like:"
echo "  canvas --version"
echo "  q --help"
echo "  ws list"
echo "  ctx tree"
echo "  canvas server status"
echo
echo "Quick start:"
echo "  canvas server start    # Start local Canvas server"
echo "  canvas ws list         # List workspaces"
echo "  canvas ctx list        # List contexts"
echo
