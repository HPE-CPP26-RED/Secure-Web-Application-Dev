#!/bin/bash

###############################################################################
# security/scripts/security-daily.sh
#
# Security Scan Orchestration — Phase 3
#
# Purpose:
#   Orchestrate the full daily security scanning pipeline:
#     Stage 1 — SBOM generation        (generate-sbom.sh)
#     Stage 2 — Vulnerability scanning  (vulnerability-scan.sh)
#     Stage 3 — Report cleanup          (cleanup-old-reports.sh)
#
#   Writes a timestamped execution log and enforces single-instance locking
#   so that a scheduled run and a manual run can never overlap.
#
# Usage (manual):
#   bash ./security/scripts/security-daily.sh
#
# Usage (cron — do NOT install automatically, see README):
#   0 2 * * * /absolute/path/to/security/scripts/security-daily.sh
#
# Exit codes:
#   0 — all three stages succeeded
#   1 — one or more stages failed (log contains details)
#
# Safety guarantees:
#   • Read-only: never restarts, stops, rebuilds, or pulls Docker images
#   • Only writes to security/reports/ subdirectories
#   • Single-instance via flock on security/.security-scan.lock
#   • Lock is released automatically on any exit (fd close)
#   • Log is written regardless of success or failure
#
###############################################################################

# -u  : treat unset variables as errors
# -o pipefail: propagate pipe failures into PIPESTATUS
# Intentionally NO -e: each stage failure is handled explicitly so later
# stages (especially cleanup) still run and the log is always written.
set -uo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SECURITY_DIR="${PROJECT_ROOT}/security"

SBOM_OUTPUT_DIR="${SECURITY_DIR}/reports/sbom"
VULN_OUTPUT_DIR="${SECURITY_DIR}/reports/vulnerabilities"
LOG_DIR="${SECURITY_DIR}/reports/logs"
LOCK_FILE="${SECURITY_DIR}/.security-scan.lock"

TIMESTAMP=$(date +%Y-%m-%d)
LOG_FILE="${LOG_DIR}/security-${TIMESTAMP}.log"

GENERATE_SBOM_SCRIPT="${SCRIPT_DIR}/generate-sbom.sh"
VULN_SCAN_SCRIPT="${SCRIPT_DIR}/vulnerability-scan.sh"
CLEANUP_SCRIPT="${SCRIPT_DIR}/cleanup-old-reports.sh"

# ─────────────────────────────────────────────────────────────────────────────
# Logging
#
# tee_log: writes a timestamped plain-text entry to both stdout and LOG_FILE.
# Subscript output is streamed via `bash ... | tee -a "$LOG_FILE"` inside
# run_stage, so the full output of each subscript also lands in the log.
# ─────────────────────────────────────────────────────────────────────────────

