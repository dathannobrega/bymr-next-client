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
- [x] E02-S04 Terreno visível + fallback local de asset (`public/assets/yard/building-placeholder.png`) para evitar tela vazia sem CDN
- [x] E02-S05 Render hardening: câmera responsiva por viewport + textura real de building (`yardplanner/top.1.png`) + temas de terreno (`yardbg/*`) com fallback local/CDN (web + Tauri)
- PRs: —

## E03 — Build mode (server authoritative)
- [x] E03-S00 Cliente preparado para `/cmd` (`op/args/seq/idempotencyKey` + `ApiClient.cmd()`)
- [x] E03-S01 cliente integrado para ops reais (`PlaceBuilding`, `MoveBuilding`, `UpgradeBuilding`)
- [x] E03-S01 `PlaceBuilding` via `/cmd` (cliente: Shift+Click no YardScene, aplica delta canônico)
- [x] E03-S02 `MoveBuilding` (cliente: Shift+Click com building selecionado; server valida e retorna delta)
- [x] E03-S03 `UpgradeBuilding` (cliente: Alt+Click no building; server valida e retorna delta)
- [x] E03-S04 `CancelUpgrade` (`/cmd`, com validação de estado pendente e delta canônico)
- [x] E03-S05 `CollectHarvester` (`/cmd`, coleta validada server-side + atualização de recursos em delta)
- [x] E03-S06 `Place/Move` com validação de `footprint` legado (ocupação por área + bounds) e projeção de footprint no renderer
- PRs: —

