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
USERNAME="${BYMR_SMOKE_USERNAME:-smokemaproom}"
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

echo "[smoke-maproom] Waiting for API at ${API_BASE_URL}"
if ! wait_for_server; then
  echo "[smoke-maproom] API did not become ready in time"
  exit 1
fi

echo "[smoke-maproom] Login ${EMAIL}"
LOGIN_RESP="$(login_user)"
TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-maproom] Login failed; trying register ${EMAIL}"
  REGISTER_RESP="$(register_user_with_retry)"
  if ! echo "$REGISTER_RESP" | jq -e '.user.userid | type=="number"' >/dev/null 2>&1; then
    echo "[smoke-maproom] Register failed"
    print_response "$REGISTER_RESP"
    exit 1
  fi

  LOGIN_RESP="$(login_user)"
  TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
fi

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-maproom] Login failed after register fallback"
  print_response "$LOGIN_RESP"
  exit 1
fi

echo "[smoke-maproom] Fetching initworldmap"
INIT_RESP="$(
  curl -sS "${API_BASE_URL}/worldmapv3/initworldmap" \
    -H "Authorization: Bearer ${TOKEN}"
)"
echo "$INIT_RESP" | jq -e '.error == 0 and (.celldata | type=="array") and (.celldata | length >= 1)' >/dev/null
X="$(echo "$INIT_RESP" | jq -r '.celldata[0].x')"
Y="$(echo "$INIT_RESP" | jq -r '.celldata[0].y')"
BID="$(echo "$INIT_RESP" | jq -r '.celldata[0].bid')"

GET_X="$((X > 5 ? X - 5 : 0))"
GET_Y="$((Y > 5 ? Y - 5 : 0))"

echo "[smoke-maproom] Fetching getcells around (${GET_X}, ${GET_Y})"
CELLS_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/worldmapv3/getcells" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{\"x\":${GET_X},\"y\":${GET_Y},\"width\":10,\"height\":10}"
)"
echo "$CELLS_RESP" | jq -e '.error == 0 and .width == 10 and .height == 10 and (.celldata | type=="array")' >/dev/null

echo "[smoke-maproom] Relocating base"
RELOCATE_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/worldmapv3/relocate" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{}'
)"
echo "$RELOCATE_RESP" | jq -e '.error == 0 and (.coords | type=="array") and (.coords | length == 2)' >/dev/null

BOOKMARKS_JSON="$(
  jq -nc \
    --arg bid "${BID}" \
    --arg name "Home ${X},${Y}" \
    --argjson x "${X}" \
    --argjson y "${Y}" \
    '[{id:("bid-" + $bid), name:$name, x:$x, y:$y, bid:$bid}]'
)"

echo "[smoke-maproom] Saving bookmarks"
SAVE_BOOKMARKS_BODY="$(
  jq -nc --arg bookmarks "${BOOKMARKS_JSON}" '{bookmarks:$bookmarks}'
)"
SAVE_BOOKMARKS_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/savebookmarks" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${SAVE_BOOKMARKS_BODY}"
)"
echo "$SAVE_BOOKMARKS_RESP" | jq -e '.error == 0' >/dev/null

echo "[smoke-maproom] takeoverCell should reject invalid takeover on own base"
TAKEOVER_BODY="$(
  jq -nc --arg baseid "${BID}" --arg shiny "1" '{baseid:$baseid, shiny:$shiny}'
)"
TAKEOVER_FILE="$(mktemp)"
TAKEOVER_STATUS="$(
  curl -sS -o "${TAKEOVER_FILE}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}/worldmapv2/takeoverCell" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${TAKEOVER_BODY}"
)"
if [ "${TAKEOVER_STATUS}" -eq 200 ]; then
  if jq -e '.error == 0' "${TAKEOVER_FILE}" >/dev/null 2>&1; then
    echo "[smoke-maproom] takeoverCell unexpectedly succeeded on own base"
    cat "${TAKEOVER_FILE}" | jq '.'
    rm -f "${TAKEOVER_FILE}"
    exit 1
  fi
fi
rm -f "${TAKEOVER_FILE}"

echo "[smoke-maproom] transferassets should reject invalid self-transfer"
TRANSFER_BODY="$(
  jq -nc --arg frombaseid "${BID}" --arg tobaseid "${BID}" --arg monsters '[[],[]]' \
    '{frombaseid:$frombaseid,tobaseid:$tobaseid,monsters:$monsters}'
)"
TRANSFER_FILE="$(mktemp)"
TRANSFER_STATUS="$(
  curl -sS -o "${TRANSFER_FILE}" -w '%{http_code}' \
    -X POST "${API_BASE_URL}/worldmapv2/transferassets" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${TRANSFER_BODY}"
)"
if [ "${TRANSFER_STATUS}" -eq 200 ]; then
  if jq -e '.error == 0' "${TRANSFER_FILE}" >/dev/null 2>&1; then
    echo "[smoke-maproom] transferassets unexpectedly succeeded for self-transfer"
    cat "${TRANSFER_FILE}" | jq '.'
    rm -f "${TRANSFER_FILE}"
    exit 1
  fi
fi
rm -f "${TRANSFER_FILE}"

echo "[smoke-maproom] OK"
