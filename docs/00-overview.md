# Overview

## Why this repo exists
The current BYMR client is **ActionScript/Flash**, while the server is already modern TypeScript/Bun/Koa/Postgres.

Goal: build a **new client** that runs as:
- **Web** (HTML5/Canvas/WebGL)
- **Desktop .exe** (Tauri wrapper)

No Flash Player, no SWF.

## Non-negotiables
- **Server authoritative**: the client sends *intent/commands*, never “final state”.
- **Contract tests**: client/server must share schemas and tests.
- **Incremental migration**: ship early, keep parity, then harden protocol.

## Phases
1. Compatibility Web client (minimal) – boot + login + load yard + render.
2. Feature parity per domain – build mode, maproom, combat, social.
3. Protocol hardening – switch to command-based server validation.
4. Cutover – deprecate Flash client, enforce version gate in `/init`.

See `docs/02-migration-backlog.md` for the precise plan.
