#!/bin/bash

###############################################################################
# security/scripts/cleanup-old-reports.sh
#
# Report Retention Cleanup — Phase 3
#
# Purpose:
#   Remove security report files older than RETENTION_DAYS (5) days from:
#     - security/reports/sbom/
#     - security/reports/vulnerabilities/
#     - security/reports/logs/
#
#   The 5-day retention period is intentional due to VM storage constraints
#   (16 GB total disk). SBOMs and vulnerability reports regenerate daily, so
#   keeping a rolling 5-day window provides adequate history without
#   accumulating unbounded disk usage.
#
# Usage:
#   bash ./security/scripts/cleanup-old-reports.sh
#
# Safety:
#   Only deletes files in the three report directories listed above.
#   Never touches scripts, monitoring configs, source code, or .gitkeep files.
#   Never descends into subdirectories (-maxdepth 1).
#   Logs the count of removed files for each category before deletion.
#
###############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

SBOM_DIR="${PROJECT_ROOT}/security/reports/sbom"
VULN_DIR="${PROJECT_ROOT}/security/reports/vulnerabilities"
LOG_DIR="${PROJECT_ROOT}/security/reports/logs"

RETENTION_DAYS=5

log_info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
log_success() { echo -e "${GREEN}✓ $*${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }

# ─────────────────────────────────────────────────────────────────────────────
# purge_directory <dir> <label> <count_var>
#
# Counts files older than RETENTION_DAYS (excluding .gitkeep), deletes them,
# and stores the removed count in the variable named by <count_var>.
#
# Uses -maxdepth 1 so it never descends into subdirectories.
# The count find runs first so we can log "N files will be removed" before
# actually deleting — this gives a readable audit trail in the log.
# ─────────────────────────────────────────────────────────────────────────────

purge_directory() {
    local dir="$1"
    local label="$2"
    local -n _count_ref="$3"   # bash 4.3+ nameref — no subshell needed

    _count_ref=0

    if [[ ! -d "$dir" ]]; then
        log_warn "$label directory not found: $dir — skipping"
        return 0
    fi

    _count_ref=$(
        find "$dir" -maxdepth 1 -type f \
            -mtime "+${RETENTION_DAYS}" \
            ! -name ".gitkeep" \
        | wc -l
    )

    if [[ $_count_ref -gt 0 ]]; then
        find "$dir" -maxdepth 1 -type f \
            -mtime "+${RETENTION_DAYS}" \
            ! -name ".gitkeep" \
            -delete
        log_success "Removed $_count_ref $label file(s) older than ${RETENTION_DAYS} days from ${dir##*/}/"
    else
        log_info "No $label files to remove from ${dir##*/}/ (none older than ${RETENTION_DAYS} days)"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                    Report Cleanup — Phase 3                         ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""

    log_info "Retention policy: ${RETENTION_DAYS} days"
    echo ""
    log_info "Directories in scope:"
    log_info "  $SBOM_DIR"
    log_info "  $VULN_DIR"
    log_info "  $LOG_DIR"
    echo ""

    local sbom_removed=0 vuln_removed=0 log_removed=0

    purge_directory "$SBOM_DIR" "SBOM report"          sbom_removed
    purge_directory "$VULN_DIR" "vulnerability report"  vuln_removed
    purge_directory "$LOG_DIR"  "log"                   log_removed

    local total=$(( sbom_removed + vuln_removed + log_removed ))

    echo ""
    echo "────────────────────────────────────────────────────────────────────"
    log_success "Cleanup complete — $total file(s) removed total"
    log_info "  SBOM reports:          $sbom_removed"
    log_info "  Vulnerability reports: $vuln_removed"
    log_info "  Logs:                  $log_removed"
    echo ""
}

main "$@"
