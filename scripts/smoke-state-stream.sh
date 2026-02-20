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
DEFAULT_STREAM_USER_SUFFIX="$(date +%s | cut -c 6-10)"
USERNAME="${BYMR_SMOKE_USERNAME:-smkstr${DEFAULT_STREAM_USER_SUFFIX}}"
EMAIL="${BYMR_SMOKE_EMAIL:-${USERNAME}@example.com}"
STREAM_LOG="$(mktemp)"
STREAM_PID=""
START_SEQ="${BYMR_SMOKE_STREAM_START_SEQ:-$((DEFAULT_STREAM_USER_SUFFIX * 1000))}"

cleanup() {
  if [ -n "${STREAM_PID}" ]; then
    kill "${STREAM_PID}" >/dev/null 2>&1 || true
    wait "${STREAM_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${STREAM_LOG}"
}
trap cleanup EXIT

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

wait_for_pattern() {
  PATTERN="$1"
  ATTEMPTS="${2:-20}"
  i=1
  while [ "$i" -le "$ATTEMPTS" ]; do
    if grep -q "$PATTERN" "${STREAM_LOG}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

echo "[smoke-stream] Waiting for API at ${API_BASE_URL}"
if ! wait_for_server; then
  echo "[smoke-stream] API did not become ready in time"
  exit 1
fi

echo "[smoke-stream] Login ${EMAIL}"
LOGIN_RESP="$(login_user)"
TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-stream] Login failed; trying register ${EMAIL}"
  REGISTER_RESP="$(register_user_with_retry)"
  if ! echo "$REGISTER_RESP" | jq -e '.user.userid | type=="number"' >/dev/null 2>&1; then
    echo "[smoke-stream] Register failed"
    print_response "$REGISTER_RESP"
    exit 1
  fi

  LOGIN_RESP="$(login_user)"
  TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
fi

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-stream] Login failed after register fallback"
  print_response "$LOGIN_RESP"
  exit 1
fi

echo "[smoke-stream] Opening SSE stream"
curl -sS -N "${API_BASE_URL}/api/${API_VERSION}/stream?scope=main&baseId=home" \
  -H "Authorization: Bearer ${TOKEN}" \
  >"${STREAM_LOG}" 2>/dev/null &
STREAM_PID="$!"

if ! wait_for_pattern "event: ready" 25; then
  echo "[smoke-stream] Missing ready event"
  cat "${STREAM_LOG}"
  exit 1
fi

if ! wait_for_pattern "event: snapshot" 25; then
  echo "[smoke-stream] Missing snapshot event"
  cat "${STREAM_LOG}"
  exit 1
fi

echo "[smoke-stream] Triggering /cmd to verify pushed delta"
COORDS="2,2 4,2 6,2 8,2 10,2 2,5 4,5 6,5 8,5 10,5 2,8 4,8 6,8 8,8 10,8"
CMD_OK="0"
SEQ="${START_SEQ}"
for pair in ${COORDS}; do
  X="$(echo "${pair}" | cut -d',' -f1)"
  Y="$(echo "${pair}" | cut -d',' -f2)"
  CMD_RESP="$(
    curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/cmd" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer ${TOKEN}" \
      -d "{\"op\":\"PlaceBuilding\",\"args\":{\"buildingType\":\"hq\",\"x\":${X},\"y\":${Y}},\"seq\":${SEQ},\"idempotencyKey\":\"smoke-stream-${USERNAME}-${SEQ}-${X}-${Y}\"}"
  )"

  if echo "${CMD_RESP}" | jq -e '.ok == true' >/dev/null 2>&1; then
    CMD_OK="1"
    break
  fi
  SEQ=$((SEQ + 1))
done

if [ "${CMD_OK}" != "1" ]; then
  echo "[smoke-stream] Failed to execute PlaceBuilding in all fallback coords"
  echo "${CMD_RESP}" | jq '.'
  exit 1
fi

if ! wait_for_pattern "event: delta" 25; then
  echo "[smoke-stream] Missing delta event after /cmd"
  cat "${STREAM_LOG}"
  exit 1
fi

echo "[smoke-stream] OK"
