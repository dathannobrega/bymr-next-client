# MIGRATION_STATUS

Checklist por épico com referência de PR(s).

## Fase 0 — Preparação & Visibilidade
- [x] 0.1 Leitura de `/docs` + resumo em `AGENTS.md`
- [x] 0.2 Checklist por épicos em `MIGRATION_STATUS.md`
- [x] 0.3 Inventário inicial de rotas do servidor em `server/docs/api-inventory.md`
- [x] 0.4 Contrato inicial `/init` + `/bm/getnewmap`
- [x] 0.5 Auditoria `client(legacy)` arquivo-a-arquivo em `docs/legacy-client-file-audit.md`
- [x] 0.6 Gate de exclusão do legado com tracker arquivo-a-arquivo em `docs/legacy-cutover-checklist.md` + `docs/legacy-migration-tracker.tsv`
- PRs: [PR fase 0/1](pending)

## E00 — Repo, tooling, standards
- [x] E00-S01 Repo bootstrap
- [x] E00-S02 Quality gates (lint/typecheck + vitest)
- [x] E00-S03 README/onboarding restaurado
- [x] E00-S04 CI GitHub Actions com `npm ci`, `typecheck`, `lint`, `test`, `build`
- [x] E00-S05 Docker Compose unificado na raiz (`client` + `server` + `postgres` + `redis`)
- [x] E00-S06 Workflow de build dos clientes (`.github/workflows/build-clients.yml`) com artefatos Web + Desktop (Windows/macOS)
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
- [x] E03-S02 `MoveBuilding` (cliente: Shift+Click com building selecionado; server valida e retorna delta)
- [x] E03-S03 `UpgradeBuilding` (cliente: Alt+Click no building; server valida e retorna delta)
- [x] E03-S04 `CancelUpgrade` (`/cmd`, com validação de estado pendente e delta canônico)
- [x] E03-S05 `CollectHarvester` (`/cmd`, coleta validada server-side + atualização de recursos em delta)
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
- [x] `/cmd` completo e auditoria
- [ ] Version gate final via `/init`
- [ ] Deprecação de `baseSave` para novo cliente
- PRs: —

## Auditoria de integração cliente <-> server (2026-02-20)
- [x] Gap A01 resolvido: `/api/:apiVersion/cmd` implementado com validação, idempotência Redis, seq e rate-limit por operação
- [x] Gap A02 resolvido: `POST /base/load` agora aceita contrato novo `{ baseId, mode }` e mantém compat legado
- [x] Gap A03 resolvido: `POST /base/save` agora aceita payload non-critical com `action/audit` + trilha de auditoria server-side
- [x] Gap A04 resolvido: LoginScene integrado ao `/api/:apiVersion/player/getinfo` (email/senha), com fallback de token manual para debug
- [x] Gap A05 resolvido: rotas `worldmapv3/*` saíram de placeholder para fluxo com dados reais de célula/mundo

## Próximos passos sugeridos
1. Adicionar testes de integração end-to-end (cliente + backend + Redis + Postgres) cobrindo replay/seq/rate-limit do `/cmd`.
2. Assinar envelopes `/cmd` (nonce + assinatura) para hardening anti-replay em release futura.
3. Fechar `version gate` final via `/init` no cutover.
4. Planejar deprecação das rotas legado de save para o cliente novo após telemetria de adoção.
