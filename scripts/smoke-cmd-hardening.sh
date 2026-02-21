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

get_state_snapshot() {
  curl -sS "${API_BASE_URL}/api/${API_VERSION}/state?baseId=home&scope=main" \
    -H "Authorization: Bearer ${TOKEN}"
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

STORE_CATALOG_RESP="$(
  curl -sS "${API_BASE_URL}/api/${API_VERSION}/store/catalog" \
    -H "Authorization: Bearer ${TOKEN}"
)"
BEW_Q="$(echo "${STORE_CATALOG_RESP}" | jq -r '.storeData.BEW.q // 0')"
if [ -z "${BEW_Q}" ] || [ "${BEW_Q}" = "null" ]; then
  BEW_Q="0"
fi
WORKER_CAP=$((1 + BEW_Q))

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
assert_json "Baseline progression delta" "${SUCCESS_RESP}" '.delta | any(.op == "setProgression")'
SUCCESS_SEQ="$(echo "${SUCCESS_RESP}" | jq -r '.seq')"
SUCCESS_DELTA="$(echo "${SUCCESS_RESP}" | jq -c '.delta')"
TH_BUILDING_ID="$(echo "${SUCCESS_RESP}" | jq -r '.delta[]? | select(.op=="addBuilding") | .id // empty' | head -n 1)"
if [ -z "${TH_BUILDING_ID}" ]; then
  echo "[smoke-cmd] Could not resolve Town Hall id from baseline response"
  print_response "${SUCCESS_RESP}"
  exit 1
fi

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
echo "[smoke-cmd] Validating ApplyYardPlannerTemplate operation availability"
PLANNER_APPLY_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-planner-apply-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"ApplyYardPlannerTemplate",args:{slotId:1},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
PLANNER_APPLY_RESP="$(post_cmd "${PLANNER_APPLY_PAYLOAD}")"
assert_json "ApplyYardPlannerTemplate (missing slot)" "${PLANNER_APPLY_RESP}" '.code == "YARD_PLANNER_TEMPLATE_NOT_FOUND"'

SEQ=$((SEQ + 1))
echo "[smoke-cmd] Validating StartRepairAllBuildings operation availability"
REPAIR_ALL_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-repair-all-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"StartRepairAllBuildings",args:{},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
REPAIR_ALL_RESP="$(post_cmd "${REPAIR_ALL_PAYLOAD}")"
assert_json "StartRepairAllBuildings" "${REPAIR_ALL_RESP}" '.ok == true and (.delta | type=="array")'

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

echo "[smoke-cmd] Validating worker queue + Town Hall level gates"
SEQ=$((SEQ + 1))
PLACE_B1_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-place-b1-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"building-1",x:16,y:10},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
PLACE_B1_RESP="$(post_cmd "${PLACE_B1_PAYLOAD}")"
assert_json "Place building-1" "${PLACE_B1_RESP}" '.ok == true and (.delta | map(select(.op=="setResources")) | length >= 1)'
B1_ID="$(echo "${PLACE_B1_RESP}" | jq -r '.delta[]? | select(.op=="addBuilding") | .id // empty' | head -n 1)"
if [ -z "${B1_ID}" ]; then
  echo "[smoke-cmd] Could not resolve building-1 id"
  print_response "${PLACE_B1_RESP}"
  exit 1
fi

SEQ=$((SEQ + 1))
PLACE_WALL_TH_GATED_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-place-wall-th-gated-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"building-17",x:18,y:10},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
PLACE_WALL_TH_GATED_RESP="$(post_cmd "${PLACE_WALL_TH_GATED_PAYLOAD}")"
assert_json "Place wall gated by TH level" "${PLACE_WALL_TH_GATED_RESP}" '.code == "BUILDING_LIMIT_REACHED"'

