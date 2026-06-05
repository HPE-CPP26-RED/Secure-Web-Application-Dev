#!/usr/bin/env bash
###############################################################################
# harden-ssh.sh — SSH Hardening for Ubuntu 22.04
#
# Security controls applied:
#   - Key-based authentication only (password disabled)
#   - Root login disabled
#   - Max 3 auth attempts
#   - TCP/X11 forwarding disabled
#
# Usage: sudo bash harden-ssh.sh
###############################################################################
set -euo pipefail

SSHD_CONFIG="/etc/ssh/sshd_config"
BACKUP="${SSHD_CONFIG}.bak.$(date +%Y%m%d%H%M%S)"

echo "==> [SSH] Backing up sshd_config to ${BACKUP}"
cp "${SSHD_CONFIG}" "${BACKUP}"

# ── Apply hardening settings ─────────────────────────────────────────────────

apply_setting() {
  local key="$1"
  local value="$2"
  if grep -qE "^\s*#?\s*${key}\b" "${SSHD_CONFIG}"; then
    sed -i "s|^\s*#\?\s*${key}\b.*|${key} ${value}|" "${SSHD_CONFIG}"
  else
    echo "${key} ${value}" >> "${SSHD_CONFIG}"
  fi
  echo "    ${key} = ${value}"
}

echo "==> [SSH] Applying hardened settings..."

apply_setting "PermitRootLogin"        "no"
apply_setting "PasswordAuthentication" "no"
apply_setting "PubkeyAuthentication"   "yes"
apply_setting "MaxAuthTries"           "3"
apply_setting "AllowTcpForwarding"     "no"
apply_setting "X11Forwarding"          "no"
apply_setting "ClientAliveInterval"    "300"
apply_setting "ClientAliveCountMax"    "2"
apply_setting "LoginGraceTime"         "30"
apply_setting "PermitEmptyPasswords"   "no"

# ── Validate and restart ─────────────────────────────────────────────────────

echo "==> [SSH] Validating sshd_config syntax..."
sshd -t

echo "==> [SSH] Restarting SSH daemon..."
# Ubuntu uses 'sshd', Kali/Debian uses 'ssh'
if systemctl list-units --type=service | grep -q "sshd.service"; then
  systemctl restart sshd
else
  systemctl restart ssh
fi

echo "==> [SSH] Hardening complete ✔"
echo ""
echo "    IMPORTANT: Ensure your SSH public key is in ~/.ssh/authorized_keys"
echo "    before disconnecting, or you may lock yourself out!"
