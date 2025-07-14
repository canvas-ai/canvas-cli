#!/bin/bash
set -e

# Canvas CLI Release Script
# This script helps with manual releases and testing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if version is provided
if [ -z "$1" ]; then
    error "Usage: $0 <version> [--dry-run]"
fi

VERSION=$1
DRY_RUN=${2:-""}

log "Preparing release for version: $VERSION"

# Validate version format
if [[ ! $VERSION =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9\.-]+)?$ ]]; then
    error "Invalid version format. Use: v1.0.0 or 1.0.0 (with optional pre-release suffix)"
fi

# Add 'v' prefix if not present
if [[ ! $VERSION =~ ^v ]]; then
    VERSION="v$VERSION"
fi

log "Using version: $VERSION"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    warning "You're on branch '$CURRENT_BRANCH', not 'main'"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Aborted"
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    error "You have uncommitted changes. Please commit or stash them first."
fi

# Check if tag already exists
if git tag -l | grep -q "^$VERSION$"; then
    error "Tag $VERSION already exists!"
fi

log "Running pre-release checks..."

# Run linter
log "Running linter..."
npm run lint || error "Linting failed"

# Test Node.js version
log "Testing Node.js version..."
node src/index.js --version || error "Node.js version test failed"

# Build and test development binary
log "Building development binary..."
npm run build:dev || error "Development build failed"

log "Testing development binary..."
./dist/canvas-dev --version || error "Development binary test failed"

success "All pre-release checks passed!"

if [ "$DRY_RUN" = "--dry-run" ]; then
    log "DRY RUN MODE - Would create tag: $VERSION"
    log "To actually create the release, run: $0 $VERSION"
    exit 0
fi

# Create and push tag
log "Creating tag: $VERSION"
git tag "$VERSION"

log "Pushing tag to origin..."
git push origin "$VERSION"

success "Release tag $VERSION created and pushed!"
log "GitHub Actions will now build and create the release automatically."
log "Monitor progress at: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git/\1/')/actions"

# Wait a moment and check GitHub Actions status
log "Checking GitHub Actions status in 10 seconds..."
sleep 10

# Try to open GitHub Actions page (if running in a desktop environment)
REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')
if command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$REPO_URL/actions"
elif command -v open > /dev/null 2>&1; then
    open "$REPO_URL/actions"
else
    log "Visit $REPO_URL/actions to monitor the release build"
fi

success "Release process initiated for $VERSION!"
