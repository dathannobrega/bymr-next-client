# Dev Setup (Windows)

## Prereqs
- Node.js 20+
- Git
- Rust toolchain (stable)
- Visual Studio Build Tools (C++ workload) for Windows builds

## Install
```powershell
git clone <your-repo>
cd bymr-client-next
npm install
```

## Run (web)
```powershell
npm run dev
```

## Run (desktop)
Tauri uses your Vite dev server.
```powershell
npm run tauri dev
```

If Tauri CLI isn't found, ensure `@tauri-apps/cli` is installed and Rust is on PATH.

## Config
Create `config.local.json` (see root README).

## Backend
Run BYMR server locally and point `baseUrl` to it.
