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
DEFAULT_CMD_SUFFIX="$(date +%s | cut -c 6-10)"
USERNAME="${BYMR_SMOKE_CMD_USER:-smkcmd${DEFAULT_CMD_SUFFIX}}"
EMAIL="${BYMR_SMOKE_CMD_EMAIL:-${USERNAME}@example.com}"
START_SEQ="${BYMR_SMOKE_CMD_START_SEQ:-$((DEFAULT_CMD_SUFFIX * 1000))}"

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
    echo "[smoke-cmd] ${LABEL} failed"
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

post_cmd() {
  PAYLOAD="$1"
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/cmd" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${PAYLOAD}"
}

echo "[smoke-cmd] Waiting for API at ${API_BASE_URL}"
if ! wait_for_server; then
  echo "[smoke-cmd] API did not become ready in time"
  exit 1
fi

echo "[smoke-cmd] Login ${EMAIL}"
LOGIN_RESP="$(login_user)"
TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-cmd] Login failed; trying register ${EMAIL}"
  REGISTER_RESP="$(register_user_with_retry)"
  if ! echo "$REGISTER_RESP" | jq -e '.user.userid | type=="number"' >/dev/null 2>&1; then
    echo "[smoke-cmd] Register failed"
    print_response "$REGISTER_RESP"
    exit 1
  fi

  LOGIN_RESP="$(login_user)"
  TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
fi

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "[smoke-cmd] Login failed after register fallback"
  print_response "$LOGIN_RESP"
  exit 1
fi

SEQ="${START_SEQ}"
COORDS="2,2 4,2 6,2 8,2 10,2 2,5 4,5 6,5 8,5 10,5 2,8 4,8 6,8 8,8 10,8"
SUCCESS_PAYLOAD=""
SUCCESS_RESP=""
CMD_OK="0"

echo "[smoke-cmd] Validating baseline success + idempotency"
for pair in ${COORDS}; do
  X="$(echo "${pair}" | cut -d',' -f1)"
  Y="$(echo "${pair}" | cut -d',' -f2)"
  IDEMPOTENCY_KEY="smoke-cmd-ok-${USERNAME}-${SEQ}-${X}-${Y}"
  CANDIDATE_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "${IDEMPOTENCY_KEY}" \
      --argjson seq "${SEQ}" \
      --argjson x "${X}" \
      --argjson y "${Y}" \
      '{op:"PlaceBuilding",args:{buildingType:"hq",x:$x,y:$y},seq:$seq,idempotencyKey:$idempotencyKey}'
  )"

  CANDIDATE_RESP="$(post_cmd "${CANDIDATE_PAYLOAD}")"
  if echo "${CANDIDATE_RESP}" | jq -e '.ok == true' >/dev/null 2>&1; then
    SUCCESS_PAYLOAD="${CANDIDATE_PAYLOAD}"
    SUCCESS_RESP="${CANDIDATE_RESP}"
    CMD_OK="1"
    break
  fi

  SEQ=$((SEQ + 1))
done

if [ "${CMD_OK}" != "1" ]; then
  echo "[smoke-cmd] Could not execute a successful PlaceBuilding command"
  print_response "${CANDIDATE_RESP}"
  exit 1
fi

assert_json "Baseline success" "${SUCCESS_RESP}" '.ok == true and (.seq | type=="number") and (.delta | type=="array" and length >= 1)'
SUCCESS_SEQ="$(echo "${SUCCESS_RESP}" | jq -r '.seq')"
SUCCESS_DELTA="$(echo "${SUCCESS_RESP}" | jq -c '.delta')"

REPLAY_RESP="$(post_cmd "${SUCCESS_PAYLOAD}")"
assert_json "Idempotency replay envelope" "${REPLAY_RESP}" ".ok == true and .seq == ${SUCCESS_SEQ}"
REPLAY_DELTA="$(echo "${REPLAY_RESP}" | jq -c '.delta')"
if [ "${REPLAY_DELTA}" != "${SUCCESS_DELTA}" ]; then
  echo "[smoke-cmd] Idempotency replay delta mismatch"
  echo "expected=${SUCCESS_DELTA}"
  echo "actual=${REPLAY_DELTA}"
  exit 1
fi