SEQ=$((SEQ + 1))
PLACE_B2_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-place-b2-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"building-2",x:13,y:10},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
PLACE_B2_RESP="$(post_cmd "${PLACE_B2_PAYLOAD}")"
assert_json "Place building-2" "${PLACE_B2_RESP}" '.ok == true'
B2_ID="$(echo "${PLACE_B2_RESP}" | jq -r '.delta[]? | select(.op=="addBuilding") | .id // empty' | head -n 1)"
if [ -z "${B2_ID}" ]; then
  echo "[smoke-cmd] Could not resolve building-2 id"
  print_response "${PLACE_B2_RESP}"
  exit 1
fi

SEQ=$((SEQ + 1))
PLACE_B3_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-place-b3-${USERNAME}-${SEQ}" \
    --argjson seq "${SEQ}" \
    '{op:"PlaceBuilding",args:{buildingType:"building-3",x:10,y:10},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
PLACE_B3_RESP="$(post_cmd "${PLACE_B3_PAYLOAD}")"
assert_json "Place building-3" "${PLACE_B3_RESP}" '.ok == true'
B3_ID="$(echo "${PLACE_B3_RESP}" | jq -r '.delta[]? | select(.op=="addBuilding") | .id // empty' | head -n 1)"
if [ -z "${B3_ID}" ]; then
  echo "[smoke-cmd] Could not resolve building-3 id"
  print_response "${PLACE_B3_RESP}"
  exit 1
fi

echo "[smoke-cmd] Validating fortify flow (start/cancel/finish)"
SEQ=$((SEQ + 1))
START_FORTIFY_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-start-fortify-${USERNAME}-${SEQ}" \
    --arg buildingId "${B1_ID}" \
    --argjson seq "${SEQ}" \
    '{op:"StartFortifyBuilding",args:{buildingId:$buildingId},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
START_FORTIFY_RESP="$(post_cmd "${START_FORTIFY_PAYLOAD}")"
assert_json "StartFortifyBuilding" "${START_FORTIFY_RESP}" \
  '.ok == true and (.delta | any(.op == "setBuildingFortification" and (.countdownFortify // 0) > 0))'

SEQ=$((SEQ + 1))
CANCEL_FORTIFY_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-cancel-fortify-${USERNAME}-${SEQ}" \
    --arg buildingId "${B1_ID}" \
    --argjson seq "${SEQ}" \
    '{op:"CancelFortifyBuilding",args:{buildingId:$buildingId},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
CANCEL_FORTIFY_RESP="$(post_cmd "${CANCEL_FORTIFY_PAYLOAD}")"
assert_json "CancelFortifyBuilding" "${CANCEL_FORTIFY_RESP}" \
  '.ok == true and (.delta | any(.op == "setBuildingFortification" and (.countdownFortify // 0) == 0))'

SEQ=$((SEQ + 1))
START_FORTIFY_PAYLOAD_2="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-start-fortify-2-${USERNAME}-${SEQ}" \
    --arg buildingId "${B1_ID}" \
    --argjson seq "${SEQ}" \
    '{op:"StartFortifyBuilding",args:{buildingId:$buildingId},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
START_FORTIFY_RESP_2="$(post_cmd "${START_FORTIFY_PAYLOAD_2}")"
assert_json "StartFortifyBuilding (2)" "${START_FORTIFY_RESP_2}" \
  '.ok == true and (.delta | any(.op == "setBuildingFortification" and (.countdownFortify // 0) > 0))'

SEQ=$((SEQ + 1))
FINISH_FORTIFY_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-finish-fortify-${USERNAME}-${SEQ}" \
    --arg buildingId "${B1_ID}" \
    --argjson seq "${SEQ}" \
    '{op:"FinishFortifyNow",args:{buildingId:$buildingId},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
