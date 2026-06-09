# Security Automation — Phase 3: Scheduled Scanning & Retention

This directory contains security automation scripts, configuration, and reports for the PERN-Store project.

## Overview

The security automation is implemented in phases:

- **Phase 1**: SBOM generation using Syft
- **Phase 2**: Vulnerability scanning with Grype
- **Phase 3** (Current): Scheduled orchestration and 5-day report retention
- **Phases 4-5**: Additional security hardening and compliance automation

## Directory Structure

```
security/
├── SBOM_README.md            # This file
├── .security-scan.lock       # Runtime lock file (created on first scan)
├── monitoring/               # System monitoring configurations
│   ├── aide.conf            # File integrity monitoring rules
│   └── audit.rules          # Linux audit rules
├── reports/
│   ├── defense-in-depth-report.md  # Architecture & threat model
│   ├── logs/                # Daily execution logs (5-day retention)
│   │   └── security-YYYY-MM-DD.log
│   ├── sbom/                # Software Bill of Materials (5-day retention)
│   │   ├── nginx_1.25-alpine-YYYY-MM-DD.cdx.json
│   │   ├── nginx_1.25-alpine-YYYY-MM-DD.md
│   │   └── ...
│   └── vulnerabilities/     # Vulnerability scan reports (5-day retention)
│       ├── nginx_1.25-alpine-YYYY-MM-DD.json
│       ├── nginx_1.25-alpine-YYYY-MM-DD.md
│       └── ...
└── scripts/
    ├── generate-sbom.sh        # Phase 1 — SBOM generation
    ├── vulnerability-scan.sh   # Phase 2 — vulnerability scanning
    ├── security-daily.sh       # Phase 3 — daily orchestration (this phase)
    └── cleanup-old-reports.sh  # Phase 3 — 5-day retention cleanup
```

---

## Phase 1: SBOM Generation

### Purpose

Generate **Software Bill of Materials (SBOM)** for all containerized components of the production PERN-Store stack. This provides a comprehensive inventory of all software dependencies, versions, and package types across:

- Frontend / reverse proxy (nginx)
- Backend API (Node.js server)
- Database (PostgreSQL)

### Why Only Deployed Images Are Scanned

