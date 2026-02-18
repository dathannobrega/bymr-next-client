# API Contracts

This document lists:
1) **Current server routes** (compatibility phase)
2) **Proposed new routes** (command-based hardening)

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

## Proposed additions (for server-authoritative)
### `POST /api/:apiVersion/cmd`
Body:
```json
{
  "op": "PlaceBuilding",
  "args": { "buildingType": 123, "x": 10, "y": 15 },
  "seq": 42,
  "idempotencyKey": "Z9x3...nanoid",
  "clientTime": 1730000000
}
```

Response:
```json
{
  "ok": true,
  "serverTime": 1730000012,
  "delta": [
    { "op": "addBuilding", "id": 991, "type": 123, "x": 10, "y": 15, "level": 1 }
  ]
}
```

### `GET /api/:apiVersion/state`
Returns normalized snapshot without stringified blobs (for new clients only).

### Websocket/SSE: `/api/:apiVersion/stream`
Auth + server pushes deltas/events.
