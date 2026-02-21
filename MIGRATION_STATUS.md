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
- [x] E05-S02 Simulação de combate com regras completas de unidade/projétil/pathfinding equivalentes ao legado
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
- [x] Gap A29 resolvido: migração de `BUILDINGSPOPUP/BUILDINGBUTTON/BUILDINGSARROW` para o novo `Building Ops` com abas (`resources/buildings/defensive/decorations`), subabas de decoração, paginação de 10 itens, cards com status por quantidade e fallback `coming soon`; tracker atualizado (`pending=434`, `in_progress=8`, `migrated=23`, `archived=6`)
- [x] Gap A30 resolvido: suíte Docker reexecutada após migração do catálogo (`typecheck/lint/test/build/guard`, `bunx tsc --noEmit` e 8 smoke tests E2E) sem regressões
- [x] Gap A31 resolvido: `BUILDINGINFO` evoluído no novo client com matriz de ações contextuais por building (`upgrade/cancel/collect/collect-all/maproom/social`) e ações não migradas marcadas explicitamente como pendentes (`store/hatchery/bunker/housing/juice/lockers/baiter`)
- [x] Gap A32 resolvido: overlays `Maproom` e `Social` passaram a suportar abertura programática (`open()`), permitindo paridade de atalhos contextuais vindos do painel de building
- [x] Gap A33 resolvido: suíte Docker reexecutada após contexto de `BUILDINGINFO` (`typecheck/lint/test/build/guard`, `bunx tsc --noEmit` e 8 smoke tests E2E) sem regressões
- [x] Gap A34 resolvido: `ERRORMESSAGE` migrado para modal global de erro no novo client (captura `error/unhandledrejection` + fatal startup), com payload estruturado (`code/traceId/issue`) derivado de `ClientHttpError`
- [x] Gap A35 resolvido: tracker legado atualizado com `scripts/ERRORMESSAGE.as` em `migrated` e `scripts/ERRORMESSAGE_CLIP.as` em `archived`, com contagens recalculadas (`pending=433`, `in_progress=7`, `migrated=24`, `archived=7`)
- [x] Gap A36 resolvido: `/cmd` expandido com `PurchaseStoreItem` (idempotência/seq/rate-limit), dedução de créditos autoritativa e deltas canônicos `setCredits` + `setStoreItem`; endpoint autenticado `GET /api/:apiVersion/store/catalog` entregue para catálogo real no client
- [x] Gap A37 resolvido: `BUILDINGINFO` fechado com fluxos reais no novo client (`open_store/open_hatchery/open_bunker/open_housing/open_juice/open_lockers/open_baiter`) via overlay operacional de compras + persistência autoritativa em `/cmd`
- [x] Gap A38 resolvido: `open_yard_planner` migrado com fluxo real (listar/salvar templates via `bm/yardplanner/gettemplates` e `bm/yardplanner/savetemplate`) integrado no overlay de building
- [x] Gap A39 resolvido: `BUILDINGS` fechado com paridade de compra/store no catálogo (`SKU/custo/estoque` por card, compra direta e sincronização de inventário/créditos no estado local)
- [x] Gap A40 resolvido: `BRESOURCE/BFOUNDATION/BUILDING14` avançados no autoritativo com regras adicionais (`TOWN_HALL_REQUIRED`, `TOWN_HALL_ALREADY_EXISTS`, limites de prédios únicos, upgrade estritamente +1 nível e bloqueio de coleta em harvester ocupado/danificado)
- [x] Gap A41 resolvido: tracker legado atualizado com `scripts/BUILDINGINFO.as` e `scripts/BUILDINGS.as` em `migrated`, contagens recalculadas (`pending=433`, `in_progress=5`, `migrated=26`, `archived=7`)
- [x] Gap A42 resolvido: suíte Docker reexecutada após fechamento de fluxos (`typecheck/lint/test/build/guard`, `bunx tsc --noEmit` e 8 smoke tests E2E) sem regressões
- [x] Gap A43 resolvido: `ATTACK` evoluído além do baseline para replay determinístico baseado em estado real (`monsters.housed` + `buildingdata`), com prioridades de alvo por grupo, DPS por tick dependente de composição, vitória por destruição do HQ e loot proporcional ao dano aplicado
- [x] Gap A44 resolvido: `/cmd` passou a aplicar regras legadas reais de `YARD_PROPS` para `PlaceBuilding/UpgradeBuilding` (limites `quantityByTownHall`, requirements por nível e custos de build/upgrade com `setResources`) via `legacyMainYardRules`
- [x] Gap A45 resolvido: `CollectHarvester` alinhado ao main yard legado (coletores suportados `building-1..4`), removendo mapeamento incorreto de `5..8` para coleta
- [x] Gap A46 resolvido: `register` endurecido com `safeParse` + erro cliente `400 VALIDATION_ERROR` (sem queda para `500` em payload inválido)
- [x] Gap A47 resolvido: smoke `/cmd` reforçado para validar dedução de recursos no place, gate de limite por TH e bloqueio `INSUFFICIENT_RESOURCES`; suíte Docker completa reexecutada sem regressões
- [x] Gap A48 resolvido: progresso temporal legado aplicado de forma autoritativa no servidor (`build/upgrade/fortify` countdown + produção de coletores `building-1..4`) via `applyLegacyBuildingProgress`, integrado em `/cmd`, `/state`, `/base/load` e snapshot inicial do stream
- [x] Gap A49 resolvido: migração de imagens do catálogo de construções com thumbs legadas reais (`assets/building-thumbnail-map.json` + `buildingbuttons/*`) no `Building Ops`, com fallback para textura de building e sync automático no pipeline `assets:sync-yard`
- [x] Gap A50 resolvido: smoke `/cmd` expandido para validar progressão temporal de countdown deferido via `/state`; suíte Docker completa reexecutada após mudanças sem regressões
- [x] Gap A51 resolvido: snapshot canônico `/state` ampliado com `storeData` tipado (`q/e`) e consumo no bootstrap do client (`stateSnapshotToParsedBaseLoad`), reduzindo divergência com inventário real da store
- [x] Gap A52 resolvido: `stream` de estado passou a emitir `snapshot` de `resync` quando há progresso temporal legado em conexão aberta (contadores/produção), mantendo sincronismo autoritativo sem depender de novo `/cmd`
- [x] Gap A53 resolvido: `ATTACK` fechado para E05-S02 com motor determinístico de combate avançado (pathfinding por perfil, projéteis com tempo de voo, skills `explode/splits/zombie/support`, torres por range/cooldown/projétil e seleção de alvo por prioridade legada)
- [x] Gap A54 resolvido: fechamento final de `BFOUNDATION/BRESOURCE/BUILDING14` via `legacyBuildingRuleEffects` aplicado em `/cmd` (place/upgrade/collect) e no ticker temporal (`maxHp`, reparo, capacidade/ciclo/produção de coletores e clamp autoritativo)
- [x] Gap A55 resolvido: revalidação Docker pós-fechamento (`client typecheck/build`, `server bunx tsc --noEmit`, `smoke-cmd-hardening.sh`, `smoke-combat-replay.sh`) sem regressões
- [x] Gap A56 resolvido: paridade visual do yard avançada com port do modelo legado de câmera (`MAP/GLOBAL`: clamp de pan por viewport, zoom legado `1x/0.5x`, magnificação wheel `0.6..2.75`), origem isométrica centralizada e ajuste de escala de sprites para reduzir divergência de proporção GUI vs client Flash; cobertura unitária adicionada para regras de bounds/smoothing
- [x] Gap A57 resolvido: viewport legado fixo (`760x670`) no runtime Pixi com letterbox responsivo e manutenção de aspect ratio, removendo variação de escala/tamanho do yard entre resoluções; cobertura unitária adicionada para cálculo de layout (`computeLegacyViewportLayout`)
- [x] Gap A58 resolvido: migração robusta de paridade visual `UI2` no next-client com `LegacyHUD` completo (top/bottom HUD, botões, tipografia legada `GROBOLD/Verdana`, linha de status e atalhos operacionais para build/store/map/social/zoom/collect), além de skin legacy aplicada às janelas de `Building Ops`, `Store Flow`, `Maproom` e `Social`
- [x] Gap A59 resolvido: pipeline `assets:sync-yard` expandido para sincronizar assets legados de HUD/janelas (`assets/legacy-ui-map.json`: frames + ícones + fontes) e tracker atualizado para itens `frame1_*`, `frame_button_*` e fontes usadas no HUD
- [x] Gap A60 resolvido: fechamento de paridade visual das janelas restantes com layout legacy orientado a classes (sem inline CSS em conteúdo dinâmico) para `Building Ops`, `Store Flow`, `Yard Planner`, `Maproom` e `Social`, incluindo estados de catálogo/listas/tabelas/cards no padrão visual UI2
- [x] Gap A61 resolvido: skin de janela legado ampliado com `frame2_*`, `frame3_*` e `bmp_overlaytext` em produção (`assets/legacy-ui-map.json` + `src/style.css`), aplicando variantes reais de frame por overlay (`Building/Flow=frame2`, `Maproom/Social=frame3`)
- [x] Gap A62 resolvido: recontagem do tracker após esta etapa (`pending=395`, `in_progress=1`, `migrated=68`, `archived=7`)
- [x] Gap A63 resolvido: `ACADEMY` migrou para fluxo autoritativo em `/cmd` com `StartAcademyUpgrade`/`CancelAcademyUpgrade`/`FinishAcademyUpgradeNow`, validações legadas (locker unlock, gate por nível do building 26, custo em `r3`, speedup por créditos), progressão temporal server-side e exposição canônica no `/state`/`/stream`
- [x] Gap A64 resolvido: cliente novo integrou overlay Academy real (lista de monstros, status de treino, start/cancel/finalização instantânea + refresh de snapshot), consumindo `academy` no estado base e em deltas (`setAcademyState`); tracker atualizado para (`pending=391`, `in_progress=1`, `migrated=71`, `archived=8`)
- [x] Gap A65 resolvido: `BASE/Yard Planner` avançado para fluxo autoritativo completo de aplicação de layout via `/cmd ApplyYardPlannerTemplate` (validação server-side de template/ocupação/bounds/building busy + deltas `moveBuilding`), com integração no overlay (`Aplicar slot`) e alinhamento do save com regra legada (ignorar type `7` no template)
- [x] Gap A66 resolvido: bloco pendente de wrappers `BasePlanner*` (símbolos Flash `reference_only`) foi fechado como `archived` no tracker, com evidência do overlay runtime no novo client e fluxo autoritativo no `/cmd`; contagens recalculadas (`pending=370`, `in_progress=1`, `migrated=71`, `archived=29`)
- [x] Gap A67 resolvido: `BASE` ganhou fluxo autoritativo de reparo (`StartRepairBuilding`/`StartRepairAllBuildings`) com estado explícito `hp/maxHp/repairing` no `/state` e nos deltas (`setBuildingRepairState`), integração no `YardScene` (botões/contexto/atalho `R`) e tick de reparo controlado por estado (sem auto-heal implícito)

