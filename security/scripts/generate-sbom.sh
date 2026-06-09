#!/bin/bash

###############################################################################
# security/scripts/generate-sbom.sh
#
# SBOM Generation Workflow - Phase 2
#
# Purpose:
#   Discover images from the deployed Docker Compose stack and generate
#   Software Bill of Materials (SBOM) using Syft for each production image.
#
#   Only images whose repository names appear in ALLOWED_IMAGES are scanned.
#   Utility images (adminer, pgadmin, etc.) are intentionally excluded.
#
# Output:
#   - CycloneDX JSON format SBOMs
#   - Human-readable Markdown summaries
#   - All files saved to: security/reports/sbom/
#
# Usage:
#   bash ./security/scripts/generate-sbom.sh
#
# Automation-ready:
#   - Deterministic exit codes: 0 = all succeed, 1 = one or more fail
#   - YYYY-MM-DD timestamps in filenames for future retention policies
#   - Log directory at security/reports/logs/ prepared for future use
#   - Idempotent: re-running on the same day overwrites today's reports
#
# Requirements:
#   - Docker daemon running
#   - Syft installed (auto-installed if missing)
#   - jq for JSON parsing
#   - User has docker access (membership in docker group)
#
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SBOM_OUTPUT_DIR="${PROJECT_ROOT}/security/reports/sbom"
LOG_DIR="${PROJECT_ROOT}/security/reports/logs"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
TIMESTAMP=$(date +%Y-%m-%d)

# ─────────────────────────────────────────────────────────────────────────────
# Allowlist — only these image repository names will be scanned.
# Matching is against the repository portion of the image name (before ":").
# Add or remove entries here to control which images are included in SBOM
# generation. Any image not in this list is silently skipped.
# ─────────────────────────────────────────────────────────────────────────────
ALLOWED_IMAGES=(
    "nginx"
    "pern-store-api-prod"
    "postgres"
)

# ═══════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════

log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $*${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $*${NC}"
}

log_error() {
    echo -e "${RED}✗ $*${NC}" >&2
}

# Create a filename-safe string from an image name
make_filename_safe() {
    local name="$1"
    echo "$name" | sed 's/[^a-zA-Z0-9._-]/_/g'
}

# Check if Syft is installed; auto-install if missing
ensure_syft() {
    if command -v syft &> /dev/null; then
        log_success "Syft is installed"
        syft version 2>/dev/null | head -1 || true
        return 0
    fi

    log_warn "Syft not found, installing..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_info "Installing Syft..."
        curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            log_info "Installing Syft via Homebrew..."
            brew install syft
        else
            log_error "Homebrew not found. Please install Syft manually from https://github.com/anchore/syft"
            return 1
        fi
    else
        log_error "Unsupported OS. Please install Syft manually from https://github.com/anchore/syft"
        return 1
    fi

    if command -v syft &> /dev/null; then
        log_success "Syft installed successfully"
        return 0
    else
        log_error "Syft installation failed"
        return 1
    fi
}

# Check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        log_info "Install jq using: apt-get install jq (Linux) or brew install jq (macOS)"
        return 1
    fi
    return 0
}

