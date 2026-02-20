# Assets Pipeline (SWF → Modern Atlases)

## Goal
Extract art/audio from Flash-era assets and rebuild them into:
- `atlases/*.json + *.png/webp`
- `audio/*.ogg` (or mp3 where needed)
- `fonts/` (bitmap fonts or web fonts)

## Suggested workflow
1) **Extract** from SWF using a Flash decompiler tool (e.g., JPEXS) – export shapes/bitmaps.
2) Normalize:
   - convert to PNG (lossless)
   - standardize pivot/origin metadata
3) **Pack** with TexturePacker or similar:
   - output Pixi-compatible JSON atlas
4) Audio:
   - export raw
   - convert to OGG (desktop/web friendly)
5) Version assets:
   - immutable hashed filenames
   - serve via `cdnUrl`

## Tracking
Maintain `assets/manifest.json`:
- version
- atlas list
- audio list
- checksum

Maintain legacy numeric mapping in `assets/legacy-id-map.json`:
- `buildingTypeMap` (`legacy_id -> semantic_key`)
- grow this file incrementally while migrating `client(legacy)/images/*` numeric assets.

Maintain legacy footprint mapping in `assets/legacy-footprints.json`:
- `footprints[buildingType] -> { widthPx, heightPx, width, height }`
- source: legacy constructors (`BUILDING*.as`) and conversion heuristic documented in file.

Current migration baseline:
- `assets/manifest.json` now tracks yard v1 assets reused from legacy (`yardbg/*` + `yardplanner/top.1.png`).
- Client runtime loads terrain/building textures from CDN first and local packaged assets as fallback (works in web + Tauri).
- Re-sync helper: `npm run assets:sync-yard` (copies `server/public/assets/yardbg` + `yardplanner/top.1.png` to `public/assets/*`).
- Footprint migration baseline: shared legacy footprint catalog consumed by renderer and `/cmd` occupancy validation.

## Risks
- Flash timeline animations need re-authoring (sprite sheets or spine-like data).
- Fonts may need re-creation.

## Acceptance for v1
- At least: buildings + terrain tiles + basic UI icons.