tee_log() {
    local msg
    msg="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# Stage runner
#
# Executes a subscript, streams its combined stdout+stderr to both the
# terminal and the log file simultaneously, then captures and returns the
# subscript's own exit code.
#
# PIPESTATUS[0] is evaluated immediately after the pipeline — no intervening
# commands — so it reliably reflects the subscript exit code, not tee's.
# ─────────────────────────────────────────────────────────────────────────────

run_stage() {
    local label="$1"
    local script="$2"
    local start_ts end_ts duration exit_code

    tee_log "──────────────────────────────────────────────────────────────────"
    tee_log "STAGE START: $label"

    start_ts=$(date +%s)
    exit_code=0

    bash "$script" 2>&1 | tee -a "$LOG_FILE"
    exit_code=${PIPESTATUS[0]}

    end_ts=$(date +%s)
    duration=$((end_ts - start_ts))

    if [[ $exit_code -eq 0 ]]; then
        tee_log "STAGE OK:   $label — completed in ${duration}s"
    else
        tee_log "STAGE FAIL: $label — failed in ${duration}s (exit code: ${exit_code})"
    fi

    return $exit_code
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

main() {
    # Ensure report and log directories exist before writing the log file
    mkdir -p "$LOG_DIR" "$SBOM_OUTPUT_DIR" "$VULN_OUTPUT_DIR"

    # Create (or truncate) today's log file.
    # Re-running on the same day overwrites that day's log — idempotent.
    : > "$LOG_FILE"

    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║              Security Scan Orchestration — Phase 3                  ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""

    tee_log "=== Security Daily Scan Started ==="
    tee_log "Date:        $TIMESTAMP"
    tee_log "Log file:    $LOG_FILE"
    tee_log "Project:     $PROJECT_ROOT"

    # Verify all subscripts are present before acquiring the lock.
    # A missing script is a configuration error, not a transient failure.
    local missing=0
    for script in "$GENERATE_SBOM_SCRIPT" "$VULN_SCAN_SCRIPT" "$CLEANUP_SCRIPT"; do
        if [[ ! -f "$script" ]]; then
            tee_log "ERROR Missing required script: $script"
            missing=1
        fi
    done
    if [[ $missing -ne 0 ]]; then
        tee_log "ERROR Aborting — required scripts are missing"
        exit 1
    fi

    # ── Concurrency lock ──────────────────────────────────────────────────────
    # Open the lock file on fd 9.  flock -n acquires an exclusive lock
    # non-blocking: returns immediately with exit code 1 if already held.
    # The lock is released automatically when fd 9 closes on any exit.
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
        tee_log "WARN Another security scan is already running. Exiting safely."
        exit 0
    fi

    tee_log "Lock acquired: $LOCK_FILE"

    # ── Stage tracking ────────────────────────────────────────────────────────
    local sbom_result="NOT RUN"
    local vuln_result="NOT RUN"
    local cleanup_result="NOT RUN"
    local overall_failed=0
    local scan_start
    scan_start=$(date +%s)

    # ── Stage 1: SBOM Generation ──────────────────────────────────────────────
    if run_stage "SBOM Generation" "$GENERATE_SBOM_SCRIPT"; then
        sbom_result="SUCCESS"
    else
        sbom_result="FAILED"
        overall_failed=1
        tee_log "WARN SBOM generation failed — vulnerability scan will still run"
    fi

    # ── Stage 2: Vulnerability Scanning ──────────────────────────────────────
    if run_stage "Vulnerability Scanning" "$VULN_SCAN_SCRIPT"; then
        vuln_result="SUCCESS"
    else
        vuln_result="FAILED"
        overall_failed=1
    fi

    # ── Stage 3: Report Cleanup ───────────────────────────────────────────────
    # Cleanup always runs — even if earlier stages fail — so stale reports are
    # never allowed to accumulate due to a transient scan failure.
    if run_stage "Report Cleanup" "$CLEANUP_SCRIPT"; then
        cleanup_result="SUCCESS"
    else
        cleanup_result="FAILED"
        overall_failed=1
    fi

    # ── Execution summary ─────────────────────────────────────────────────────
    local scan_end duration
    scan_end=$(date +%s)
    duration=$((scan_end - scan_start))

    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                              Summary                               ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""

    tee_log "=== Execution Summary ==="
    tee_log "End time:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    tee_log "Duration:    ${duration}s"
    tee_log "SBOM:        $sbom_result"
    tee_log "Vulnscan:    $vuln_result"
    tee_log "Cleanup:     $cleanup_result"

    if [[ $overall_failed -eq 0 ]]; then
        tee_log "Overall:     SUCCESS"
        tee_log "=== Security Daily Scan Completed Successfully ==="
    else
        tee_log "Overall:     FAILED (one or more stages failed)"
        tee_log "=== Security Daily Scan Completed With Errors ==="
    fi

    echo ""
    tee_log "Full log: $LOG_FILE"
    echo ""

    # fd 9 closes here → lock released automatically
    if [[ $overall_failed -ne 0 ]]; then
        exit 1
    fi
    exit 0
}

main "$@"
