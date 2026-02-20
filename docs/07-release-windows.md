# Release: Desktop (Windows + macOS via Tauri)

## Build
```bash
npm run build
npm run tauri build
```

Outputs are typically under:
- `src-tauri/target/release/bundle/`

## Platform artifacts
- Windows (build on Windows host): `msi`, `nsis`
- macOS (build on macOS host): `.app`, `.dmg`

By default, targets are set automatically by host OS in `scripts/prepare-tauri-config.mjs`.
Optional explicit override:

```bash
BYMR_TAURI_TARGETS=msi,nsis npm run tauri build
BYMR_TAURI_TARGETS=app,dmg npm run tauri build
```

## Signing (recommended)
- Code sign your installer to reduce SmartScreen prompts.
- Keep signing keys offline and use CI with secrets carefully.
- macOS releases should be signed and notarized to avoid Gatekeeper warnings.

## Auto-update (optional)
Use Tauri updater once you have a stable release channel.

## CI build artifacts
- Workflow: `.github/workflows/build-clients.yml`
- Jobs:
  - `Build Web` -> artifact `bymr-web-dist`
  - `Build Desktop (windows)` -> artifact `bymr-desktop-windows`
  - `Build Desktop (macos)` -> artifact `bymr-desktop-macos`

## Orquestração via Docker
Para disparar os builds desktop de Windows/macOS e baixar artefatos sem instalar toolchain local:
```bash
export GH_TOKEN=seu_token_github
export BYMR_GH_REPO=owner/repo
docker compose --profile release run --rm desktop-release-orchestrator
```

Notas:
- O container `desktop-release-orchestrator` não compila localmente os binários de macOS/Windows em Linux.
- Ele dispara o workflow do GitHub Actions (runners nativos por SO) e baixa os artefatos em `dist/desktop-artifacts`.
