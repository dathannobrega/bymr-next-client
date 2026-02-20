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
DEFAULT_MAIL_SUFFIX="$(date +%s | cut -c 6-10)"

USER_A="${BYMR_SMOKE_MAIL_USER_A:-smka${DEFAULT_MAIL_SUFFIX}}"
USER_B="${BYMR_SMOKE_MAIL_USER_B:-smkb${DEFAULT_MAIL_SUFFIX}}"
EMAIL_A="${BYMR_SMOKE_MAIL_EMAIL_A:-${USER_A}@example.com}"
EMAIL_B="${BYMR_SMOKE_MAIL_EMAIL_B:-${USER_B}@example.com}"

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
    echo "[smoke-mail] ${LABEL} failed"
    print_response "$RESPONSE"
    exit 1
  fi
}

register_user_with_retry() {
  USERNAME="$1"
  EMAIL="$2"
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
  EMAIL="$1"
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/getinfo" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
}

login_or_register() {
  USERNAME="$1"
  EMAIL="$2"

  LOGIN_RESP="$(login_user "$EMAIL")"
  TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
  USER_ID="$(echo "$LOGIN_RESP" | jq -r '.userId // empty')"

  if [ -n "${TOKEN}" ] && [ "${TOKEN}" != "null" ] && [ -n "${USER_ID}" ] && [ "${USER_ID}" != "null" ]; then
    printf '%s\t%s\n' "$TOKEN" "$USER_ID"
    return 0
  fi

  REGISTER_RESP="$(register_user_with_retry "$USERNAME" "$EMAIL")"
  if ! echo "$REGISTER_RESP" | jq -e '.user.userid | type=="number"' >/dev/null 2>&1; then
    echo "[smoke-mail] Register failed for ${EMAIL}"
    print_response "$REGISTER_RESP"
    exit 1
  fi

  LOGIN_RESP="$(login_user "$EMAIL")"
  TOKEN="$(echo "$LOGIN_RESP" | jq -r '.token')"
  USER_ID="$(echo "$LOGIN_RESP" | jq -r '.userId // empty')"

  if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ] || [ -z "${USER_ID}" ] || [ "${USER_ID}" = "null" ]; then
    echo "[smoke-mail] Login failed after register for ${EMAIL}"
    print_response "$LOGIN_RESP"
    exit 1
  fi

  printf '%s\t%s\n' "$TOKEN" "$USER_ID"
}

echo "[smoke-mail] Waiting for API at ${API_BASE_URL}"
if ! wait_for_server; then
  echo "[smoke-mail] API did not become ready in time"
  exit 1
fi

echo "[smoke-mail] Resolving user A (${EMAIL_A})"
A_AUTH="$(login_or_register "${USER_A}" "${EMAIL_A}")"
TOKEN_A="$(printf '%s' "${A_AUTH}" | cut -f1)"
USER_ID_A="$(printf '%s' "${A_AUTH}" | cut -f2)"

echo "[smoke-mail] Resolving user B (${EMAIL_B})"
B_AUTH="$(login_or_register "${USER_B}" "${EMAIL_B}")"
TOKEN_B="$(printf '%s' "${B_AUTH}" | cut -f1)"
USER_ID_B="$(printf '%s' "${B_AUTH}" | cut -f2)"

if [ "${USER_ID_A}" = "${USER_ID_B}" ]; then
  echo "[smoke-mail] Invalid setup: users A/B must differ"
  exit 1
fi

echo "[smoke-mail] Sending message A -> B"
SEND_BODY="$(
  jq -nc \
    --arg subject "Smoke Thread $(date +%s)" \
    --arg message "hello from smoke-mail" \
    --arg targetid "${USER_ID_B}" \
    '{subject:$subject,type:"message",message:$message,targetid:$targetid,threadid:"0",targetbaseid:"0"}'
)"
SEND_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/sendmessage" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN_A}" \
    -d "${SEND_BODY}"
)"
assert_json "Send message" "$SEND_RESP" '.error == 0 and (.threadid | tonumber) >= 1'
THREAD_ID="$(echo "$SEND_RESP" | jq -r '.threadid | tostring')"

echo "[smoke-mail] Loading message targets for user A"
TARGETS_RESP="$(
  curl -sS "${API_BASE_URL}/api/${API_VERSION}/player/getmessagetargets" \
    -H "Authorization: Bearer ${TOKEN_A}"
)"
assert_json "Message targets" "$TARGETS_RESP" ".targets[\"${USER_ID_B}\"].first_name | type==\"string\""

echo "[smoke-mail] Loading message threads for user B"
THREADS_RESP="$(
  curl -sS "${API_BASE_URL}/api/${API_VERSION}/player/getmessagethreads" \
    -H "Authorization: Bearer ${TOKEN_B}"
)"
assert_json "Message threads" "$THREADS_RESP" '.error == 0 and (.threads | type=="object") and (.threads | length >= 1)'

echo "[smoke-mail] Loading thread ${THREAD_ID} for user B"
THREAD_BODY="$(jq -nc --arg threadid "${THREAD_ID}" '{threadid:$threadid}')"
THREAD_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/getmessagethread" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN_B}" \
    -d "${THREAD_BODY}"
)"
assert_json "Get message thread" "$THREAD_RESP" '.error == 0 and (.thread | type=="object") and (.thread | length >= 1)'

echo "[smoke-mail] Reporting thread ${THREAD_ID} for user B"
REPORT_BODY="$(jq -nc --arg threadid "${THREAD_ID}" '{threadid:$threadid,reason:"smoke"}')"
REPORT_RESP="$(
  curl -sS -X POST "${API_BASE_URL}/api/${API_VERSION}/player/reportmessagethread" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN_B}" \
    -d "${REPORT_BODY}"
)"
assert_json "Report message thread" "$REPORT_RESP" '.error == 0'

echo "[smoke-mail] OK"
