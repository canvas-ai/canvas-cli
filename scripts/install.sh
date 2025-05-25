#!/bin/bash

# Canvas CLI Installation Script
set -e

echo "🎨 Canvas CLI Installation"
echo "=========================="
echo

# Get the CLI directory (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
CANVAS_BINARY="$CLI_DIR/bin/canvas"

# Check if we're in the right directory
if [ ! -f "$CANVAS_BINARY" ]; then
    echo "❌ Error: canvas binary not found at $CANVAS_BINARY"
    echo "Please run this script from the Canvas CLI directory"
    exit 1
fi

echo "📁 CLI Directory: $CLI_DIR"
echo "🔧 Binary: $CANVAS_BINARY"
echo

# Make binary executable
echo "🔐 Making binary executable..."
chmod +x "$CANVAS_BINARY"

# Create ~/.local/bin if it doesn't exist
LOCAL_BIN="$HOME/.local/bin"
if [ ! -d "$LOCAL_BIN" ]; then
    echo "📂 Creating $LOCAL_BIN directory..."
    mkdir -p "$LOCAL_BIN"
fi

# Create symlink
SYMLINK_TARGET="$LOCAL_BIN/canvas"
echo "🔗 Creating symlink: $SYMLINK_TARGET -> $CANVAS_BINARY"

if [ -L "$SYMLINK_TARGET" ]; then
    echo "   Removing existing symlink..."
    rm "$SYMLINK_TARGET"
fi

ln -sf "$CANVAS_BINARY" "$SYMLINK_TARGET"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
    echo "⚠️  Warning: $LOCAL_BIN is not in your PATH"
    echo "   Add this line to your ~/.bashrc or ~/.zshrc:"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo
    echo "   Or run this command:"
    echo "   echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
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
echo "Test your installation:"
echo "  canvas --version"
echo "  canvas --help"
echo "  canvas server status"
echo
echo "Quick start:"
echo "  canvas server start    # Start local Canvas server"
echo "  canvas ws list         # List workspaces"
echo "  canvas ctx list        # List contexts"
echo