## Validação Docker (2026-02-20)
- [x] Client gate: `typecheck`, `lint`, `test` (53 testes), `build`, `guard:legacy-runtime`
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

## Validação Docker (2026-02-21)
- [x] Client gate: `assets:sync-yard`, `typecheck`, `lint`, `test` (57 testes), `build`, `guard:legacy-runtime`
- [x] Server gate: `docker compose exec -T server bunx tsc --noEmit`
- [x] Smokes end-to-end (suite completa):
  - `scripts/smoke-auth-bootstrap.sh`
  - `scripts/smoke-state-snapshot.sh`
  - `scripts/smoke-state-stream.sh`
  - `scripts/smoke-maproom-v3.sh`
  - `scripts/smoke-combat-replay.sh` (com validações reforçadas de SSE/payload/monotonicidade)
  - `scripts/smoke-social.sh`
  - `scripts/smoke-mail.sh`
  - `scripts/smoke-cmd-hardening.sh`
- [x] Revalidação incremental pós-paridade GUI legado: `docker compose run --rm --no-deps client` (`typecheck`, `test` com 63 testes totais, `build`) + `docker compose run --rm --no-deps server` (`bunx tsc --noEmit`)
- [x] Revalidação incremental pós-viewport legado: `docker compose run --rm --no-deps client` (`typecheck`, `lint`, `test` com 66 testes totais, `build`) + `docker compose run --rm --no-deps server` (`bunx tsc --noEmit`)
- [x] Revalidação incremental pós-UI2/HUD legado: `docker compose run --rm --no-deps client` (`assets:sync-yard`, `typecheck`, `lint`, `test` com 66 testes totais, `build`) + `docker compose run --rm --no-deps server` (`bunx tsc --noEmit`)
- [x] Revalidação incremental pós-paridade visual completa de overlays/UI2: `docker compose run --rm --no-deps client` (`assets:sync-yard`, `typecheck`, `lint`, `test` com 66 testes totais, `build`) + `docker compose run --rm --no-deps server` (`bun install --frozen-lockfile`, `bunx tsc --noEmit`) + smokes E2E (`scripts/smoke-maproom-v3.sh`, `scripts/smoke-social.sh`, `scripts/smoke-mail.sh`, `scripts/smoke-cmd-hardening.sh`)
- [x] Revalidação incremental pós-migração Academy: `docker compose run --rm --no-deps client` (`typecheck`, `lint`, `test` com 69 testes totais, `build`) + `docker compose run --rm --no-deps server` (`bun install --frozen-lockfile`, `bunx tsc --noEmit`) + smokes focados (`scripts/smoke-state-snapshot.sh`, `scripts/smoke-state-stream.sh`, `scripts/smoke-cmd-hardening.sh`) e regressão cruzada (`scripts/smoke-maproom-v3.sh`, `scripts/smoke-social.sh`, `scripts/smoke-mail.sh`)
- [x] Revalidação incremental pós-`BASE` Yard Planner autoritativo: `docker compose run --rm --no-deps client` (`typecheck`, `lint`, `test` com 70 testes totais, `build`) + `docker compose run --rm --no-deps server` (`bun install --frozen-lockfile`, `bunx tsc --noEmit`) + smoke atualizado `scripts/smoke-cmd-hardening.sh` (inclui `ApplyYardPlannerTemplate`)
- [x] Revalidação incremental pós-`BASE` repair autoritativo: `docker compose run --rm --no-deps client` (`typecheck`, `lint`, `test` com 71 testes totais, `build`) + `docker compose run --rm --no-deps server` (`bun install --frozen-lockfile`, `bunx tsc --noEmit`) + smoke atualizado `scripts/smoke-cmd-hardening.sh` (inclui `StartRepairAllBuildings`)

## Próximos passos sugeridos
1. Expandir testes automáticos server-side para cenários de concorrência (thread/message + cmd simultâneo) e cobertura específica de balanceamento de combate avançado.
2. Assinar envelopes `/cmd` (nonce + assinatura) para hardening anti-replay em release futura.
3. Planejar fase de remoção física de `client(legacy)` com gate final de cutover e monitoramento pós-release.
