# Migration Backlog (Epics → Stories → Acceptance)

This backlog is designed to move from a Flash client to a modern TS/Pixi client **without** losing service continuity.

> Tip: implement stories in order; each has a runnable milestone.

---

## Definition of Done (DoD)
A story is “done” when:
- Feature works in desktop build (Tauri) and web build (Vite).
- Contract tests cover the API interactions and schema changes.
- Server validation exists for any state-affecting action.
- Telemetry: server logs include `userId`, `ip`, `op`, and `result`.

---

## EPIC E00 — Repo, tooling, standards
### E00-S01: Repo bootstrap (this repo)
**Acceptance**
- `npm run dev` starts Pixi client and renders placeholder.
- Docs folder present with full plan.

### E00-S02: Quality gates
- Add ESLint config, CI typecheck/lint.
- Add `vitest` for contract tests (phase 1).
**Acceptance**
- CI fails on type errors.
- CI runs a contract test suite.

---

## EPIC E01 — Compatibility bootstrap (server routes that already exist)
> Goal: reach “login → baseLoad → render”.

### E01-S01: Implement `/init` handshake and version mismatch UX
**Server**
- No change.
**Client**
- Call `POST /init` with `apiVersion`.
- Show “update required” when `versionMismatch` true.
**Acceptance**
- Client blocks entry when mismatch.
- Logs include server error string.

### E01-S02: Implement auth UX and token storage abstraction
**Server**
- Uses Bearer token and Redis-backed token check.
**Client**
- Provide LoginScene UI (email + password for local dev; discord later).
- Store token via TokenStore abstraction:
  - web: memory only (phase 1) OR cookie session (phase 3)
  - desktop: OS keyring (phase 2)
**Acceptance**
- Token never written to localStorage.
- Token used in `Authorization` header.

### E01-S03: Maproom bootstrap (`/api/:apiVersion/bm/getnewmap`)
**Server**
- No change.
**Client**
- Call getnewmap and store maproom version metadata.
**Acceptance**
- Client can show “MR v3 enabled” if `newmap:true`.

### E01-S04: Base load (`POST /base/load`) and minimal parse
**Server**
- No change.
**Client**
- Implement payload builder for `baseLoad` mode “view/build”.
- Parse only what is needed to render:
  - yard size
  - building list + positions
  - resources summary (optional)
**Acceptance**
- Yard renders at least one building sprite placeholder at correct grid location.

### E01-S05: Base save (legacy) – *only for non-critical actions*
**Server**
- Already validates with Zod and runs anticheat validateSave.
**Client**
- Only send minimal, non-abusable changes in phase 1:
  - UI preferences (if supported)
- Everything else will migrate to commands in EPIC E10.
**Acceptance**
- Any resource, placement, timer change is rejected unless performed by a command endpoint (EPIC E10).

---

## EPIC E02 — Yard renderer (visual parity)
### E02-S01: Grid, isometric projection, camera
**Acceptance**
- Smooth pan/zoom.
- Correct world→screen mapping with deterministic rounding.

### E02-S02: Sprite pipeline v1 (static)
**Acceptance**
- Load atlas from `cdnUrl` and display buildings.

### E02-S03: Selection + hover + tooltips
**Acceptance**
- Click selects; tooltip shows building name/level (from server data).

---

## EPIC E03 — Build mode (server authoritative)
> No “client tells position is valid”. Client sends intent, server decides.

### E03-S01: Command endpoint: `PlaceBuilding`
**Server**
- Add `/api/:apiVersion/cmd` (or similar) and implement:
  - validate resources
  - validate grid occupancy
  - validate prerequisites
  - apply state changes in DB
  - return delta (building created w/ canonical coords)
**Client**
- Drag building ghost locally, then submit command.
- Apply delta from server response.
**Acceptance**
- If client tampers with coords/resources, server rejects and returns error.
- Two identical requests with same idempotency key do not double-spend.

### E03-S02: Command endpoint: `MoveBuilding`
### E03-S03: Command endpoint: `UpgradeBuilding`
### E03-S04: Command endpoint: `CancelUpgrade`
### E03-S05: Command endpoint: `CollectHarvester`
(Repeat same pattern: preconditions validated server-side)

---

## EPIC E04 — Maproom v2/v3 parity
Routes exist for both:
- `/worldmapv2/*`
- `/worldmapv3/*`
**Stories**
- MR init, getcells, relocate, takeover, transfer assets
**Acceptance**
- Client can view map, select cells, execute action via server-validated command.

---

## EPIC E05 — Combat model (authoritative)
### E05-S01: Combat becomes “server-simulated replay”
**Server**
- Create `StartAttack` command.
- Server produces deterministic replay stream:
  - input events or tick deltas
- Client renders replay only.
**Acceptance**
- Client cannot speedhack to gain loot.
- Replay is verifiable server-side.

---

## EPIC E06 — Social: messages + leaderboards + logs
Routes exist:
- `/api/:apiVersion/player/getmessagethreads`, `/sendmessage`, `/leaderboards`, `/attacklogs`, etc.
**Acceptance**
- Functional UI, server remains authority.

---

## EPIC E10 — Protocol hardening (replace legacy save/load)
### E10-S01: Introduce canonical “state snapshot” endpoint
- `GET /api/:apiVersion/state` returns normalized JSON (no stringified blobs).
**Acceptance**
- Web client no longer needs Flash-era parsing quirks.

### E10-S02: Replace polling `updateSaved` with event stream
- WebSocket or SSE with auth
**Acceptance**
- No more client-driven “sync time”; server pushes deltas.

### E10-S03: Deprecate legacy `/base/save`
- Allow only for legacy Flash client; web client must use commands.
**Acceptance**
- Feature flags enforce this.

---

## EPIC E99 — Cutover
### E99-S01: Version gate enforcement
Server already supports version mismatch via `/init`.
**Acceptance**
- When web client reaches parity, Flash client is gated out cleanly.
