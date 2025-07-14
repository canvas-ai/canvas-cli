#!/bin/bash
set -e

# Canvas CLI Installation Script
# Simple local installation with verification

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Configuration
REPO="canvas-ai/canvas-cli"
INSTALL_DIR="$HOME/.local/bin"
BINARY_NAME="canvas"

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
    local tag_name

    if command -v curl >/dev/null 2>&1; then
        tag_name=$(curl -s "$api_url" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    elif command -v wget >/dev/null 2>&1; then
        tag_name=$(wget -qO- "$api_url" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    else
        error "curl or wget is required but not installed"
    fi

    if [[ -z "$tag_name" ]]; then
        error "Failed to get latest release information from GitHub"
    fi

    echo "$tag_name"
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

# Download and install binary
install_canvas() {
    local platform=$(detect_platform)
    local version=$(get_latest_release)
    local extension="tar.gz"
    local filename="canvas-${version#v}-${platform}.${extension}"
    local download_url="https://github.com/${REPO}/releases/download/${version}/${filename}"
    local temp_dir="$HOME/.tmp-canvas-install-$$"

    log "Detected platform: $platform"
    log "Latest version: $version"
    log "Installing to: $INSTALL_DIR"

    # Create install and temp directories
    mkdir -p "$INSTALL_DIR" || error "Failed to create directory: $INSTALL_DIR"
    mkdir -p "$temp_dir" || error "Failed to create temp directory: $temp_dir"

    # Download
    log "Downloading Canvas CLI..."
    cd "$temp_dir"

    if command -v curl >/dev/null 2>&1; then
        if ! curl -fL -o "$filename" "$download_url"; then
            error "Download failed from: $download_url"
        fi
    elif command -v wget >/dev/null 2>&1; then
        if ! wget -O "$filename" "$download_url"; then
            error "Download failed from: $download_url"
        fi
    fi

    # Verify download
    if [[ ! -f "$filename" ]] || [[ ! -s "$filename" ]]; then
        error "Downloaded file is missing or empty: $filename"
    fi

    # Extract
    log "Extracting binary..."
    if ! tar -xzf "$filename"; then
        error "Failed to extract: $filename"
    fi

    # Find the binary (handle different naming patterns)
    local binary_path=""
    for candidate in "canvas-${platform%%-*}-${platform##*-}" "canvas-${platform}" "canvas"; do
        if [[ -f "$candidate" ]]; then
            binary_path="$candidate"
            break
        fi
    done

    if [[ -z "$binary_path" ]] || [[ ! -f "$binary_path" ]]; then
        error "Binary not found after extraction. Expected one of: canvas-${platform%%-*}-${platform##*-}, canvas-${platform}, canvas"
    fi

    # Test the binary
    log "Testing binary..."
    chmod +x "$binary_path"
    if ! ./"$binary_path" --version >/dev/null 2>&1; then
        error "Binary test failed - the downloaded binary is not working"
    fi

    # Install
    log "Installing binary..."
    if ! mv "$binary_path" "$INSTALL_DIR/$BINARY_NAME"; then
        error "Failed to install binary to: $INSTALL_DIR/$BINARY_NAME"
    fi

    # Verify installation
    if [[ ! -f "$INSTALL_DIR/$BINARY_NAME" ]]; then
        error "Installation verification failed - binary not found at: $INSTALL_DIR/$BINARY_NAME"
    fi

    if [[ ! -x "$INSTALL_DIR/$BINARY_NAME" ]]; then
        error "Installation verification failed - binary is not executable"
    fi

    # Cleanup
    cd /
    rm -rf "$temp_dir"

    # Final test
    log "Verifying installation..."
    local installed_version
    if installed_version=$("$INSTALL_DIR/$BINARY_NAME" --version 2>/dev/null); then
        success "Canvas CLI installed successfully!"
        log "Installed version: $installed_version"
    else
        error "Installation verification failed - cannot run installed binary"
    fi
}

# Show usage help
show_help() {
    cat << EOF
Canvas CLI Installation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message

EXAMPLES:
    # Install Canvas CLI locally
    $0

    # Install via curl
    curl -sSL https://raw.githubusercontent.com/canvas-ai/canvas-cli/main/scripts/install.sh | bash

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
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
log "Installing to: $INSTALL_DIR"

# Check system requirements
check_dependencies

# Install Canvas CLI
install_canvas

# Show PATH setup information if needed
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo
    warning "~/.local/bin is not in your PATH"
    log "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    log ""
    log "Then reload your shell or run: source ~/.bashrc"
    log ""
    log "For now, you can run canvas with the full path:"
    log "  $INSTALL_DIR/canvas --version"
else
    echo
    log "Canvas CLI is ready to use!"
fi

echo
log "Quick start:"
log "  canvas --version"
log "  canvas --help"
log "  canvas config show"

