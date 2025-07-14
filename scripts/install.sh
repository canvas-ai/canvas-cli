#!/bin/bash
set -e

# Canvas CLI Installation Script
# This script downloads and installs the latest Canvas CLI binary

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Configuration
REPO="canvas-ai/canvas-cli"
BINARY_NAME="canvas"

# Prompt for installation location if not set
choose_install_location() {
    if [ -n "$INSTALL_DIR" ]; then
        return # Already set via environment variable
    fi

    log "Choose installation location:"
    echo "  1) Local install (${HOME}/.local/bin) - No sudo required [default]"
    echo "  2) Global install (/usr/local/bin) - Requires sudo"
    echo
    printf "Enter your choice (1-2): "
    read -r choice

    case "$choice" in
        1|"")
            INSTALL_DIR="${HOME}/.local/bin"
            log "Selected: Local installation to $INSTALL_DIR"
            # Ensure local bin directory exists
            mkdir -p "$INSTALL_DIR"
            ;;
        2)
            INSTALL_DIR="/usr/local/bin"
            log "Selected: Global installation to $INSTALL_DIR"
            ;;
        *)
            warning "Invalid choice. Using default: Local installation"
            INSTALL_DIR="${HOME}/.local/bin"
            mkdir -p "$INSTALL_DIR"
            ;;
    esac
}

# Detect platform and architecture
detect_platform() {
    local os
    local arch

    case "$(uname -s)" in
        Linux*)     os="linux" ;;
        Darwin*)    os="macos" ;;
        CYGWIN*|MINGW*|MSYS*) os="windows" ;;
        *)          error "Unsupported operating system: $(uname -s)" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64)   arch="x64" ;;
        arm64|aarch64)  arch="arm64" ;;
        *)              error "Unsupported architecture: $(uname -m)" ;;
    esac

    echo "${os}-${arch}"
}

# Get latest release info from GitHub API
get_latest_release() {
    local api_url="https://api.github.com/repos/${REPO}/releases/latest"

    if command -v curl >/dev/null 2>&1; then
        curl -s "$api_url" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/'
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- "$api_url" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/'
    else
        error "curl or wget is required but not installed"
    fi
}

# Download and install binary
install_canvas() {
    local platform=$(detect_platform)
    local version=$(get_latest_release)
    local extension

    if [[ $platform == *"windows"* ]]; then
        extension="zip"
    else
        extension="tar.gz"
    fi

    local filename="canvas-${version#v}-${platform}.${extension}"
    local download_url="https://github.com/${REPO}/releases/download/${version}/${filename}"
    local temp_dir=$(mktemp -d)

    log "Detected platform: $platform"
    log "Latest version: $version"
    log "Download URL: $download_url"

    # Download
    log "Downloading Canvas CLI..."
    cd "$temp_dir"

    if command -v curl >/dev/null 2>&1; then
        curl -L -o "$filename" "$download_url" || error "Download failed"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "$filename" "$download_url" || error "Download failed"
    else
        error "curl or wget is required but not installed"
    fi

    # Extract
    log "Extracting binary..."
    if [[ $extension == "zip" ]]; then
        unzip -q "$filename" || error "Extraction failed"
        binary_path="canvas-${platform%%-*}-${platform##*-}.exe"
    else
        tar -xzf "$filename" || error "Extraction failed"
        binary_path="canvas-${platform%%-*}-${platform##*-}"
    fi

    # Verify binary exists and is executable
    if [[ ! -f "$binary_path" ]]; then
        error "Binary not found after extraction: $binary_path"
    fi

    # Test the binary
    log "Testing binary..."
    chmod +x "$binary_path"
    ./"$binary_path" --version || error "Binary test failed"

    # Install
    log "Installing to $INSTALL_DIR/$BINARY_NAME..."

    # Check if we can write to install directory
    if [[ ! -w "$INSTALL_DIR" ]]; then
        if command -v sudo >/dev/null 2>&1; then
            sudo mv "$binary_path" "$INSTALL_DIR/$BINARY_NAME" || error "Installation failed"
        else
            error "Cannot write to $INSTALL_DIR and sudo is not available. Try running with: sudo $0"
        fi
    else
        mv "$binary_path" "$INSTALL_DIR/$BINARY_NAME" || error "Installation failed"
    fi

    # Cleanup
    cd /
    rm -rf "$temp_dir"

    success "Canvas CLI $version installed successfully!"
    log "Run 'canvas --help' to get started"
}

# Check dependencies
check_dependencies() {
    local missing_deps=()

    # Check for download tools
    if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
        missing_deps+=("curl or wget")
    fi

    # Check for extraction tools
    if ! command -v tar >/dev/null 2>&1; then
        missing_deps+=("tar")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "Missing required dependencies: ${missing_deps[*]}"
    fi
}

# Show help
show_help() {
    cat << EOF
Canvas CLI Installation Script

Usage: $0 [OPTIONS]

Options:
    --install-dir DIR   Install directory (default: /usr/local/bin)
    --help             Show this help message

Environment Variables:
    INSTALL_DIR        Installation directory

Examples:
    # Install to default location
    $0

    # Install to custom directory
    $0 --install-dir ~/.local/bin

    # Install to custom directory via environment variable
    INSTALL_DIR=~/.local/bin $0

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --install-dir)
            INSTALL_DIR="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Main execution
log "Canvas CLI Installation Script"
log "Repository: https://github.com/$REPO"

check_dependencies
choose_install_location
install_canvas

log "Installation complete!"
log ""

# Show PATH setup information for local installs
if [[ "$INSTALL_DIR" == "$HOME/.local/bin" ]]; then
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        warning "~/.local/bin is not in your PATH"
        log "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
        log ""
        log "Then reload your shell or run: source ~/.bashrc"
        log ""
        log "For now, you can run canvas with the full path:"
        log "  $INSTALL_DIR/canvas --version"
    fi
fi

log "Quick start:"
log "  canvas --version"
log "  canvas --help"
log "  canvas config show"
log ""