echo "[smoke-cmd] Validating SEQ_OUT_OF_ORDER"
OUT_OF_ORDER_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-seq-oop-${USERNAME}-${SUCCESS_SEQ}" \
    --argjson seq "${SUCCESS_SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"hq",x:12,y:10},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
OUT_OF_ORDER_RESP="$(post_cmd "${OUT_OF_ORDER_PAYLOAD}")"
assert_json "SEQ_OUT_OF_ORDER" "${OUT_OF_ORDER_RESP}" '.code == "SEQ_OUT_OF_ORDER" and (.traceId | type=="string" and length > 10)'

echo "[smoke-cmd] Validating INVALID_ENVELOPE"
INVALID_ENVELOPE_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/cmd" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"op":"PlaceBuilding","args":{"buildingType":"hq","x":1,"y":1},"idempotencyKey":"missing-seq-field"}'
)"
assert_json "INVALID_ENVELOPE" "${INVALID_ENVELOPE_RESP}" '.code == "INVALID_ENVELOPE"'

SEQ=$((SUCCESS_SEQ + 1))
echo "[smoke-cmd] Validating INVALID_ARGS"
INVALID_ARGS_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-invalid-args-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"hq",x:-1,y:0},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
INVALID_ARGS_RESP="$(post_cmd "${INVALID_ARGS_PAYLOAD}")"
assert_json "INVALID_ARGS" "${INVALID_ARGS_RESP}" '.code == "INVALID_ARGS"'

SEQ=$((SEQ + 1))
echo "[smoke-cmd] Validating INVALID_BUILDING_TYPE"
INVALID_TYPE_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-invalid-type-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"not-a-building",x:1,y:1},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
INVALID_TYPE_RESP="$(post_cmd "${INVALID_TYPE_PAYLOAD}")"
assert_json "INVALID_BUILDING_TYPE" "${INVALID_TYPE_RESP}" '.code == "INVALID_BUILDING_TYPE"'

SEQ=$((SEQ + 1))
NONCE_VALUE="smoke-cmd-nonce-${USERNAME}-${SEQ}"
echo "[smoke-cmd] Validating ANTI_REPLAY nonce"
NONCE_FIRST_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-nonce-first-${USERNAME}-${SEQ}" \
    --arg nonce "${NONCE_VALUE}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"not-a-building",x:1,y:1},seq:$seq,idempotencyKey:$idempotencyKey,nonce:$nonce}'
)"
NONCE_FIRST_RESP="$(post_cmd "${NONCE_FIRST_PAYLOAD}")"
assert_json "Nonce first request" "${NONCE_FIRST_RESP}" '.code == "INVALID_BUILDING_TYPE"'

SEQ=$((SEQ + 1))
NONCE_SECOND_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-nonce-second-${USERNAME}-${SEQ}" \
    --arg nonce "${NONCE_VALUE}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"not-a-building",x:1,y:1},seq:$seq,idempotencyKey:$idempotencyKey,nonce:$nonce}'
)"
NONCE_SECOND_RESP="$(post_cmd "${NONCE_SECOND_PAYLOAD}")"
assert_json "ANTI_REPLAY" "${NONCE_SECOND_RESP}" '.code == "ANTI_REPLAY"'

echo "[smoke-cmd] Validating RATE_LIMIT"
RATE_LIMIT_FOUND="0"
i=1
while [ "$i" -le 60 ]; do
  SEQ=$((SEQ + 1))
  RATE_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "smoke-cmd-rate-${USERNAME}-${SEQ}-${i}" \
      --argjson seq "${SEQ}" \
      '{op:"PlaceBuilding",args:{buildingType:"hq",x:-1,y:0},seq:$seq,idempotencyKey:$idempotencyKey}'
  )"
  RATE_RESP="$(post_cmd "${RATE_PAYLOAD}")"
  RATE_CODE="$(echo "${RATE_RESP}" | jq -r '.code // ""')"
  if [ "${RATE_CODE}" = "RATE_LIMIT" ]; then
    RATE_LIMIT_FOUND="1"
    break
  fi
  i=$((i + 1))
done

if [ "${RATE_LIMIT_FOUND}" != "1" ]; then
  echo "[smoke-cmd] RATE_LIMIT was not triggered"
  print_response "${RATE_RESP}"
  exit 1
fi

echo "[smoke-cmd] OK"
