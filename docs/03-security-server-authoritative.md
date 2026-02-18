# Security Design: Server Authoritative (Anti-hack)

## Threat model (what we assume attackers can do)
- Modify client memory (resource values, timers)
- Tamper with HTTP requests (change coords/loot/cooldowns)
- Replay requests
- Spam endpoints / botting
- Attempt desync by sending malformed legacy save payloads

## Current server state (baseline)
- Auth middleware checks `Authorization: Bearer ...`, verifies JWT, matches token stored in Redis, and loads user from Postgres. (good baseline)
- Save endpoint validates payload via Zod transformations and calls `validateSave(...)` (anticheat hook).

## Target model: command-based protocol
### Principle
Client sends only **intent**:
- “PlaceBuilding type=X at (x,y)”
- “StartUpgrade buildingId=...”
Server:
- validates all preconditions
- computes authoritative results
- persists
- returns **delta** to client

### Envelope
Every command request MUST include:
- `op` (string enum)
- `args` (typed)
- `clientTime` (for telemetry only; never authoritative)
- `seq` (monotonic per session)
- `idempotencyKey` (UUID/nanoid)
- `nonce` (optional, server-provided)
- `signature` (optional; future)

Server MUST enforce:
- idempotency (Redis key: `cmd:<userId>:<idempotencyKey>`)
- anti-replay (nonce window)
- rate limits per op
- server-time authoritative timers

### Deltas
Server responds with:
- `serverTime`
- `stateDelta` (patch ops, not full state)
- optional `snapshotVersion`

## Token storage
### Desktop (.exe)
Use OS credential storage (keyring) for tokens; do not store in localStorage.

### Web
Prefer HttpOnly cookies; avoid exposing long-lived tokens to JS.

## Logging & telemetry
Log per command:
- userId, ip, op, result, latency, rejectedReason, payloadHash

## Rollout strategy
1. Implement `/cmd` for one safe op (e.g., MoveBuilding).
2. Migrate one feature at a time.
3. Keep `/base/save` only for Flash client until cutover.
