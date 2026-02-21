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


### `POST /init` (version gate + build gate)
Request:
```json
{
  "apiVersion": "v1.5.0-beta",
  "runtime": "desktop",
  "platform": "windows",
  "clientBuild": "2026.02.20"
}
```

Response when blocked:
```json
{
  "versionMismatch": true,
  "error": "Please update to the latest version. Visit our downloads page to get the latest client.",
  "requiredClientBuild": "2026.02.20",
  "downloadUrl": "https://downloads.example.com/bymr",
  "protocol": {
    "canonicalStateRequired": true,
    "legacyBaseLoadFallbackAllowed": false,
    "stateStreamRequired": true
  }
}
```

Rules:
- Mismatch when `apiVersion` is absent/different from server `getApiVersion()`.
- Optional build gate via env `REQUIRED_CLIENT_BUILD`.
- Optional update CTA via env `CLIENT_DOWNLOAD_URL`.
- Optional canonical protocol gate via env:
  - `REQUIRE_NEXT_CLIENT_CANONICAL_STATE`
  - `DISABLE_NEXT_CLIENT_BASE_LOAD`
- `/init` now returns `protocol.*` capabilities so next-client can disable legacy fallback safely.
- HTTP status for mismatch is `426 Upgrade Required` + `code: "VERSION_MISMATCH"`.

### Auth payload policy (`/player/register`, `/player/getinfo`, `/player/reset-password`)
- `register` e `reset-password` exigem senha forte (`8+`, ao menos uma maiúscula e um caractere especial).
- `login` aceita:
  - `token`, ou
  - `email + password` (compatível com contas legadas já existentes; política forte não é reaplicada no login).
- Falhas de contrato devem retornar `400` com envelope `VALIDATION_ERROR` (nunca `500`).

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
- `PurchaseStoreItem`
- `ApplyYardPlannerTemplate`
- `StartRepairBuilding`
- `StartRepairAllBuildings`
- `StartAcademyUpgrade`
- `CancelAcademyUpgrade`
- `FinishAcademyUpgradeNow`

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

Validation error shape (`400`):
```json
{
  "error": "password: Password must contain at least one uppercase letter and one special character",
  "errorDetails": {
    "status": 400,
    "data": {
      "code": "VALIDATION_ERROR",
      "issues": ["password: ..."]
    },
    "message": "password: ..."
  }
}
```

### Server-side requirements (mandatory)
- Validate `op` and `args` with server schemas (never trust client shape).
- Enforce `seq` monotonic progression per session/user.
- Enforce idempotency in Redis with key format: `cmd:<userId>:<idempotencyKey>`.
- Return same deterministic outcome for repeated idempotency key.
- Apply rate limit per `op` and log rejects with `traceId`.
- Optional anti-replay nonce can be validated in Redis (`cmd-nonce:<userId>:<nonce>`).
- Apply legacy main-yard build rules server-side (`quantityByTownHall`, level requirements and resource costs for place/upgrade).
- Reject resource/requirement violations with structured `code` (`BUILDING_LIMIT_REACHED`, `BUILDING_REQUIREMENT_NOT_MET`, `INSUFFICIENT_RESOURCES`).
- Regression smoke coverage: `./scripts/smoke-cmd-hardening.sh`.

### `GET /api/:apiVersion/store/catalog`
- Auth required (`Bearer`).
- Retorna catálogo de store + inventário atual do jogador:
  - `credits`
  - `items` (metadados dos SKUs, custo/duração)
  - `storeData` (quantidade/expiração por item)
- Endpoint usado no novo client para fluxos de `BUILDINGINFO/BUILDINGS` com compra autoritativa em `/cmd`.

## Base endpoints hardening
### `POST /base/load`
- Must accept `{ baseId, mode }` for the next client.
- Must continue to accept legacy payload (`baseid`, `type`, etc.) during transition.
- Invalid payloads should return `400` with schema details (not `500`).
- Should return normalized shape:
  - `yardWidth`
  - `yardHeight`
  - `yardTheme` (`grass|sand|lava|rock|crater`)
  - `buildings[]` (including optional `footprintW/footprintH` when available)
