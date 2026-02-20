# Cutover Plan (Deprecate Flash)

## Preconditions
- Feature parity for: login, yard build/view, maproom, combat, social.
- Command-based protocol covers all state-changing actions.
- Observability: errors, latency, abuse metrics.

## Rollout strategy
1) Beta channel for web/desktop client.
2) Server enforces:
   - legacy Flash client allowed for a window
   - new client required for new features
   - new client reads canonical snapshot from `GET /api/:apiVersion/state`
   - new client consumes canonical stream from `GET /api/:apiVersion/stream` (SSE auth)
3) Final cutover:
   - `/init` versionMismatch for Flash versions
   - communicate via Discord/website
4) Post-cutover:
   - activate `DISABLE_NEXT_CLIENT_BASE_SAVE=true` to reject next-client payloads on `/base/save`
   - activate `DISABLE_NEXT_CLIENT_BASE_LOAD=true` to reject next-client payloads on `/base/load`
   - optionally set `REQUIRE_NEXT_CLIENT_CANONICAL_STATE=true` to signal strict canonical protocol in `/init`
   - stop relying on `/base/updatesaved` polling for next-client flows
   - remove legacy save paths for new clients after rollback window
   - keep minimal compatibility layer if needed

## Success metrics
- Drop in suspicious saves / anticheat triggers
- Stable crash rate
- Reduced support tickets
