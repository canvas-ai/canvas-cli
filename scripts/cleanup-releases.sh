#!/bin/bash
set -e

# Canvas CLI Release Cleanup Script
# Clean up old GitHub releases while keeping the most recent ones

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

highlight() {
    echo -e "${CYAN}$1${NC}"
}

# Show help
show_help() {
    cat << EOF
$(highlight "Canvas CLI Release Cleanup Script")

Clean up old GitHub releases while keeping the most recent ones.

$(highlight "USAGE:")
    $0 [OPTIONS]

$(highlight "OPTIONS:")
    -k, --keep N           Number of releases to keep (default: 5)
    -d, --dry-run          Show what would be deleted without actually deleting
    -a, --all              Delete ALL releases (dangerous!)
    -p, --prerelease-only  Only delete pre-releases (alpha, beta, rc)
    -h, --help             Show this help message

$(highlight "EXAMPLES:")
    # Keep only last 5 releases (default)
    $0

    # Keep only last 3 releases
    $0 --keep 3

    # Show what would be deleted without actually deleting
    $0 --dry-run

    # Keep 10 releases, dry run
    $0 --keep 10 --dry-run

    # Delete only pre-releases, keep all stable releases
    $0 --prerelease-only

    # Delete ALL releases (be very careful!)
    $0 --all --dry-run  # Check first
    $0 --all            # Actually delete

$(highlight "REQUIREMENTS:")
    - GitHub CLI (gh) must be installed and authenticated
    - jq command-line JSON processor

$(highlight "SAFETY:")
    - Always run with --dry-run first to see what would be deleted
    - Pre-releases are identified by containing: alpha, beta, rc, dev
    - The script sorts by creation date (newest first)

EOF
}

# Default values
KEEP_RELEASES=5
DRY_RUN=false
DELETE_ALL=false
PRERELEASE_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -k|--keep)
            KEEP_RELEASES="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -a|--all)
            DELETE_ALL=true
            shift
            ;;
        -p|--prerelease-only)
            PRERELEASE_ONLY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1\nUse --help for usage information."
            ;;
    esac
done

# Validate inputs
if ! [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] || [ "$KEEP_RELEASES" -lt 0 ]; then
    error "Keep releases must be a non-negative number, got: $KEEP_RELEASES"
fi

if [ "$DELETE_ALL" = true ] && [ "$KEEP_RELEASES" -ne 5 ]; then
    warning "Ignoring --keep flag when using --all"
fi

# Check dependencies
log "Checking dependencies..."

if ! command -v gh >/dev/null 2>&1; then
    error "GitHub CLI (gh) is required but not installed. Install from: https://cli.github.com/"
fi

if ! command -v jq >/dev/null 2>&1; then
    error "jq is required but not installed. Install with: sudo apt install jq (Linux) or brew install jq (macOS)"
fi

# Check if authenticated with GitHub
if ! gh auth status >/dev/null 2>&1; then
    error "Not authenticated with GitHub CLI. Run: gh auth login"
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    error "Could not determine repository. Make sure you're in a git repository with a GitHub remote."
fi

log "Repository: $REPO"

# Show configuration
echo ""
highlight "Configuration:"
echo "   Repository: $REPO"
echo "   Keep releases: $KEEP_RELEASES"
echo "   Dry run: $DRY_RUN"
echo "   Delete all: $DELETE_ALL"
echo "   Prerelease only: $PRERELEASE_ONLY"
echo ""

# Confirm dangerous operations
if [ "$DELETE_ALL" = true ] && [ "$DRY_RUN" = false ]; then
    warning "You are about to delete ALL releases!"
    read -p "Type 'DELETE ALL RELEASES' to confirm: " -r
    if [ "$REPLY" != "DELETE ALL RELEASES" ]; then
        log "Operation cancelled."
        exit 0
    fi
fi

# Get all releases
log "Fetching releases..."
TEMP_FILE="/tmp/canvas_releases_$$"

if ! gh release list --limit 100 --json tagName,createdAt,name,isDraft,isPrerelease > "$TEMP_FILE"; then
    error "Failed to fetch releases from GitHub"
fi

# Sort by creation date (newest first)
jq 'sort_by(.createdAt) | reverse' "$TEMP_FILE" > "${TEMP_FILE}_sorted"
mv "${TEMP_FILE}_sorted" "$TEMP_FILE"

