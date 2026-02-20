# API Contracts

This document lists:
1) **Current server routes** (compatibility phase)
2) **Routes for command-based hardening** (implemented + planned)

## Current routes (from server router)
Key endpoints already present include:
- `/init`
- `/api/:apiVersion/bm/getnewmap` (GET/POST)
- `/api/:apiVersion/player/getinfo` (login)
- `/api/:apiVersion/player/register`
- `/base/load`, `/base/save`, `/base/updatesaved`
- Inferno variants: `/api/:apiVersion/bm/base/load`, `/api/:apiVersion/bm/base/save`, `/api/:apiVersion/bm/base/updatesaved`
- Maproom v2/v3 routes, messages, leaderboards, attacklogs, etc.

**Compatibility note:** legacy save schema expects many fields as stringified JSON; server transforms via Zod.

## `/cmd` production contract (server-authoritative)
### `POST /api/:apiVersion/cmd`
Body envelope:
```json
{
  "op": "PlaceBuilding",
  "args": { "buildingType": "hq", "x": 10, "y": 15 },
  "seq": 42,
  "idempotencyKey": "Z9x3...nanoid"
}
```

`buildingType` aceita formatos compatíveis com legado:
- alias: `hq`
- numérico: `14`
- prefixado: `building-14`

Supported ops in client:
- `PlaceBuilding`
- `MoveBuilding`
- `UpgradeBuilding`
- `CancelUpgrade`
- `CollectHarvester`

Success response:
```json
{
  "ok": true,
  "seq": 42,
  "serverTime": 1730000012,
  "delta": [
    { "op": "addBuilding", "id": "991", "type": "hq", "x": 10, "y": 15, "level": 1 }
  ]
}
```

Structured error response:
```json
{
  "error": "Replay blocked",
  "code": "ANTI_REPLAY",
  "traceId": "trace-123"
}
```

### Server-side requirements (mandatory)
- Validate `op` and `args` with server schemas (never trust client shape).
- Enforce `seq` monotonic progression per session/user.
- Enforce idempotency in Redis with key format: `cmd:<userId>:<idempotencyKey>`.
- Return same deterministic outcome for repeated idempotency key.
- Apply rate limit per `op` and log rejects with `traceId`.
- Optional anti-replay nonce can be validated in Redis (`cmd-nonce:<userId>:<nonce>`).

## Base endpoints hardening
### `POST /base/load`
- Must accept `{ baseId, mode }` for the next client.
- Must continue to accept legacy payload (`baseid`, `type`, etc.) during transition.
- Invalid payloads should return `400` with schema details (not `500`).
- Should return normalized shape:
  - `yardWidth`
  - `yardHeight`
  - `buildings[]`

### `POST /base/save`
- Transitional endpoint for **non-critical** actions only.
- Must require `action` in allowlist (`SetDecorationVisibility`, `SetCosmeticLoadout`, `SetUiPreference`).
- Must persist audit payload (`audit.action`, `audit.at`, `audit.clientVersion`).
- Invalid payloads should return `400` with schema details (not `500`).
- Legacy Flash payload remains supported during cutover window.

## Future additions
### `GET /api/:apiVersion/state`
Returns normalized snapshot without stringified blobs (for new clients only).

### Websocket/SSE: `/api/:apiVersion/stream`
Auth + server pushes deltas/events.
