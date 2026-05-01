#!/usr/bin/env bash
# Hospital ERP — post-deploy smoke check.
# Hits a handful of public + authenticated endpoints to confirm a deploy is
# actually healthy. Run after every backend redeploy.
#
# Usage:
#   ./scripts/smoke-check.sh \
#       https://hospital-c3k5.vercel.app \
#       admin password123
#
# Exits non-zero if anything fails. CI-friendly.

set -euo pipefail

BASE="${1:-${HOSPITAL_API:-}}"
USER="${2:-${HOSPITAL_USER:-admin}}"
PASS="${3:-${HOSPITAL_PASS:-}}"

if [[ -z "$BASE" ]]; then
  echo "Usage: $0 <api-base-url> [username] [password]" >&2
  echo "  e.g. $0 https://hospital-c3k5.vercel.app admin password123" >&2
  exit 2
fi

red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

passed=0
failed=0

check() {
  local label="$1"; shift
  local expected="$1"; shift
  local actual
  actual=$(curl -s -o /dev/null -w '%{http_code}' "$@" || echo 000)
  if [[ "$actual" == "$expected" ]]; then
    green "  PASS  ($actual)  $label"
    passed=$((passed + 1))
  else
    red   "  FAIL  ($actual, expected $expected)  $label"
    failed=$((failed + 1))
  fi
}

echo "Smoke-checking $BASE"

# 1. Public probes
check "GET /api/health"        200 "$BASE/api/health"
check "GET /api/ready"         200 "$BASE/api/ready"
check "GET /api/live"          200 "$BASE/api/live"
check "GET /health (alt)"      200 "$BASE/health"

# 2. CORS preflight on a typical write endpoint
check "OPTIONS /api/patients (CORS preflight)" 204 \
  -X OPTIONS \
  -H "Origin: https://hospital-vnyb.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type, authorization" \
  "$BASE/api/patients"

# 3. Login (skip if no password supplied)
TOKEN=""
if [[ -n "$PASS" ]]; then
  echo
  echo "Logging in as $USER ..."
  LOGIN_BODY=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" || true)
  TOKEN=$(printf '%s' "$LOGIN_BODY" | sed -nE 's/.*"token":"([^"]+)".*/\1/p')
  if [[ -z "$TOKEN" ]]; then
    red "  FAIL  login did not return a token"
    echo "    response: $LOGIN_BODY"
    failed=$((failed + 1))
  else
    green "  PASS  /api/auth/login returned a token"
    passed=$((passed + 1))

    # 4. Authenticated probes
    check "GET /api/auth/me (auth)"  200 -H "Authorization: Bearer $TOKEN" "$BASE/api/auth/me"
    check "GET /api/patients (auth)" 200 -H "Authorization: Bearer $TOKEN" "$BASE/api/patients?limit=1"
    check "GET /api/dashboard/stats" 200 -H "Authorization: Bearer $TOKEN" "$BASE/api/dashboard/stats"
    check "GET /api/audit-logs"      200 -H "Authorization: Bearer $TOKEN" "$BASE/api/audit-logs?limit=1"
    check "GET /api/assets (auth)"   200 -H "Authorization: Bearer $TOKEN" "$BASE/api/assets"
  fi
else
  yellow "(skipping authenticated checks: pass username + password as args)"
fi

echo
total=$((passed + failed))
if [[ $failed -gt 0 ]]; then
  red   "FAILED: $failed of $total checks failed"
  exit 1
fi
green "PASSED: all $total checks green"
