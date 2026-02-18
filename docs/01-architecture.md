# Architecture

## Runtime
- **Renderer:** PixiJS (WebGL; Canvas fallback)
- **UI:** (phase 1) in-canvas HUD; (phase 2) optional DOM overlays
- **Desktop wrapper:** Tauri v2 (Windows .exe)

## Client modules
- `src/lib/api/*` – HTTP client for BYMR server routes
- `src/lib/auth/*` – token/session handling (desktop secure storage later)
- `src/game/*` – scene system, renderer, input, simulation client-side (visual only)

## Scene plan (target)
- BootScene
- LoginScene (Discord/auth integration per server)
- YardScene (view/build/attack modes)
- MapRoomScene (v2 & v3 per server)
- BattleScene (authoritative server replay)

## Backend assumptions (current server)
- `POST /init` performs version gate.
- Auth uses `Authorization: Bearer <token>` and validates token in Redis + user in Postgres.
- Save/load endpoints exist but are considered *legacy* and will be phased into command-based.
