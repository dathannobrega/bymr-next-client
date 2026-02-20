#!/usr/bin/env sh
set -eu

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required"
  exit 1
fi

infer_repo_from_git_remote() {
  REMOTE_URL="$(git config --get remote.origin.url 2>/dev/null || true)"
  if [ -z "${REMOTE_URL}" ]; then
    return 0
  fi

  case "${REMOTE_URL}" in
    git@github.com:*)
      echo "${REMOTE_URL}" | sed -E 's#git@github.com:([^/]+/[^.]+)(\.git)?#\1#'
      ;;
    https://github.com/*)
      echo "${REMOTE_URL}" | sed -E 's#https://github.com/([^/]+/[^.]+)(\.git)?#\1#'
      ;;
    *)
      echo ""
      ;;
  esac
}

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
REPO="${BYMR_GH_REPO:-$(infer_repo_from_git_remote)}"
REF="${BYMR_GH_REF:-${CURRENT_BRANCH}}"
WORKFLOW="${BYMR_GH_WORKFLOW:-build-clients.yml}"
WAIT_FOR_COMPLETION="${BYMR_GH_WAIT:-true}"
DOWNLOAD_DIR="${BYMR_GH_DOWNLOAD_DIR:-dist/desktop-artifacts}"

if [ -z "${REPO}" ]; then
  echo "Missing repository. Set BYMR_GH_REPO=<owner/repo>."
  exit 1
fi

if [ -z "${GH_TOKEN:-}" ] && [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Missing GitHub token. Set GH_TOKEN (or GITHUB_TOKEN)."
  exit 1
fi

echo "[desktop-release] Dispatching workflow ${WORKFLOW} on ${REPO}@${REF}"
gh workflow run "${WORKFLOW}" --repo "${REPO}" --ref "${REF}"

if [ "${WAIT_FOR_COMPLETION}" != "true" ]; then
  echo "[desktop-release] Workflow dispatched (wait disabled)."
  exit 0
fi

echo "[desktop-release] Waiting workflow run to appear..."
RUN_ID=""
attempt=1
while [ "${attempt}" -le 30 ]; do
  RUN_ID="$(
    gh run list \
      --repo "${REPO}" \
      --workflow "${WORKFLOW}" \
      --branch "${REF}" \
      --event workflow_dispatch \
      --limit 1 \
      --json databaseId \
      --jq '.[0].databaseId // empty'
  )"

  if [ -n "${RUN_ID}" ]; then
    break
  fi

  sleep 2
  attempt=$((attempt + 1))
done

if [ -z "${RUN_ID}" ]; then
  echo "[desktop-release] Could not determine workflow run id."
  exit 1
fi

echo "[desktop-release] Watching run ${RUN_ID}"
gh run watch "${RUN_ID}" --repo "${REPO}" --interval 15 --exit-status

echo "[desktop-release] Downloading artifacts to ${DOWNLOAD_DIR}"
rm -rf "${DOWNLOAD_DIR}"
mkdir -p "${DOWNLOAD_DIR}"
gh run download "${RUN_ID}" --repo "${REPO}" --dir "${DOWNLOAD_DIR}"

echo "[desktop-release] Done"
echo "[desktop-release] Artifacts available at: ${DOWNLOAD_DIR}"