The script discovers images exclusively from `docker-compose.yml` — the authoritative declaration of the production stack. Only images referenced there and matching the [allowlist](#image-allowlist) are scanned.

**This is intentional.** The local Docker image cache accumulates images over time from builds, pulls, and experiments. Scanning everything on the host would produce noise: SBOMs for intermediate build stages, old versions of images that are no longer deployed, and utility containers that are not part of the running application. None of those represent the actual attack surface of the deployed system.

By anchoring discovery to the compose file, every generated SBOM maps 1:1 to a component that is actually running in production.

### Why Utility Images Are Excluded

The compose file includes `adminer:latest` for local database administration. Adminer is a development convenience tool — it is not part of the production application and is not exposed externally. Including it in security scanning would:

- Inflate vulnerability reports with findings that are not actionable for the deployed system
- Create ambiguity about what "the application" actually is
- Add noise to future automated alerting in Phase 3

The [allowlist](#image-allowlist) makes this exclusion explicit and auditable. Adding an image to the allowlist is a deliberate act, not the default.

### Why Image-Based Scanning (Not Container-Based)

SBOMs are generated from **Docker images** rather than from running containers. The reasons:

1. **Reproducibility** — an image is immutable; a running container may have mutable state overlaid on top. Scanning the image gives a stable, reproducible inventory of installed packages.

2. **Independence from uptime** — image scanning works whether or not the container is currently running. This is required for Phase 3 scheduled execution, where scans may run on a schedule regardless of container state.

3. **Scope clarity** — container-based tools scan the union of the image layers plus any runtime changes. Image-based scanning targets only what was intentionally built into the image, which is the relevant security surface.

4. **Syft compatibility** — Syft's `docker:image-name` source targets the image directly, which produces complete package manifests from all layers.

### Image Allowlist

The allowlist is defined at the top of `generate-sbom.sh`:

```bash
ALLOWED_IMAGES=(
    "nginx"
    "pern-store-api-prod"
    "postgres"
)
```

Matching is performed against the repository portion of the image name (the part before `:`). Any image discovered from the compose file or running containers whose repository does not appear in this list is silently skipped and logged.

**To add an image:** append its repository name to the array.

**To remove an image:** delete its entry from the array. The next run will no longer generate an SBOM for it.

### Expected Scan Set

When run against the current production stack, the script scans:

```
nginx:1.25-alpine        — reverse proxy / static file server
pern-store-api-prod      — Node.js backend API
postgres:16-alpine       — PostgreSQL database
```

Skipped (not in allowlist):
```
adminer:latest           — local DB admin UI, not part of the production stack
```

---

## Phase 3: Future Automation

Phase 3 will introduce scheduled execution of the SBOM and vulnerability scan pipeline. The `generate-sbom.sh` script is already structured for this:

| Property | Detail |
|----------|--------|
| **Exit codes** | `0` = all images scanned successfully; `1` = one or more failures |
| **Timestamps** | Filenames use `YYYY-MM-DD` format for retention policy enforcement |
| **Idempotent** | Re-running on the same day overwrites that day's reports cleanly |
| **Log directory** | `security/reports/logs/` exists and is ready to receive execution logs |

No cron jobs or scheduled tasks have been created yet. Phase 3 will wire up the scheduler and implement log rotation and retention policies using the same script without modification.

---

## Requirements

### Syft

Syft generates SBOMs from container images and filesystems.

**Homepage:** https://github.com/anchore/syft

The `generate-sbom.sh` script will **automatically install Syft** if it is not already present.

To manually install:

**Linux:**
```bash
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
```

**macOS (Homebrew):**
```bash
brew install syft
```

### Additional Tools

- **Docker**: For container access and image inspection
- **jq**: For JSON parsing
  ```bash
  apt-get install jq  # Debian/Ubuntu
  brew install jq     # macOS
  ```

### Docker Access

Ensure your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for group membership to take effect
```

---

## Usage

### Step 1: Generate SBOMs

```bash
# From project root
bash ./security/scripts/generate-sbom.sh
```

The script will:

1. Verify Syft and jq are installed (auto-install Syft if needed)
2. Discover images from `docker-compose.yml` via `docker compose config --images`
3. Apply the allowlist — skip any image not in `ALLOWED_IMAGES`
4. Generate CycloneDX JSON SBOM for each allowed image using Syft
5. Parse the JSON and generate a human-readable Markdown summary
6. Save both formats to `security/reports/sbom/`

### Step 2: Scan for Vulnerabilities

```bash
bash ./security/scripts/vulnerability-scan.sh
```

---

## Output

For each scanned image, two files are generated:

**CycloneDX JSON** (machine-readable, for Grype and CI/CD tools):
```
security/reports/sbom/nginx_1.25-alpine-2026-06-09.cdx.json
security/reports/sbom/pern-store-api-prod-2026-06-09.cdx.json
security/reports/sbom/postgres_16-alpine-2026-06-09.cdx.json
```

**Markdown Summary** (human-readable):
```
security/reports/sbom/nginx_1.25-alpine-2026-06-09.md
security/reports/sbom/pern-store-api-prod-2026-06-09.md
security/reports/sbom/postgres_16-alpine-2026-06-09.md
```

### Markdown Report Example

```markdown
# SBOM Report: nginx:1.25-alpine

**Generated:** 2026-06-09T10:00:00Z

**Container Image:** `nginx:1.25-alpine`

**CycloneDX Spec Version:** 1.5

**Total Packages:** 47

## Packages

| Package Name | Version | Type |
|--------------|---------|------|
| `alpine-base` | 3.18.4 | library |
| `curl` | 8.4.0 | library |
| `openssl` | 3.1.3 | library |
| ... | ... | ... |
```

---

## Phase 2: Vulnerability Scanning with Grype

### Purpose

Scan generated SBOMs for known vulnerabilities using Grype. This phase consumes the CycloneDX SBOMs from Phase 1 and produces vulnerability reports.

### Requirements

#### Grype

**Homepage:** https://github.com/anchore/grype

The `vulnerability-scan.sh` script will **automatically install Grype** if it is not already present.

**Linux:**
```bash
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b ~/.local/bin
```

**macOS (Homebrew):**
```bash
brew install grype
```

### Vulnerability Report Example

```markdown
# Vulnerability Report

Generated: 2026-06-09T12:00:00Z

Source SBOM: nginx_1.25-alpine-2026-06-09.cdx.json

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 8 |
| Low | 5 |
| Negligible | 1 |

## Vulnerabilities

| Package | Installed Version | Severity | CVE |
|---------|-----------------|----------|-----|
| `curl` | 8.4.0 | High | CVE-2024-xxxxx |
| ... | ... | ... | ... |
```

---

## Phase 3: Scheduled Orchestration & Retention

### Scripts

#### security-daily.sh — Daily Orchestration

```bash
bash ./security/scripts/security-daily.sh
```

Runs the full pipeline in sequence:

1. `generate-sbom.sh` — SBOM generation
2. `vulnerability-scan.sh` — vulnerability scanning
3. `cleanup-old-reports.sh` — report retention enforcement

Stages always run in order. If SBOM generation fails, vulnerability scanning still proceeds (it will scan any previously generated SBOMs). Cleanup always runs — stale reports are never allowed to accumulate due to a scan failure.

Returns `0` when all three stages succeed. Returns `1` if any stage fails.

#### cleanup-old-reports.sh — Retention Cleanup

```bash
bash ./security/scripts/cleanup-old-reports.sh
```

Removes files older than **5 days** from:

- `security/reports/sbom/`
- `security/reports/vulnerabilities/`
- `security/reports/logs/`

Logs the count of removed files per directory. Never touches scripts, monitoring configs, source code, or `.gitkeep` marker files.

---

### Manual Usage

All scripts remain independently executable:

```bash
# Generate SBOMs only
bash ./security/scripts/generate-sbom.sh

# Scan SBOMs for vulnerabilities only
bash ./security/scripts/vulnerability-scan.sh

# Run the full pipeline (SBOM + scan + cleanup)
bash ./security/scripts/security-daily.sh

# Run retention cleanup only
bash ./security/scripts/cleanup-old-reports.sh
```

---

### Automated Usage (Cron)

**Do not install cron entries automatically.** Install manually when ready to schedule.

To schedule the daily scan at 02:00 AM, add this entry to the crontab of the user with Docker access:

```bash
crontab -e
```

```cron
0 2 * * * /absolute/path/to/security/scripts/security-daily.sh
```

For example, if the project is at `/home/kamath/e-commerce/PERN-Store`:

```cron
0 2 * * * /home/kamath/e-commerce/PERN-Store/security/scripts/security-daily.sh
```

The script uses absolute paths internally, so it runs correctly from any working directory.

---

### Concurrency Protection

`security-daily.sh` acquires an exclusive lock using `flock` on:

```
security/.security-scan.lock
```

If a scan is already running (scheduled or manual), any subsequent invocation exits immediately with:

```
Another security scan is already running. Exiting safely.
```

The lock is released automatically when the script exits — including on `SIGTERM`, `SIGKILL`, or any error exit — because the lock is tied to a file descriptor, not a PID file that requires manual cleanup.

This prevents a cron-triggered run from overlapping with a concurrent manual run, and vice versa.

---

### Execution Log Format

Each run writes `security/reports/logs/security-YYYY-MM-DD.log`.

Re-running on the same day overwrites that day's log (idempotent). Example log structure:

```
[2026-06-09T02:00:01Z] === Security Daily Scan Started ===
[2026-06-09T02:00:01Z] Date:        2026-06-09
[2026-06-09T02:00:01Z] Log file:    .../security/reports/logs/security-2026-06-09.log
[2026-06-09T02:00:01Z] Lock acquired: .../security/.security-scan.lock
[2026-06-09T02:00:01Z] STAGE START: SBOM Generation
... (generate-sbom.sh output) ...
[2026-06-09T02:01:15Z] STAGE OK:   SBOM Generation — completed in 74s
[2026-06-09T02:01:15Z] STAGE START: Vulnerability Scanning
... (vulnerability-scan.sh output) ...
[2026-06-09T02:05:42Z] STAGE OK:   Vulnerability Scanning — completed in 267s
[2026-06-09T02:05:42Z] STAGE START: Report Cleanup
... (cleanup-old-reports.sh output) ...
[2026-06-09T02:05:43Z] STAGE OK:   Report Cleanup — completed in 1s
[2026-06-09T02:05:43Z] === Execution Summary ===
[2026-06-09T02:05:43Z] End time:    2026-06-09T02:05:43Z
[2026-06-09T02:05:43Z] Duration:    342s
[2026-06-09T02:05:43Z] SBOM:        SUCCESS
[2026-06-09T02:05:43Z] Vulnscan:    SUCCESS
[2026-06-09T02:05:43Z] Cleanup:     SUCCESS
[2026-06-09T02:05:43Z] Overall:     SUCCESS
```

---

### Retention Policy

Security reports and logs older than **5 days** are automatically removed on each daily run.

The 5-day window is intentional: the VM has 16 GB total disk capacity, and SBOMs + vulnerability reports for three images generate approximately 30–50 MB per day. A 5-day window retains enough history for review without risk of disk exhaustion.

| Directory | Retention |
|-----------|-----------|
| `security/reports/sbom/` | 5 days |
| `security/reports/vulnerabilities/` | 5 days |
| `security/reports/logs/` | 5 days |

---

### Safety Guarantees

The security scanning pipeline is **strictly read-only** with respect to the running application.

| Guarantee | Detail |
|-----------|--------|
| Containers never restarted | No `docker restart`, `docker compose restart`, or `docker compose up` |
| Containers never stopped | No `docker stop` or `docker compose down` |
| Images never rebuilt | No `docker build` |
| Images never pulled | No `docker pull` |
| Application traffic never interrupted | Nginx and API containers are not touched |
| Database never modified | No writes to PostgreSQL |
| Docker networking unchanged | No network creation or removal |
| Write scope limited | Only `security/reports/` subdirectories and the lock file |

The scripts only call:

- `docker compose config --images` — reads compose file metadata
- `syft <image>` — reads image layers, produces SBOM
- `grype sbom:<file>` — reads SBOM file, queries vulnerability database
- `find ... -delete` — removes old report files from `security/reports/`

---

## Security Constraints

The following are **not modified** by any script in this directory:

- Application source code (`server/`, `client/`)
- Dockerfiles
- `docker-compose.yml` and `docker-compose.dev.yml`
- nginx configuration (`server/config/nginx.conf`)
- Database schema and migrations
- CI/CD pipelines
- System monitoring rules (`aide.conf`, `audit.rules`)

---

## Support & Documentation

- **Syft Docs**: https://github.com/anchore/syft
- **Grype Docs**: https://github.com/anchore/grype
- **CycloneDX Spec**: https://cyclonedx.org/
- **Project Defense-in-Depth Report**: `security/reports/defense-in-depth-report.md`

---

**Last Updated:** 2026-06-09
**Phase:** 3 (Scheduled Orchestration & Retention)
**Status:** Active Development
