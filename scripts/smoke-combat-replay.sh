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
USERNAME="${BYMR_SMOKE_USERNAME:-smokecombat}"
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
    echo "[smoke-combat] ${LABEL} failed"
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

echo "[smoke-combat] Waiting for API at ${API_BASE_URL}"
if ! wait_for_server; then
  echo "[smoke-combat] API did not become ready in time"
  exit 1
fi

echo "[smoke-combat] Login ${EMAIL}"
LOGIN_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/getinfo" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
)"
TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-combat] Login failed; trying register ${EMAIL}"
  REGISTER_RESP="$(register_user_with_retry)"
  if ! echo "$REGISTER_RESP" | jq -e '.user.userid | type=="number"' >/dev/null 2>&1; then
    echo "[smoke-combat] Register did not create user"
    print_response "$REGISTER_RESP"
    exit 1
  fi

  LOGIN_RESP="$(
    curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/getinfo" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
  )"
  TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
fi

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-combat] Login failed after register fallback"
  print_response "$LOGIN_RESP"
  exit 1
fi

echo "[smoke-combat] Fetching own maproom context"
INIT_RESP="$(
  curl -sS "${API_BASE_URL}/worldmapv3/initworldmap" \
    -H "Authorization: Bearer ${TOKEN}"
)"
assert_json "Init worldmap" "$INIT_RESP" '.error == 0 and (.celldata | type=="array") and (.celldata | length >= 1)'

HOME_BASE_ID="$(echo "$INIT_RESP" | jq -r '.celldata[0].bid | tostring')"
HOME_X="$(echo "$INIT_RESP" | jq -r '.celldata[0].x')"
HOME_Y="$(echo "$INIT_RESP" | jq -r '.celldata[0].y')"
SCAN_X=$((HOME_X > 10 ? HOME_X - 10 : 0))
SCAN_Y=$((HOME_Y > 10 ? HOME_Y - 10 : 0))

CELLS_BODY="$(
  jq -nc --argjson x "${SCAN_X}" --argjson y "${SCAN_Y}" '{x:$x,y:$y,width:20,height:20}'
)"
CELLS_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/worldmapv3/getcells" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${CELLS_BODY}"
)"
assert_json "Getcells" "$CELLS_RESP" '.error == 0 and (.celldata | type=="array")'

TARGET_BASE_ID="$(
  echo "$CELLS_RESP" | jq -r --arg homeBid "${HOME_BASE_ID}" '
    .celldata
    | map(select((.bid | tostring) != $homeBid))
    | .[0].bid // empty
    | tostring
  '
)"

if [ -z "${TARGET_BASE_ID}" ] || [ "${TARGET_BASE_ID}" = "null" ]; then
  TARGET_X=$((HOME_X < 799 ? HOME_X + 1 : HOME_X - 1))
  TARGET_Y=$((HOME_Y < 799 ? HOME_Y + 1 : HOME_Y - 1))
  TARGET_BASE_ID="$(printf "%03d%03d" "${TARGET_X}" "${TARGET_Y}")"
fi

if [ "${TARGET_BASE_ID}" = "${HOME_BASE_ID}" ]; then
  echo "[smoke-combat] Failed to resolve non-home target base"
  print_response "$CELLS_RESP"
  exit 1
fi

IDEMP_KEY="combat-smoke-$(date +%s)-$(( $$ % 1000 ))"

echo "[smoke-combat] Starting authoritative combat replay"
START_BODY="$(
  jq -nc \
    --arg targetBaseId "${TARGET_BASE_ID}" \
    --arg idempotencyKey "${IDEMP_KEY}" \
    '{targetBaseId:$targetBaseId,durationSec:8,tickMs:120,idempotencyKey:$idempotencyKey}'
)"
START_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/combat/start" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${START_BODY}"
)"
assert_json "Combat start" "$START_RESP" '.replayId | type=="string"'
REPLAY_ID="$(echo "$START_RESP" | jq -r '.replayId')"

echo "[smoke-combat] Verifying idempotency replay response"
START_RESP_2="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/combat/start" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${START_BODY}"
)"
assert_json "Combat start idempotent" "$START_RESP_2" '.replayId | type=="string"'
REPLAY_ID_2="$(echo "$START_RESP_2" | jq -r '.replayId')"
if [ "${REPLAY_ID}" != "${REPLAY_ID_2}" ]; then
  echo "[smoke-combat] Idempotency mismatch: ${REPLAY_ID} != ${REPLAY_ID_2}"
  exit 1
fi

echo "[smoke-combat] Streaming replay SSE"
STREAM_FILE="$(mktemp)"
curl -sS --max-time 20 \
  "${API_BASE_URL}/api/${API_VERSION}/combat/replay/${REPLAY_ID}?speed=fast" \
  -H 'Accept: text/event-stream' \
  -H "Authorization: Bearer ${TOKEN}" >"${STREAM_FILE}"

if ! grep -q "^event: ready" "${STREAM_FILE}"; then
  echo "[smoke-combat] Missing ready event"
  cat "${STREAM_FILE}"
  rm -f "${STREAM_FILE}"
  exit 1
fi

if ! grep -q "^event: frame" "${STREAM_FILE}"; then
  echo "[smoke-combat] Missing frame event"
  cat "${STREAM_FILE}"
  rm -f "${STREAM_FILE}"
  exit 1
fi

if ! grep -q "^event: result" "${STREAM_FILE}"; then
  echo "[smoke-combat] Missing result event"
  cat "${STREAM_FILE}"
  rm -f "${STREAM_FILE}"
  exit 1
fi

rm -f "${STREAM_FILE}"
echo "[smoke-combat] OK"
