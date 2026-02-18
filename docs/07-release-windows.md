# Release: Windows .exe / Installer (Tauri)

## Build
```powershell
npm run build
npm run tauri build
```

Outputs are typically under:
- `src-tauri/target/release/bundle/`

## Signing (recommended)
- Code sign your installer to reduce SmartScreen prompts.
- Keep signing keys offline and use CI with secrets carefully.

## Auto-update (optional)
Use Tauri updater once you have a stable release channel.