- Deprecation gate for next-client: when env `DISABLE_NEXT_CLIENT_BASE_LOAD` is enabled (`1|true|yes|enabled`), next-client payloads are rejected with `409` and `code: "NEXT_CLIENT_BASE_LOAD_DEPRECATED"` to force migration to `/api/:apiVersion/state`.

### `POST /base/save`
- Transitional endpoint for **non-critical** actions only.
- Must require `action` in allowlist (`SetDecorationVisibility`, `SetCosmeticLoadout`, `SetUiPreference`).
- Must persist audit payload (`audit.action`, `audit.at`, `audit.clientVersion`).
- Invalid payloads should return `400` with schema details (not `500`).
- Legacy Flash payload remains supported during cutover window.
- Deprecation gate for next-client: when env `DISABLE_NEXT_CLIENT_BASE_SAVE` is enabled (`1|true|yes|enabled`), next-client payloads are rejected with `409` and `code: "NEXT_CLIENT_BASE_SAVE_DEPRECATED"` to force migration to `/api/:apiVersion/cmd`.

### `GET /api/:apiVersion/state`
- Auth required (`Bearer`).
- Query params (opcionais):
  - `baseId` (`home|self|main|default|0` ou baseid explícito)
  - `scope` (`auto|main|inferno`)
- Retorna snapshot canônico sem blobs stringificados para consumo do cliente novo.

Exemplo de resposta:
```json
{
  "snapshotVersion": 1,
  "serverTime": 1730000012,
  "player": {
    "userId": 123,
    "username": "dev",
    "banned": false,
    "chatEnabled": true,
    "friendCount": 0
  },
  "base": {
    "baseId": "1001",
    "baseSaveId": 22,
    "type": "main",
    "yardWidth": 20,
    "yardHeight": 14,
    "yardTheme": "grass"
  },
  "progression": {
    "level": 5,
    "tutorialStage": 2,
    "points": 1000,
    "baseValue": 12000,
    "empireValue": 9000,
    "credits": 25,
    "protected": 1,
    "damage": 0,
    "destroyed": 0
  },
  "resources": {
    "active": { "r1": 10, "r2": 20, "r3": 30, "r4": 40, "r1max": 100, "r2max": 100, "r3max": 100, "r4max": 100 }
  },
  "storeData": {
    "BEW": { "q": 1 },
    "BUILDING22": { "q": 2, "e": 1730001111 }
  },
  "academy": {
    "buildingId": "26",
    "buildingLevel": 2,
    "busy": false,
    "activeMonsterId": null,
    "monsters": {
      "C1": { "level": 1, "maxLevel": 6, "inLocker": true, "canTrain": true }
    }
  },
  "buildings": [{ "id": "b1", "type": "hq", "x": 2, "y": 3 }],
  "maproom": {
    "worldId": "w-1",
    "mapVersion": 3,
    "outpostCount": 4,
    "canAttack": true
  }
}
```

Erro estruturado:
- `400` `INVALID_STATE_QUERY`
- `404` `STATE_BASE_NOT_FOUND`
- `500` `STATE_SNAPSHOT_FAILED`

### Websocket/SSE: `/api/:apiVersion/stream`
Auth + server pushes deltas/events.

- Método atual: `GET` com `Accept: text/event-stream` e `Authorization: Bearer <token>`.
- Query params (opcionais): `baseId`, `scope` (`auto|main|inferno`) com semântica igual ao `/state`.
- Eventos emitidos:
  - `ready`: metadados da conexão.
  - `snapshot`: snapshot inicial canônico (`reason: "initial"`).
  - `snapshot` (`reason: "resync"`): re-sincronização canônica quando progresso temporal legado altera estado (timers/produção) sem novo `/cmd`.
  - `delta`: delta autoritativo publicado após comandos aceitos em `/cmd`.
  - `tick`: heartbeat de tempo de servidor.