FINISH_FORTIFY_RESP="$(post_cmd "${FINISH_FORTIFY_PAYLOAD}")"
FINISH_FORTIFY_CODE="$(echo "${FINISH_FORTIFY_RESP}" | jq -r '.code // ""')"
if [ "${FINISH_FORTIFY_CODE}" = "INSUFFICIENT_CREDITS" ]; then
  assert_json "FinishFortifyNow (insufficient credits)" "${FINISH_FORTIFY_RESP}" \
    '.code == "INSUFFICIENT_CREDITS"'

  SEQ=$((SEQ + 1))
  CANCEL_FORTIFY_AFTER_FINISH_FAIL_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "smoke-cmd-cancel-fortify-after-finish-fail-${USERNAME}-${SEQ}" \
      --arg buildingId "${B1_ID}" \
      --argjson seq "${SEQ}" \
      '{op:"CancelFortifyBuilding",args:{buildingId:$buildingId},seq:$seq,idempotencyKey:$idempotencyKey}'
  )"
  CANCEL_FORTIFY_AFTER_FINISH_FAIL_RESP="$(post_cmd "${CANCEL_FORTIFY_AFTER_FINISH_FAIL_PAYLOAD}")"
  assert_json "CancelFortifyBuilding (cleanup)" "${CANCEL_FORTIFY_AFTER_FINISH_FAIL_RESP}" \
    '.ok == true and (.delta | any(.op == "setBuildingFortification" and (.countdownFortify // 0) == 0))'
else
  assert_json "FinishFortifyNow" "${FINISH_FORTIFY_RESP}" \
    '.ok == true and (.delta | any(.op == "fortifyFinishNow")) and (.delta | any(.op == "setBuildingFortification" and (.countdownFortify // 0) == 0))'
fi

SEQ=$((SEQ + 1))
UPGRADE_B1_TH_GATED_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-upgrade-b1-th-gated-${USERNAME}-${SEQ}" \
    --arg buildingId "${B1_ID}" \
    --argjson seq "${SEQ}" \
    '{op:"UpgradeBuilding",args:{buildingId:$buildingId,targetLevel:2},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
UPGRADE_B1_TH_GATED_RESP="$(post_cmd "${UPGRADE_B1_TH_GATED_PAYLOAD}")"
UPGRADE_B1_GATE_CODE="$(echo "${UPGRADE_B1_TH_GATED_RESP}" | jq -r '.code // ""')"
if [ "${UPGRADE_B1_GATE_CODE}" = "TOWN_HALL_LEVEL_REQUIRED" ]; then
  SEQ=$((SEQ + 1))
  UPGRADE_TH_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "smoke-cmd-upgrade-th-${USERNAME}-${SEQ}" \
      --arg buildingId "${TH_BUILDING_ID}" \
      --argjson seq "${SEQ}" \
      '{op:"UpgradeBuilding",args:{buildingId:$buildingId,targetLevel:2},seq:$seq,idempotencyKey:$idempotencyKey}'
  )"
  UPGRADE_TH_RESP="$(post_cmd "${UPGRADE_TH_PAYLOAD}")"
  assert_json "Upgrade Town Hall to level 2" "${UPGRADE_TH_RESP}" '.ok == true'

  SEQ=$((SEQ + 1))
  UPGRADE_TH_L3_COST_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "smoke-cmd-upgrade-th-l3-cost-${USERNAME}-${SEQ}" \
      --arg buildingId "${TH_BUILDING_ID}" \
      --argjson seq "${SEQ}" \
      '{op:"UpgradeBuilding",args:{buildingId:$buildingId,targetLevel:3},seq:$seq,idempotencyKey:$idempotencyKey}'
  )"
  UPGRADE_TH_L3_COST_RESP="$(post_cmd "${UPGRADE_TH_L3_COST_PAYLOAD}")"
  assert_json "Upgrade Town Hall to level 3 blocked by resources" "${UPGRADE_TH_L3_COST_RESP}" '.code == "INSUFFICIENT_RESOURCES"'
else
  assert_json "Upgrade probe (TH already high enough)" "${UPGRADE_B1_TH_GATED_RESP}" '.ok == true'