## E04 — Maproom v2/v3
- [x] E04-S01 Integração cliente Maproom v3 (`/worldmapv3/initworldmap`, `/getcells`, `/relocate`) com contratos tipados + overlay runtime (`M`) no Yard
- [x] E04-S02 Ações avançadas maproom no novo cliente (`takeoverCell`, `transferassets`, bookmarks`) com contratos tipados + UI operacional no overlay
- [x] E04-S03 Paridade UX maproom avançada: filtros (`all/mine/enemy/free/damaged/protected`), painel detalhado de célula, lista rápida filtrada e navegação por coordenadas
- PRs: —

## E05 — Combat replay server-simulated
- [x] E05-S01 Baseline autoritativo: `POST /api/:apiVersion/combat/start` + stream `GET /api/:apiVersion/combat/replay/:replayId` (SSE com `ready/snapshot/frame/result`) e replay determinístico server-side
- [ ] E05-S02 Simulação de combate com regras completas de unidade/projétil/pathfinding equivalentes ao legado
- PRs: —

## E06 — Social
- [x] E06-S01 Baseline social no cliente novo: `GET /api/:apiVersion/worlds`, `GET /api/:apiVersion/leaderboards`, `GET /api/:apiVersion/attacklogs` com contratos tipados + overlay runtime (`L`) + smoke (`scripts/smoke-social.sh`)
- [x] E06-S02 Mensageria in-game (`getmessagethreads/getmessagethread/sendmessage/reportmessagethread`) integrada no cliente novo com contratos tipados + UI social (`threads/read/send/report`) + smoke (`scripts/smoke-mail.sh`)
- PRs: —

## E10 — Security hardening / cutover
- [x] E10-S00 DesktopSecureTokenStore com keyring/keychain (Tauri command)
- [x] E10-S01 Baseline de connect-src mais restrito e parametrizado por ambiente (CSP Tauri + allowlist runtime)
- [x] E10-S01 (protocolo): snapshot canônico `GET /api/:apiVersion/state` com contrato tipado (`player/base/progression/resources/buildings/maproom`) e query `scope/baseId`
- [x] E10-S02 Stream de estado autenticado `GET /api/:apiVersion/stream` (SSE) com snapshot inicial + heartbeat + deltas de `/cmd`; YardScene conectado com reconexão e dedupe por `seq`
- [x] `/cmd` completo e auditoria
- [x] Version gate final via `/init` (apiVersion + build gate opcional + CTA de download)
- [x] E10-S02 Guardrail automatizado contra regressão legado em runtime (`npm run guard:legacy-runtime`)
- [x] Deprecação gradual de `baseSave` para novo cliente via feature flag server (`DISABLE_NEXT_CLIENT_BASE_SAVE`) + erro estruturado (`NEXT_CLIENT_BASE_SAVE_DEPRECATED`)
- [x] Cutover canônico: gate opcional para deprecar `baseLoad` no next-client (`DISABLE_NEXT_CLIENT_BASE_LOAD`) + sinalização de protocolo no `/init` (`protocol.canonicalStateRequired`)
- PRs: —

## Auditoria de integração cliente <-> server (2026-02-20)
- [x] Gap A01 resolvido: `/api/:apiVersion/cmd` implementado com validação, idempotência Redis, seq e rate-limit por operação
- [x] Gap A02 resolvido: `POST /base/load` agora aceita contrato novo `{ baseId, mode }` e mantém compat legado
- [x] Gap A03 resolvido: `POST /base/save` agora aceita payload non-critical com `action/audit` + trilha de auditoria server-side
- [x] Gap A04 resolvido: LoginScene integrado ao `/api/:apiVersion/player/getinfo` (email/senha), com fallback de token manual para debug
- [x] Gap A05 resolvido: rotas `worldmapv3/*` saíram de placeholder para fluxo com dados reais de célula/mundo
- [x] Gap A06 resolvido: `base/load` next-client agora inclui `yardTheme`; cliente renderiza tema do mapa e evita “tela vazia” com fallback robusto de assets
- [x] Gap A07 resolvido: hardening de auth (`getnewmap` com token obrigatório no client + sanitização `null/undefined`; middleware server reforçado contra bearer inválido)
- [x] Gap A08 resolvido: migração parcial de footprint legado (`assets/legacy-footprints.json`) aplicada no `/cmd` e no YardScene para reduzir divergência com client antigo
- [x] Gap A09 resolvido: `/init` expandido com metadados de runtime/plataforma/build + gate opcional de build e `downloadUrl` para update UX
- [x] Gap A10 resolvido: `base/save` agora suporta gate de deprecação para next-client (flag `DISABLE_NEXT_CLIENT_BASE_SAVE`) sem quebrar compatibilidade do payload legado
- [x] Gap A11 resolvido: endpoint canônico `/api/:apiVersion/state` implementado e integrado no boot do cliente com fallback controlado para `/base/load`
- [x] Gap A12 resolvido: stream de estado (`/api/:apiVersion/stream`) implementado com auth + push de deltas de `/cmd`; cliente conectado com parser SSE autenticado e reconexão progressiva
- [x] Gap A13 resolvido: `/init` agora sinaliza modo canônico estrito; cliente desativa fallback legado quando `protocol.canonicalStateRequired=true`; server pode bloquear payload next-client em `/base/load` via flag
- [x] Gap A14 resolvido: cliente integrou fluxo funcional de Maproom v3 (init/getcells/relocate) com overlay em runtime e smoke test dedicado
- [x] Gap A15 resolvido: cliente integrou takeover/transfer/bookmarks com payloads legados tipados, seleção de célula/origem/destino no overlay e smoke de validação de rotas críticas maproom
- [x] Gap A16 resolvido: overlay maproom ganhou filtros operacionais, painel de detalhes da célula, lista auxiliar de resultados filtrados e jump por coordenadas (fechando E04-S03)
- [x] Gap A17 resolvido: combate autoritativo baseline implementado com sessão de replay server-side (`combat/start`) e stream SSE (`combat/replay/:replayId`) consumido pelo cliente novo
- [x] Gap A18 resolvido: social baseline integrado no cliente novo com contratos tipados para `worlds/leaderboards/attacklogs`, overlay runtime (`L`) e smoke Docker dedicado
- [x] Gap A19 resolvido: LoginScene com criação de conta (`/player/register`) + validação de token persistido (fallback quando inválido) e smoke de bootstrap de conta/base (`scripts/smoke-auth-bootstrap.sh`)
- [x] Gap A20 resolvido: mensageria integrada no cliente novo (`getmessagetargets/getmessagethreads/getmessagethread/sendmessage/reportmessagethread`) com overlay social, contratos tipados, smoke dedicado (`scripts/smoke-mail.sh`) e hardening server-side para usuários sem `save` em fluxo de unread mail
- [x] Gap A21 resolvido: cobertura robusta de hardening do `/cmd` com smoke dedicado (`scripts/smoke-cmd-hardening.sh`) validando idempotência, `SEQ_OUT_OF_ORDER`, `INVALID_ENVELOPE`, `INVALID_ARGS`, `INVALID_BUILDING_TYPE`, `ANTI_REPLAY` e `RATE_LIMIT`
- [x] Gap A22 resolvido: hardening de validação de auth (`register/login/reset`) com tratamento global de `ZodError` -> `400 VALIDATION_ERROR` (sem `500`) + ajuste de UX no LoginScene (username 2-12 + política de senha)
- [x] Gap A23 resolvido: container de orquestração para builds desktop Windows/macOS via GitHub Actions (`desktop-release-orchestrator` + `scripts/build-desktop-artifacts-via-gh.sh`)
- [x] Gap A24 resolvido: progresso adicional no `legacy-migration-tracker.tsv` com fluxos `scripts/ATTACK.as`, `scripts/BUILDINGS.as`, `scripts/BUILDINGOPTIONS.as` e `scripts/ERRORMESSAGE.as` movidos de `pending` para `in_progress` com evidências
- [x] Gap A25 resolvido: parser de erro HTTP do client agora suporta envelope `errorDetails` (`code/traceId/issues`) além do contrato estruturado padrão, melhorando feedback de validação sem perder contexto de rota
- [x] Gap A26 resolvido: fluxo `BUILDINGOPTIONS/BUILDINGOPTIONSPOPUP` migrado para painel `Building Ops` no Yard (`click` para tile + botões place/move/upgrade/cancel/collect + filtro de catálogo legado)
- [x] Gap A27 resolvido: login voltou a aceitar senha em formato legado (política forte mantida em `register/reset`) para preservar compatibilidade de contas antigas durante o cutover
- [x] Gap A28 resolvido: tracker legado atualizado com `scripts/BUILDINGOPTIONS.as` e `scripts/BUILDINGOPTIONSPOPUP.as` em `migrated`, `scripts/BUILDINGOPTIONSPOPUP_CLIP.as` em `archived` e contagens recalculadas (`pending=442`, `in_progress=7`, `migrated=21`, `archived=1`)

## Validação Docker (2026-02-20)
- [x] Client gate: `typecheck`, `lint`, `test` (41 testes), `build`, `guard:legacy-runtime`
- [x] Server gate: `bunx tsc --noEmit`
- [x] Smokes end-to-end:
  - `scripts/smoke-auth-bootstrap.sh`
  - `scripts/smoke-state-snapshot.sh`
  - `scripts/smoke-state-stream.sh`
  - `scripts/smoke-maproom-v3.sh`
  - `scripts/smoke-combat-replay.sh`
  - `scripts/smoke-social.sh`
  - `scripts/smoke-mail.sh`
  - `scripts/smoke-cmd-hardening.sh`

## Próximos passos sugeridos
1. Evoluir E05 para regras de combate completas (unidades, torres, skills e loot final) com equivalência detalhada ao legado.
2. Expandir testes automáticos server-side para cenários de concorrência (thread/message + cmd simultâneo) e cobertura de combate avançado.
3. Assinar envelopes `/cmd` (nonce + assinatura) para hardening anti-replay em release futura.
