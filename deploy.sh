#!/usr/bin/env bash
# Reminder: run "chmod +x deploy.sh" before executing this script.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="${SCRIPT_DIR}/server/.env"
FRONTEND_ENV="${SCRIPT_DIR}/client/.env"

umask 077

fetch_param() {
  local param_path="$1"
  aws ssm get-parameter --name "$param_path" --with-decryption --region ap-south-1 --query "Parameter.Value" --output text \
    || { echo "ERROR: Failed to fetch SSM parameter: $param_path" >&2; exit 1; }
}

cleanup() {
  local exit_code=$?
  set +e
  if [[ -f "$BACKEND_ENV" ]]; then
    shred -u "$BACKEND_ENV" || echo "WARN: Failed to shred backend env file" >&2
  fi
  if [[ -f "$FRONTEND_ENV" ]]; then
    shred -u "$FRONTEND_ENV" || echo "WARN: Failed to shred frontend env file" >&2
  fi
  exit "$exit_code"
}

trap cleanup EXIT

echo "Preparing temporary backend environment file..."
: > "$BACKEND_ENV"

# Single-mapping secrets
printf "POSTGRES_PASSWORD=%s\n" "$(fetch_param "/pernstore/prod/db/password")" >> "$BACKEND_ENV"
printf "JWT_SECRET=%s\n" "$(fetch_param "/pernstore/prod/auth/jwt_secret")" >> "$BACKEND_ENV"
printf "MFA_ENCRYPTION_KEY=%s\n" "$(fetch_param "/pernstore/prod/auth/mfa_key")" >> "$BACKEND_ENV"
printf "RAZORPAY_KEY_SECRET=%s\n" "$(fetch_param "/pernstore/prod/payment/razorpay_secret")" >> "$BACKEND_ENV"

# Consolidated mappings
RAZORPAY_KEY_ID_VALUE="$(fetch_param "/pernstore/prod/payment/razorpay_id")"
printf "RAZORPAY_KEY_ID=%s\n" "$RAZORPAY_KEY_ID_VALUE" >> "$BACKEND_ENV"

GOOGLE_ID_VALUE="$(fetch_param "/pernstore/prod/google/oauth_client_id")"
printf "OAUTH_CLIENT_ID=%s\n" "$GOOGLE_ID_VALUE" >> "$BACKEND_ENV"
printf "CLIENT_ID=%s\n" "$GOOGLE_ID_VALUE" >> "$BACKEND_ENV"

GOOGLE_SECRET_VALUE="$(fetch_param "/pernstore/prod/google/oauth_client_secret")"
printf "OAUTH_CLIENT_SECRET=%s\n" "$GOOGLE_SECRET_VALUE" >> "$BACKEND_ENV"
printf "CLIENT_SECRET=%s\n" "$GOOGLE_SECRET_VALUE" >> "$BACKEND_ENV"

printf "OAUTH_REFRESH_TOKEN=%s\n" "$(fetch_param "/pernstore/prod/google/oauth_refresh_token")" >> "$BACKEND_ENV"
printf "REFRESH_TOKEN=%s\n" "$(fetch_param "/pernstore/prod/smtp/refresh_token")" >> "$BACKEND_ENV"

echo "Preparing temporary frontend environment file..."
: > "$FRONTEND_ENV"

printf "VITE_API_URL=%s\n" "$(fetch_param "/pernstore/prod/config/api_url")" >> "$FRONTEND_ENV"
printf "VITE_RAZORPAY_KEY_ID=%s\n" "$RAZORPAY_KEY_ID_VALUE" >> "$FRONTEND_ENV"
printf "VITE_GOOGLE_CLIENT_ID=%s\n" "$GOOGLE_ID_VALUE" >> "$FRONTEND_ENV"

echo "Building frontend static assets on host..."
pushd "${SCRIPT_DIR}/client" > /dev/null
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build
popd > /dev/null

echo "Starting Docker Compose orchestration..."
docker compose -f docker-compose.yml up -d --build

echo "Deployment complete. Frontend built and containers active."