fi

SEQ=$((SEQ + 1))
UPGRADE_IDS="${B2_ID} ${B3_ID}"
TARGET_UPGRADE_ATTEMPTS=$((WORKER_CAP + 1))
CURRENT_UPGRADE_IDS_COUNT="$(echo "${UPGRADE_IDS}" | wc -w | tr -d ' ')"
EXTRA_COORDS="7,10 4,10 16,7 13,7 10,7 7,7 4,7 16,4 13,4 10,4"

for pair in ${EXTRA_COORDS}; do
  if [ "${CURRENT_UPGRADE_IDS_COUNT}" -ge "${TARGET_UPGRADE_ATTEMPTS}" ]; then
    break
  fi

  X="$(echo "${pair}" | cut -d',' -f1)"
  Y="$(echo "${pair}" | cut -d',' -f2)"
  SEQ=$((SEQ + 1))
  PLACE_EXTRA_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "smoke-cmd-place-extra-${USERNAME}-${SEQ}-${X}-${Y}" \
      --argjson seq "${SEQ}" \
      --argjson x "${X}" \
      --argjson y "${Y}" \
      '{op:"PlaceBuilding",args:{buildingType:"building-4",x:$x,y:$y},seq:$seq,idempotencyKey:$idempotencyKey}'
  )"
  PLACE_EXTRA_RESP="$(post_cmd "${PLACE_EXTRA_PAYLOAD}")"
  assert_json "Place extra building for worker queue" "${PLACE_EXTRA_RESP}" '.ok == true'

  EXTRA_ID="$(echo "${PLACE_EXTRA_RESP}" | jq -r '.delta[]? | select(.op=="addBuilding") | .id // empty' | head -n 1)"
  if [ -z "${EXTRA_ID}" ]; then
    echo "[smoke-cmd] Could not resolve extra building id"
    print_response "${PLACE_EXTRA_RESP}"
    exit 1
  fi

  UPGRADE_IDS="${UPGRADE_IDS} ${EXTRA_ID}"
  CURRENT_UPGRADE_IDS_COUNT=$((CURRENT_UPGRADE_IDS_COUNT + 1))
done

if [ "${CURRENT_UPGRADE_IDS_COUNT}" -lt "${TARGET_UPGRADE_ATTEMPTS}" ]; then
  echo "[smoke-cmd] Not enough buildings to test worker queue limit"
  echo "needed=${TARGET_UPGRADE_ATTEMPTS} got=${CURRENT_UPGRADE_IDS_COUNT}"
  exit 1
fi

WORKER_LIMIT_HIT="0"
UPGRADE_STARTED_COUNT="0"
BUSY_BUILDING_ID=""

for buildingId in ${UPGRADE_IDS}; do
  SEQ=$((SEQ + 1))
  UPGRADE_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "smoke-cmd-upgrade-worker-${USERNAME}-${SEQ}-${buildingId}" \
      --arg buildingId "${buildingId}" \
      --argjson seq "${SEQ}" \
      '{op:"UpgradeBuilding",args:{buildingId:$buildingId,targetLevel:2,deferSeconds:60},seq:$seq,idempotencyKey:$idempotencyKey}'
  )"
  UPGRADE_RESP="$(post_cmd "${UPGRADE_PAYLOAD}")"
  UPGRADE_CODE="$(echo "${UPGRADE_RESP}" | jq -r '.code // ""')"

  if [ "${UPGRADE_CODE}" = "WORKER_UNAVAILABLE" ]; then
    WORKER_LIMIT_HIT="1"
    break
  fi

  assert_json "Start deferred upgrade worker queue" "${UPGRADE_RESP}" '.ok == true and (.delta | map(select(.op=="startUpgrade")) | length == 1)'
  UPGRADE_STARTED_COUNT=$((UPGRADE_STARTED_COUNT + 1))
  if [ -z "${BUSY_BUILDING_ID}" ]; then
    BUSY_BUILDING_ID="${buildingId}"
  fi
