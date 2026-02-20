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
- [x] E00-S03 README/onboarding restaurado
- [x] E00-S04 CI GitHub Actions com `npm ci`, `typecheck`, `lint`, `test`, `build`
- [x] E00-S05 Docker Compose unificado na raiz (`client` + `server` + `postgres` + `redis`)
- PRs: [PR fase 0/1](pending)

## E01 — Compatibility bootstrap
- [x] E01-S01 `/init` handshake + bloqueio de versão
- [x] E01-S02 LoginScene + TokenStore sem localStorage
- [x] E01-S03 `getnewmap` bootstrap
- [x] E01-S04 `baseLoad` mínimo + parser/render placeholder
- [x] E01-S05 `baseSave` restrito para ações não críticas + trilha de auditoria client-side
- [x] E01-S06 Contract tests com Zod para `/init` e `/bm/getnewmap` (fetch mock)
- [x] E01-S07 UX de boot: tela “update required” para `versionMismatch`
- PRs: [PR fase 0/1](pending)

## E02 — Yard renderer (visual parity)
- [x] E02-S01 Grid/isometria/câmera
- [x] E02-S02 Sprite pipeline v1 (atlas via cdnUrl com fallback seguro)
- [x] E02-S03 Selection/hover/tooltips
- PRs: —

## E03 — Build mode (server authoritative)
- [x] E03-S00 Cliente preparado para `/cmd` (`op/args/seq/idempotencyKey` + `ApiClient.cmd()`)
- [x] E03-S01 cliente integrado para ops reais (`PlaceBuilding`, `MoveBuilding`, `UpgradeBuilding`)
- [x] E03-S01 `PlaceBuilding` via `/cmd` (cliente: Shift+Click no YardScene, aplica delta canônico)
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
- [x] E10-S00 DesktopSecureTokenStore com keyring/keychain (Tauri command)
- [x] E10-S01 Baseline de connect-src mais restrito e parametrizado por ambiente (CSP Tauri + allowlist runtime)
- [ ] `/cmd` completo e auditoria
- [ ] Version gate final via `/init`
- [ ] Deprecação de `baseSave` para novo cliente
- PRs: —

## Auditoria de integração cliente <-> server (2026-02-20)
- [ ] Gap A01: `/api/:apiVersion/cmd` ainda não existe no backend (cliente já envia `PlaceBuilding/MoveBuilding/UpgradeBuilding`)
- [ ] Gap A02: contrato de `POST /base/load` divergente (cliente envia `{ baseId, mode }`; server espera `{ baseid, type, userid }`)
- [ ] Gap A03: contrato de `POST /base/save` divergente (cliente envia payload non-critical com `action/audit`; server espera schema legado Flash)
- [ ] Gap A04: LoginScene ainda usa input manual de token; fluxo login por `/api/:apiVersion/player/getinfo` não está integrado no cliente
- [ ] Gap A05: respostas de MR3 no server ainda estão em modo placeholder (`/worldmapv3/*`)

## Próximos passos sugeridos
1. Publicar no backend `/api/:apiVersion/cmd` as validações autoritativas e idempotência Redis por `userId + idempotencyKey`.
2. Adicionar testes de integração end-to-end (cliente + backend) cobrindo replay/seq e rate-limit por operação.
3. Assinar envelopes `/cmd` (nonce + assinatura) para hardening anti-replay em release futura.
4. Evoluir auditoria de `baseSave` para logs server-side com correlação por `traceId`.
