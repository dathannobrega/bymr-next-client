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
3) Final cutover:
   - `/init` versionMismatch for Flash versions
   - communicate via Discord/website
4) Post-cutover:
   - remove legacy save paths for new clients
   - keep minimal compatibility layer if needed

## Success metrics
- Drop in suspicious saves / anticheat triggers
- Stable crash rate
- Reduced support tickets
