# Dev Setup (Web + Desktop)

## Prereqs
- Node.js 20+
- Git
- Rust toolchain (stable)
- Platform toolchain for desktop build:
  - Windows: Visual Studio Build Tools (C++ workload)
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: GTK/WebKit2GTK dependencies for Tauri

## Install
```bash
git clone <your-repo>
cd bymr-client-next
npm install
```

## Run (web)
```bash
npm run dev
```

## Run (desktop)
Tauri uses your Vite dev server.
```bash
npm run tauri dev
```

If Tauri CLI isn't found, ensure `@tauri-apps/cli` is installed and Rust is on PATH.

## Desktop targets
`scripts/prepare-tauri-config.mjs` now sets bundle targets by host OS automatically:
- Windows host: `msi,nsis`
- macOS host: `app,dmg`
- Linux host: `appimage,deb`

Override manually when needed:
```bash
BYMR_TAURI_TARGETS=app,dmg npm run tauri build
```

## CI builds
- Quality gates: `.github/workflows/ci.yml`
- Client artifacts (web + desktop): `.github/workflows/build-clients.yml`

## Config
Create `config.local.json` (see root README).

## Backend
Run BYMR server locally and point `baseUrl` to it.