Exemplo SSE:
```
event: ready
data: {"connectionId":"c1","serverTime":1730000012,"snapshotVersion":1}

event: snapshot
data: {"reason":"initial","snapshot":{"snapshotVersion":1,"serverTime":1730000012,"player":{"userId":123,"username":"dev","banned":false,"chatEnabled":true,"friendCount":0},"base":{"baseId":"1001","baseSaveId":22,"type":"main","yardWidth":20,"yardHeight":14,"yardTheme":"grass"},"progression":{"level":5,"tutorialStage":2,"points":1000,"baseValue":12000,"empireValue":9000,"credits":25,"protected":1,"damage":0,"destroyed":0},"resources":{"active":{"r1":10,"r2":20,"r3":30,"r4":40,"r1max":100,"r2max":100,"r3max":100,"r4max":100}},"storeData":{"BEW":{"q":1}},"buildings":[{"id":"b1","type":"hq","x":2,"y":3}],"maproom":{"worldId":"w-1","mapVersion":3,"outpostCount":4,"canAttack":true}}}

event: delta
data: {"serverTime":1730000013,"seq":42,"baseId":"1001","op":"MoveBuilding","delta":[{"op":"moveBuilding","id":"991","x":10,"y":15}]}
```

## Combat replay contracts (authoritative baseline)
### `POST /api/:apiVersion/combat/start`
Request:
```json
{
  "targetBaseId": "2001",
  "durationSec": 30,
  "tickMs": 300,
  "idempotencyKey": "combat-1700000000-123"
}
```
Response:
```json
{
  "replayId": "9ab3...",
  "streamPath": "/api/v1.5.0-beta/combat/replay/9ab3...",
  "startedAt": 1730001000,
  "expiresAt": 1730001900,
  "tickMs": 300,
  "totalTicks": 85,
  "estimatedDurationMs": 25500
}
```

### `GET /api/:apiVersion/combat/replay/:replayId`
SSE autenticado com eventos:
- `ready`: metadados de stream (`replayId`, `schemaVersion`, `tickMs`, `totalTicks`)
- `snapshot`: snapshot de participantes (`attacker`, `defender`) e `seed`
- `frame`: tick determinístico (`attackerHp`, `defenderHp`, danos e críticos)
- `result`: resultado final (`winner`, `durationTicks`, `loot`)

Parâmetros opcionais:
- `speed=fast|realtime` (controle de playback do stream)
- `fromTick` (retomar stream a partir de um tick específico)

## Maproom v3 contracts (cliente novo)
### `GET /worldmapv3/initworldmap`
Resposta:
- `error`
- `celldata[]` (inclui célula da base do usuário com `x/y`, owner, level e metadados compat).
- `bookmarks` (payload legado do usuário, quando disponível).

### `POST /worldmapv3/getcells`
Request:
```json
{ "x": 100, "y": 120, "width": 10, "height": 10 }
```
Response:
- `error`
- `x`, `y`, `width`, `height`
- `celldata[]` (inclui `m` com estado bruto de monstros para fluxos de transferência legada quando disponível)

### `POST /worldmapv3/relocate`
Request: `{}`  
Response:
- `error`
- `coords: [x, y]`
- `mapheaderurl`

## Maproom advanced actions (cliente novo sobre endpoints legados)
### `POST /worldmapv2/takeoverCell`
Request (cliente novo -> payload legado):
```json
{
  "baseid": "12345",
  "shiny": "120",
  "resources": "{\"r1\":1000,\"r2\":250}"
}
```
Response:
- `error` (`0` em sucesso; legado pode retornar `1`/string em falha)

### `POST /worldmapv2/transferassets`
Request:
```json
{
  "frombaseid": "12345",
  "tobaseid": "12346",
  "monsters": "[[{\"id\":\"m1\",\"amount\":3}],[{\"id\":\"m2\",\"amount\":1}]]"
}
```
Response:
- `error` (`0` em sucesso; legado pode retornar `1`/string em falha)

### `POST /api/:apiVersion/player/savebookmarks`
Request:
```json
{
  "bookmarks": "[{\"id\":\"bid-12345\",\"name\":\"Outpost A\",\"x\":120,\"y\":98,\"bid\":\"12345\"}]"
}
```
Response:
- `error` (`0` em sucesso)

## Maproom UX avançada (cliente novo)
- Overlay runtime (`M`) agora inclui:
  - filtros de célula: `all`, `mine`, `enemy`, `free`, `damaged`, `protected`;
  - painel detalhado da célula selecionada (owner/base/nível/dano/proteção/recursos);
  - lista rápida de células filtradas na viewport;
  - navegação por coordenadas (`X/Y -> jump`).