done

if [ "${WORKER_LIMIT_HIT}" != "1" ]; then
  echo "[smoke-cmd] Worker queue limit was not reached"
  exit 1
fi

if [ "${UPGRADE_STARTED_COUNT}" -lt "${WORKER_CAP}" ]; then
  echo "[smoke-cmd] Unexpected number of started upgrades before worker cap"
  echo "expected_at_least=${WORKER_CAP} got=${UPGRADE_STARTED_COUNT}"
  exit 1
fi

if [ -z "${BUSY_BUILDING_ID}" ]; then
  echo "[smoke-cmd] Could not resolve a busy building id for move validation"
  exit 1
fi

SEQ=$((SEQ + 1))
MOVE_BUSY_PAYLOAD="$(
  jq -nc \
    --arg idempotencyKey "smoke-cmd-move-busy-${USERNAME}-${SEQ}" \
    --arg buildingId "${BUSY_BUILDING_ID}" \
    --argjson seq "${SEQ}" \
    '{op:"MoveBuilding",args:{buildingId:$buildingId,toX:11,toY:10},seq:$seq,idempotencyKey:$idempotencyKey}'
)"
MOVE_BUSY_RESP="$(post_cmd "${MOVE_BUSY_PAYLOAD}")"
assert_json "Move blocked while busy" "${MOVE_BUSY_RESP}" '.code == "BUILDING_BUSY"'

echo "[smoke-cmd] Validating deferred countdown progression via state snapshot"
STATE_BEFORE_TIMER_RESP="$(get_state_snapshot)"
COUNTDOWN_BEFORE="$(echo "${STATE_BEFORE_TIMER_RESP}" | jq -r --arg id "${BUSY_BUILDING_ID}" '.buildings[]? | select(.id == $id) | .countdownUpgrade // empty' | head -n 1)"
if [ -z "${COUNTDOWN_BEFORE}" ] || [ "${COUNTDOWN_BEFORE}" = "null" ]; then
  echo "[smoke-cmd] Could not read initial countdownUpgrade from state snapshot"
  print_response "${STATE_BEFORE_TIMER_RESP}"
  exit 1
fi

sleep 3

STATE_AFTER_TIMER_RESP="$(get_state_snapshot)"
COUNTDOWN_AFTER="$(echo "${STATE_AFTER_TIMER_RESP}" | jq -r --arg id "${BUSY_BUILDING_ID}" '.buildings[]? | select(.id == $id) | .countdownUpgrade // empty' | head -n 1)"
if [ -z "${COUNTDOWN_AFTER}" ] || [ "${COUNTDOWN_AFTER}" = "null" ]; then
  echo "[smoke-cmd] Could not read post-wait countdownUpgrade from state snapshot"
  print_response "${STATE_AFTER_TIMER_RESP}"
  exit 1
fi

if [ "${COUNTDOWN_AFTER}" -ge "${COUNTDOWN_BEFORE}" ]; then
  echo "[smoke-cmd] Countdown did not progress as expected"
  echo "before=${COUNTDOWN_BEFORE} after=${COUNTDOWN_AFTER}"
  exit 1
fi

echo "[smoke-cmd] Validating RATE_LIMIT"
RATE_LIMIT_FOUND="0"
i=1
while [ "$i" -le 60 ]; do
  SEQ=$((SEQ + 1))
  RATE_PAYLOAD="$(
    jq -nc \
      --arg idempotencyKey "smoke-cmd-rate-${USERNAME}-${SEQ}-${i}" \
      --arg buildingId "${BUSY_BUILDING_ID}" \
      --argjson seq "${SEQ}" \
      '{op:"UpgradeBuilding",args:{buildingId:$buildingId,targetLevel:2,deferSeconds:60},seq:$seq,idempotencyKey:$idempotencyKey}'
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
