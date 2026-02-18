# MIGRATION_STATUS

Checklist por épico com referência de PR(s).

## Fase 0 — Preparação & Visibilidade
- [x] 0.1 Leitura de `/docs` + resumo em `AGENTS.md`
- [x] 0.2 Checklist por épicos em `MIGRATION_STATUS.md`
- [x] 0.3 Inventário inicial de rotas do servidor em `server/docs/api-inventory.md`
- [x] 0.4 Contrato inicial `/init` + `/bm/getnewmap`
- PRs: [PR fase 0/1](pending)

## E00 — Repo, tooling, standards
- [x] E00-S01 Repo bootstrap
- [x] E00-S02 Quality gates (lint/typecheck + vitest)
- PRs: [PR fase 0/1](pending)

## E01 — Compatibility bootstrap
- [x] E01-S01 `/init` handshake + bloqueio de versão
- [x] E01-S02 LoginScene + TokenStore sem localStorage
- [x] E01-S03 `getnewmap` bootstrap
- [x] E01-S04 `baseLoad` mínimo + parser/render placeholder
- [ ] E01-S05 `baseSave` restrito para ações não críticas
- PRs: [PR fase 0/1](pending)

## E02 — Yard renderer (visual parity)
- [ ] E02-S01 Grid/isometria/câmera
- [ ] E02-S02 Sprite pipeline v1
- [ ] E02-S03 Selection/hover/tooltips
- PRs: —

## E03 — Build mode (server authoritative)
- [ ] E03-S01 `PlaceBuilding` via `/cmd`
- [ ] E03-S02 `MoveBuilding`
- [ ] E03-S03 `UpgradeBuilding`
- PRs: —

## E04 — Maproom v2/v3
- [ ] Planejado
- PRs: —

## E05 — Combat replay server-simulated
- [ ] Planejado
- PRs: —

## E06 — Social
- [ ] Planejado
- PRs: —

## E10 — Security hardening / cutover
- [ ] `/cmd` completo e auditoria
- [ ] Version gate final via `/init`
- [ ] Deprecação de `baseSave` para novo cliente
- PRs: —