## Social contracts (baseline cliente novo)
### `GET /api/:apiVersion/worlds`
Resposta:
```json
{
  "worlds": [
    {
      "uuid": "5fb291f7-e58a-429e-99fb-67ab03712f7f",
      "name": "World #1",
      "playerCount": 321,
      "createdAt": "2026-02-20T20:26:00.000Z",
      "lastupdateAt": "2026-02-20T20:27:00.000Z"
    }
  ]
}
```

### `GET /api/:apiVersion/leaderboards?worldid=<uuid>`
Query obrigatória:
- `worldid` (UUID do mundo)

Resposta:
```json
{
  "leaderboard": [
    {
      "username": "alpha",
      "discord_tag": "alpha#0001",
      "outpost_count": 12
    }
  ]
}
```

### `GET /api/:apiVersion/attacklogs?filter=<both|myattacks|peopleattackingme>`
Auth:
- `Authorization: Bearer <token>`

Query opcional:
- `filter`: `both` (default), `myattacks`, `peopleattackingme`

Resposta:
```json
{
  "attackLogs": [
    {
      "id": 10,
      "attacker_userid": 123,
      "attacker_username": "alpha",
      "defender_userid": 456,
      "defender_username": "beta",
      "type": "attack",
      "x": 8,
      "y": 14,
      "loot": { "r1": 25 },
      "attackreport": { "result": "attacker" },
      "attacktime": "2026-02-20T20:30:00.000Z"
    }
  ]
}
```

## Mail contracts (cliente novo)
### `GET /api/:apiVersion/player/getmessagetargets`
Resposta:
```json
{
  "targets": {
    "456": {
      "friend": 0,
      "mapver": 2,
      "first_name": "beta",
      "last_name": "",
      "pic_square": "https://api.dicebear.com/9.x/bottts-neutral/jpg?seed=beta&size=50"
    }
  }
}
```

### `GET /api/:apiVersion/player/getmessagethreads`
Resposta:
```json
{
  "error": 0,
  "threads": {
    "10": {
      "messageid": "0",
      "threadid": 10,
      "userid": 456,
      "targetid": 123,
      "messagetype": "message",
      "subject": "hello",
      "message": "ping",
      "unread": 1,
      "messagecount": 2
    }
  }
}
```

### `POST /api/:apiVersion/player/getmessagethread`
Request:
```json
{ "threadid": "10" }
```
Resposta:
```json
{
  "error": 0,
  "thread": {
    "m-1": {
      "messageid": "m-1",
      "threadid": 10,
      "userid": 456,
      "targetid": 123,
      "messagetype": "message",
      "subject": "hello",
      "message": "ping"
    }
  }
}
```

### `POST /api/:apiVersion/player/sendmessage`
Request:
```json
{
  "subject": "Smoke Thread 1771621006",
  "type": "message",
  "message": "hello from smoke-mail",
  "targetid": "456",
  "threadid": "0",
  "targetbaseid": "0"
}
```
Resposta de sucesso:
```json
{ "error": 0, "messageid": 0, "threadid": 10 }
```

### `POST /api/:apiVersion/player/reportmessagethread`
Request:
```json
{ "threadid": "10", "reason": "abuse" }
```
Resposta:
```json
{ "error": 0 }
```

Notas:
- `error` em endpoints de mail pode vir como número ou string por compatibilidade legado.
- `sendmessage` e `getmessagethread` precisam tratar usuários sem `save` inicial no server (garantia aplicada no backend atual criando `Save` canônico quando ausente).

## Social UX (cliente novo)
- Overlay runtime (`L`) integra:
  - seleção de mundo e leaderboard (top outposts);
  - filtros de attack logs por tipo de visão;
  - mensageria in-game (threads/read/send/report).


### Runtime deprecation guard
- `npm run guard:legacy-runtime` blocks regressions that reintroduce runtime dependency on `client(legacy)`, `.swf` payloads, or insecure token storage (`localStorage/sessionStorage`) in the new client.