TOTAL_RELEASES=$(jq length "$TEMP_FILE")

if [ "$TOTAL_RELEASES" -eq 0 ]; then
    success "No releases found."
    rm -f "$TEMP_FILE"
    exit 0
fi

log "Found $TOTAL_RELEASES total releases"

# Show current releases
echo ""
highlight "Current releases:"
jq -r '.[] | "\(.tagName) - \(.name) (created: \(.createdAt[:10]))"' "$TEMP_FILE"
echo ""

# Determine what to delete
if [ "$DELETE_ALL" = true ]; then
    # Delete all releases
    jq -r '.[].tagName' "$TEMP_FILE" > "${TEMP_FILE}_to_delete"
    OPERATION_DESC="DELETE ALL releases"
elif [ "$PRERELEASE_ONLY" = true ]; then
    # Delete only pre-releases
    jq -r '.[] | select(.isPrerelease == true or (.tagName | test("alpha|beta|rc|dev"; "i"))) | .tagName' "$TEMP_FILE" > "${TEMP_FILE}_to_delete"
    OPERATION_DESC="delete pre-releases only"
else
    # Delete old releases, keep the newest N
    jq -r ".[$KEEP_RELEASES:] | .[].tagName" "$TEMP_FILE" > "${TEMP_FILE}_to_delete"
    OPERATION_DESC="keep last $KEEP_RELEASES releases"
fi

RELEASES_TO_DELETE=$(wc -l < "${TEMP_FILE}_to_delete" | tr -d ' ')

if [ "$RELEASES_TO_DELETE" -eq 0 ]; then
    success "No releases to delete ($OPERATION_DESC)"
    rm -f "$TEMP_FILE" "${TEMP_FILE}_to_delete"
    exit 0
fi

# Show what will be deleted
echo ""
highlight "Releases to delete ($OPERATION_DESC):"
while IFS= read -r tag; do
    if [ -n "$tag" ]; then
        RELEASE_INFO=$(jq -r ".[] | select(.tagName == \"$tag\") | \"\(.name) (\(.createdAt[:10]))\"" "$TEMP_FILE")
        echo "   🗑️  $tag - $RELEASE_INFO"
    fi
done < "${TEMP_FILE}_to_delete"

echo ""
log "Total releases to delete: $RELEASES_TO_DELETE"

if [ "$DRY_RUN" = true ]; then
    warning "DRY RUN: No releases will actually be deleted"
    success "Dry run completed. Use without --dry-run to actually delete releases."
    rm -f "$TEMP_FILE" "${TEMP_FILE}_to_delete"
    exit 0
fi

# Final confirmation for actual deletion
echo ""
warning "This will permanently delete $RELEASES_TO_DELETE releases!"
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Operation cancelled."
    rm -f "$TEMP_FILE" "${TEMP_FILE}_to_delete"
    exit 0
fi

# Delete releases
echo ""
log "Deleting releases..."
DELETED_COUNT=0
FAILED_COUNT=0

while IFS= read -r tag; do
    if [ -n "$tag" ]; then
        echo "   Deleting: $tag"
        if gh release delete "$tag" --yes --cleanup-tag 2>/dev/null; then
            DELETED_COUNT=$((DELETED_COUNT + 1))
            echo "   ✅ Successfully deleted: $tag"
        else
            FAILED_COUNT=$((FAILED_COUNT + 1))
            echo "   ❌ Failed to delete: $tag"
        fi
    fi
done < "${TEMP_FILE}_to_delete"

# Cleanup temp files
rm -f "$TEMP_FILE" "${TEMP_FILE}_to_delete"

# Show summary
echo ""
highlight "Summary:"
echo "   Successfully deleted: $DELETED_COUNT releases"
echo "   Failed to delete: $FAILED_COUNT releases"

if [ "$DELETE_ALL" = false ]; then
    REMAINING=$((TOTAL_RELEASES - DELETED_COUNT))
    echo "   Remaining releases: $REMAINING"
fi

if [ "$FAILED_COUNT" -gt 0 ]; then
    warning "Some releases failed to delete. Check the output above for details."
    exit 1
else
    success "Cleanup completed successfully!"
fi

# Show final state
echo ""
log "Final releases:"
gh release list --limit 10