# Generate Markdown summary from CycloneDX JSON
generate_markdown_report() {
    local image_name="$1"
    local json_file="$2"
    local safe_name="$3"
    local md_file="${SBOM_OUTPUT_DIR}/${safe_name}-${TIMESTAMP}.md"

    if [[ ! -f "$json_file" ]]; then
        log_error "JSON file not found: $json_file"
        return 1
    fi

    local spec_version total_packages
    spec_version=$(jq -r '.specVersion // "1.5"' "$json_file")
    total_packages=$(jq '.components // [] | length' "$json_file")

    {
        printf "# SBOM Report: %s\n\n" "$image_name"
        printf "**Generated:** %s\n\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        printf "**Container Image:** \\\`%s\\\`\n\n" "$image_name"
        printf "**CycloneDX Spec Version:** %s\n\n" "$spec_version"
        printf "**Total Packages:** %s\n\n" "$total_packages"
        printf "## Packages\n\n"
        printf "| Package Name | Version | Type |\n"
        printf "|--------------|---------|------|\n"

        jq -r '.components[]? | "\(.name)|\(.version)|\(.type)"' "$json_file" | \
            sort -t '|' -k 1 | \
            sed 's/\([^|]*\)|\([^|]*\)|\(.*\)/| `\1` | \2 | \3 |/'

        printf "\n---\n\n"
        printf "_Report generated by security/scripts/generate-sbom.sh_\n"
    } > "$md_file"

    log_success "Generated Markdown report: $md_file"
}

# Generate SBOM for a single Docker image
generate_sbom_for_image() {
    local image_name="$1"
    local safe_name json_file

    safe_name=$(make_filename_safe "$image_name")
    json_file="${SBOM_OUTPUT_DIR}/${safe_name}-${TIMESTAMP}.cdx.json"

    log_info "Scanning image: $image_name"

    if timeout 120 syft "$image_name" -o cyclonedx-json > "$json_file" 2>/dev/null; then
        log_success "Generated SBOM JSON: $json_file"

        if ! generate_markdown_report "$image_name" "$json_file" "$safe_name"; then
            log_error "Failed to generate Markdown report for $image_name"
            return 1
        fi
    else
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            log_error "Timeout scanning $image_name (exceeded 120 seconds)"
        else
            log_error "Failed to generate SBOM for $image_name (exit code: $exit_code)"
        fi
        rm -f "$json_file"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Allowlist check
# Returns 0 (true) if the image repository matches an ALLOWED_IMAGES entry.
# Strips the tag and any registry/org prefix before comparing.
# ─────────────────────────────────────────────────────────────────────────────
is_allowed_image() {
    local image="$1"
    local repo="${image%%:*}"       # strip tag
    local basename="${repo##*/}"    # strip registry/org prefix

    for allowed in "${ALLOWED_IMAGES[@]}"; do
        if [[ "$basename" == "$allowed" || "$repo" == "$allowed" ]]; then
            return 0
        fi
    done
    return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Image Discovery
#
# Strategy (in order):
#   1. Docker Compose config — `docker compose config --images` lists every
#      image declared in the compose file. This is the authoritative source
#      because it reflects the *declared* production stack, not whatever
#      happens to be running at scan time.
#
#   2. Running containers (fallback) — if the compose binary is absent or
#      the compose file cannot be parsed, derive images from `docker ps -a`.
#      The deployed containers define the actual system being secured, so
#      this is an acceptable fallback.
#
# After discovery, duplicates are removed and the allowlist is applied.
# Any image not in ALLOWED_IMAGES is skipped with a log message.
# ─────────────────────────────────────────────────────────────────────────────
discover_images() {
    local raw_images=()
    local source_desc=""

    # ── Option 1: Docker Compose config ──────────────────────────────────────
    if [[ -f "$COMPOSE_FILE" ]] && command -v docker &> /dev/null; then
        local compose_images
        if compose_images=$(docker compose -f "$COMPOSE_FILE" config --images 2>/dev/null); then
            while IFS= read -r img; do
                [[ -z "$img" ]] && continue
                [[ "$img" == "<none>:<none>" || "$img" == "<none>" ]] && continue
                raw_images+=("$img")
            done <<< "$compose_images"
            source_desc="Docker Compose config (${COMPOSE_FILE##*/})"
        fi
    fi

    # ── Option 2: Running containers (fallback) ───────────────────────────────
    if [[ ${#raw_images[@]} -eq 0 ]]; then
        log_warn "Docker Compose metadata unavailable — falling back to running containers"
        local container_images
        if container_images=$(docker ps -a --format "{{.Image}}" 2>/dev/null); then
            while IFS= read -r img; do
                [[ -z "$img" ]] && continue
                [[ "$img" == "<none>:<none>" || "$img" == "<none>" ]] && continue
                raw_images+=("$img")
            done <<< "$container_images"
            source_desc="running containers (docker ps -a)"
        fi
    fi

    if [[ ${#raw_images[@]} -eq 0 ]]; then
        log_warn "No images discovered from any source"
        return 0
    fi

    log_info "Image source: $source_desc"

    # ── Deduplicate and apply allowlist ───────────────────────────────────────
    local seen=()
    local allowed_found=()
    local skipped=()

    for img in "${raw_images[@]}"; do
        # Deduplicate
        local already_seen=false
        for s in "${seen[@]+"${seen[@]}"}"; do
            [[ "$s" == "$img" ]] && already_seen=true && break
        done
        $already_seen && continue
        seen+=("$img")

        if is_allowed_image "$img"; then
            allowed_found+=("$img")
        else
            skipped+=("$img")
        fi
    done

    if [[ ${#skipped[@]} -gt 0 ]]; then
        log_info "Skipped (not in allowlist): ${skipped[*]}"
    fi

    printf '%s\n' "${allowed_found[@]+"${allowed_found[@]}"}"
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Workflow
# ═══════════════════════════════════════════════════════════════════════════

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                 SBOM Generation Workflow - Phase 2                  ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""

    # Verify prerequisites
    log_info "Verifying prerequisites..."
    ensure_syft || exit 1
    check_jq || exit 1

    # Create output and log directories
    mkdir -p "$SBOM_OUTPUT_DIR"
    mkdir -p "$LOG_DIR"
    log_success "Output directory ready: $SBOM_OUTPUT_DIR"
    log_success "Log directory ready:    $LOG_DIR"

    # Display active allowlist
    echo ""
    log_info "Active image allowlist:"
    for img in "${ALLOWED_IMAGES[@]}"; do
        echo "    • $img"
    done
    echo ""

    # Discover images from the deployed stack
    log_info "Discovering images from deployed stack..."
    local images
    images=$(discover_images)

    if [[ -z "$images" ]]; then
        log_warn "No allowed images found — nothing to scan"
        echo ""
        exit 0
    fi

    local image_count
    image_count=$(echo "$images" | wc -l)
    log_success "Images to scan: $image_count"
    echo ""

    # Process each image
    local failed_count=0
    local success_count=0

    while IFS= read -r image_name; do
        [[ -z "$image_name" ]] && continue

        if generate_sbom_for_image "$image_name"; then
            ((++success_count))
        else
            ((++failed_count))
        fi
        echo ""
    done <<< "$images"

    # Summary
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                              Summary                               ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Generated SBOMs: $success_count"

    if [[ $failed_count -gt 0 ]]; then
        log_warn "Failed SBOMs:    $failed_count"
    fi

    echo ""
    log_info "Output directory: $SBOM_OUTPUT_DIR"
    echo ""

    if [[ -d "$SBOM_OUTPUT_DIR" ]]; then
        local file_count
        file_count=$(find "$SBOM_OUTPUT_DIR" -type f | wc -l)
        if [[ $file_count -gt 0 ]]; then
            echo "Generated files:"
            find "$SBOM_OUTPUT_DIR" -type f -printf "  • %f\n" | sort
        fi
    fi

    echo ""

    # Deterministic exit: 0 = all succeed, 1 = any failure
    if [[ $failed_count -gt 0 ]]; then
        exit 1
    fi
    exit 0
}

main "$@"
