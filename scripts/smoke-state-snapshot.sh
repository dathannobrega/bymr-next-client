#!/usr/bin/env sh
set -eu

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

API_BASE_URL="${BYMR_SMOKE_BASE_URL:-http://localhost:3001}"
API_VERSION="${BYMR_SMOKE_API_VERSION:-v1.5.0-beta}"
PASSWORD="${BYMR_SMOKE_PASSWORD:-Secret123!}"
USERNAME="${BYMR_SMOKE_USERNAME:-smokestate}"
EMAIL="${BYMR_SMOKE_EMAIL:-${USERNAME}@example.com}"

wait_for_server() {
  MAX_ATTEMPTS="${BYMR_SMOKE_WAIT_ATTEMPTS:-45}"
  SLEEP_SECONDS="${BYMR_SMOKE_WAIT_INTERVAL_SECONDS:-1}"
  i=1
  while [ "$i" -le "$MAX_ATTEMPTS" ]; do
    if curl -sS -f "${API_BASE_URL}/connection" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$SLEEP_SECONDS"
    i=$((i + 1))
  done
  return 1
}

print_response() {
  RESPONSE="$1"
  if echo "$RESPONSE" | jq '.' >/dev/null 2>&1; then
    echo "$RESPONSE" | jq '.'
  else
    echo "$RESPONSE"
  fi
}

assert_json() {
  LABEL="$1"
  RESPONSE="$2"
  FILTER="$3"
  if ! echo "$RESPONSE" | jq -e "$FILTER" >/dev/null 2>&1; then
    echo "[smoke-state] ${LABEL} failed"
    print_response "$RESPONSE"
    exit 1
  fi
}

register_user_with_retry() {
  ATTEMPTS="${BYMR_SMOKE_REGISTER_ATTEMPTS:-75}"
  SLEEP_SECONDS="${BYMR_SMOKE_REGISTER_WAIT_SECONDS:-1}"
  i=1
  last_resp='{}'
  while [ "$i" -le "$ATTEMPTS" ]; do
    last_resp="$(
      curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/register" \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"${USERNAME}\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
    )"

    if echo "$last_resp" | jq -e '.user.userid | type=="number"' >/dev/null 2>&1; then
      echo "$last_resp"
      return 0
    fi

    too_many="$(echo "$last_resp" | jq -r '.error // ""' | tr '[:upper:]' '[:lower:]')"
    if echo "$too_many" | grep -q "too many requests"; then
      sleep "$SLEEP_SECONDS"
      i=$((i + 1))
      continue
    fi

    echo "$last_resp"
    return 1
  done

  echo "$last_resp"
  return 1
}

login_user() {
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/getinfo" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
}

echo "[smoke-state] Waiting for API at ${API_BASE_URL}"
if ! wait_for_server; then
  echo "[smoke-state] API did not become ready in time"
  exit 1
fi

echo "[smoke-state] Login ${EMAIL}"
LOGIN_RESP="$(login_user)"
TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-state] Login failed; trying register ${EMAIL}"
  REGISTER_RESP="$(register_user_with_retry)"
  if ! echo "$REGISTER_RESP" | jq -e '.user.userid | type=="number"' >/dev/null 2>&1; then
    echo "[smoke-state] Register failed"
    print_response "$REGISTER_RESP"
    exit 1
  fi

  LOGIN_RESP="$(login_user)"
  TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
fi

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-state] Login failed after register fallback"
  print_response "$LOGIN_RESP"
  exit 1
fi

echo "[smoke-state] Fetching canonical snapshot"
STATE_RESP="$(
  curl -sS "${API_BASE_URL}/api/${API_VERSION}/state?scope=main&baseId=home" \
    -H "Authorization: Bearer ${TOKEN}"
)"
assert_json "State snapshot" "$STATE_RESP" '
  .snapshotVersion == 1 and
  (.base.baseId | type == "string") and
  .base.yardWidth == 20 and
  .base.yardHeight == 14 and
  (.progression.level >= 1) and
  (.progression.baseValue >= 0) and
  (.repair.estimatedDurationSec >= 0) and
  (.repair.repairingCount >= 0) and
  (.repair.damagedCount >= 0) and
  ([.buildings[]? | select(has("fortification")) | (.fortification >= 0)] | all) and
  (.resources.active.r1max >= 0) and
  (.player.userId | type == "number")
'

echo "[smoke-state] Validating structured query errors"
BAD_RESP="$(
  curl -sS "${API_BASE_URL}/api/${API_VERSION}/state?scope=broken" \
    -H "Authorization: Bearer ${TOKEN}"
)"
assert_json "Invalid query handling" "$BAD_RESP" '.code == "INVALID_STATE_QUERY"'

echo "[smoke-state] OK"
