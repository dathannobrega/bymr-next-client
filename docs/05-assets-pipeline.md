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

## Risks
- Flash timeline animations need re-authoring (sprite sheets or spine-like data).
- Fonts may need re-creation.

## Acceptance for v1
- At least: buildings + terrain tiles + basic UI icons.
