# Auditoria de Integracao Client <-> Server (2026-02-20)

## Escopo
- Cliente (`src/*`)
- Serverside (`server/src/*`)
- Documentação de migração (`docs/*`, `MIGRATION_STATUS.md`)

## Resumo executivo
- A integração cliente/server evoluiu para um estado funcional mais robusto.
- O backend agora implementa `/api/:apiVersion/cmd` com envelope validado, idempotência Redis e controle de sequência.
- `base/load` e `base/save` aceitam o contrato novo sem quebrar o fluxo legado.
- `base/save` do next-client pode ser bloqueado progressivamente por feature flag (`DISABLE_NEXT_CLIENT_BASE_SAVE`) para forçar `/cmd`.
- `base/load` do next-client pode ser bloqueado progressivamente por feature flag (`DISABLE_NEXT_CLIENT_BASE_LOAD`) para forçar `/state`.
- Novo snapshot canônico `GET /api/:apiVersion/state` implementado para o next-client (sem blobs stringificados).
- Novo stream canônico `GET /api/:apiVersion/stream` implementado (SSE autenticado com snapshot inicial + deltas de `/cmd`).
- Combate baseline autoritativo implementado com sessão de replay server-side (`POST /api/:apiVersion/combat/start`) + stream SSE (`GET /api/:apiVersion/combat/replay/:replayId`).
- Login do cliente foi integrado ao endpoint real `/api/:apiVersion/player/getinfo`.
- Endpoints `worldmapv3/*` deixaram de ser placeholder e passaram a usar dados reais de célula/mundo.
- Cliente novo agora consome `worldmapv3/initworldmap`, `worldmapv3/getcells` e `worldmapv3/relocate` com contratos tipados e UI de operação.
- Cliente novo agora executa ações avançadas de maproom (`takeoverCell`, `transferassets`, `savebookmarks`) com payloads legados encapsulados em contratos tipados.
- Cliente novo agora integra social baseline (`worlds`, `leaderboards`, `attacklogs`) com contratos tipados, métodos de API e overlay runtime (`L`).
- Cliente novo agora integra mensageria in-game (`getmessagetargets`, `getmessagethreads`, `getmessagethread`, `sendmessage`, `reportmessagethread`) com contratos tipados e UI no overlay social.
- Login bootstrap do cliente novo foi reforçado com:
  - criação de conta no próprio login overlay (`/player/register`),
  - validação de token persistido no startup (limpa token inválido e evita boot quebrado).
- Validação de auth no server foi endurecida para erros de contrato:
  - `ZodError` agora retorna `400` estruturado (`VALIDATION_ERROR`) no interceptor global, evitando falhas `500` em payload inválido.

## Matriz por contrato crítico

### `POST /init`
- Status: **OK (compatível + hardening)**
- Cliente envia `apiVersion` + metadados (`runtime`, `platform`, `clientBuild`).
- Servidor valida versão e agora suporta gate opcional por build (`REQUIRED_CLIENT_BUILD`).
- Quando há bloqueio, resposta inclui `requiredClientBuild` e `downloadUrl` para UX de atualização (`426 Upgrade Required`, `code=VERSION_MISMATCH`).
- BootScene exibe CTA de download quando `downloadUrl` é fornecido.
- `/init` agora expõe capacidades de protocolo (`protocol.canonicalStateRequired`, `protocol.legacyBaseLoadFallbackAllowed`, `protocol.stateStreamRequired`) para rollout controlado do corte legado.

### `GET/POST /api/:apiVersion/bm/getnewmap`
- Status: **OK (compatível)**
- Contrato principal está espelhado no cliente.
- Cliente agora exige token antes de chamar para evitar erro de bearer inválido no server.

### `GET /worldmapv3/initworldmap` + `POST /worldmapv3/getcells` + `POST /worldmapv3/relocate`
- Status: **Integrado no cliente novo**
- Cliente possui contratos Zod para payload/resposta dessas rotas.
- Runtime disponibiliza overlay maproom (atalho `M`) com:
  - carregamento da célula inicial do jogador
  - consulta de janelas de células
  - relocação de base com refresh automático
- Smoke test dedicado em Docker: `./scripts/smoke-maproom-v3.sh`.

### `POST /worldmapv2/takeoverCell` + `POST /worldmapv2/transferassets` + `POST /api/:apiVersion/player/savebookmarks`
- Status: **Integrado no cliente novo (E04-S02)**
- Cliente encapsula payload legado (campos stringificados) em métodos tipados:
  - `worldmapTakeoverCellV2`
  - `worldmapTransferAssetsV2`
  - `saveMaproomBookmarks`
- Overlay maproom suporta:
  - seleção de célula para takeover com `shiny` e/ou `resources`
  - seleção de origem/destino para transferência de monstros (fluxo “transferir todos”)
  - criação/remoção/navegação de bookmarks com persistência server-side
  - filtros de células (`all/mine/enemy/free/damaged/protected`)
  - painel de detalhes da célula selecionada com indicação de elegibilidade de ação
  - lista rápida das células visíveis no filtro e navegação por coordenadas (`jump`)
- Smoke de regressão cobre:
  - sucesso de `savebookmarks`
  - guardrails de rejeição para takeover inválido e transferência inválida

### `POST /base/load`
- Status: **Compatível (modo dual)**
- Contrato novo (`{ baseId, mode }`) suportado para o cliente next.
- Payload next-client normalizado inclui `yardTheme` para seleção de tiles no renderer.
- Contrato legado continua suportado para compatibilidade.
- Gate opcional para next-client: `DISABLE_NEXT_CLIENT_BASE_LOAD` retorna `409` (`NEXT_CLIENT_BASE_LOAD_DEPRECATED`) e mantém payload legado ativo.

### `POST /base/save`
- Status: **Compatível (modo dual) + deprecação gradual**
- Payload non-critical (`action`, `payload`, `audit`) suportado e auditado server-side.
- Schema legado Flash permanece suportado para clientes antigos.
- Gate opcional para next-client: `DISABLE_NEXT_CLIENT_BASE_SAVE` retorna `409` (`NEXT_CLIENT_BASE_SAVE_DEPRECATED`) e mantém payload legado ativo.

### `POST /api/:apiVersion/cmd`
- Status: **Implementado**
- Envelope validado (`op`, `args`, `seq`, `idempotencyKey`).
- Idempotência Redis por `cmd:<userId>:<idempotencyKey>`.
- Rejeição por sequência fora de ordem, anti-replay por nonce e rate-limit por operação.
- Operações atuais: `PlaceBuilding`, `MoveBuilding`, `UpgradeBuilding`, `CancelUpgrade`, `CollectHarvester`, `PurchaseStoreItem`, `ApplyYardPlannerTemplate`, `StartRepairBuilding`, `StartRepairAllBuildings`, `StartAcademyUpgrade`, `CancelAcademyUpgrade`, `FinishAcademyUpgradeNow`.
- Retorno em delta canônico (`addBuilding`, `moveBuilding`, `upgradeBuilding`, `startUpgrade`, `cancelUpgrade`, `setBuildingRepairState`, `setBuildingFortification`, `setProgression`, `setRepairSummary`, `setResources`, `setCredits`, `setStoreItem`).
- Place/Move agora validam ocupação por `footprint` legado (não apenas 1 tile), com checagem de bounds por área.
- Smoke dedicado de hardening: `./scripts/smoke-cmd-hardening.sh` (idempotência, `SEQ_OUT_OF_ORDER`, `INVALID_ENVELOPE`, `INVALID_ARGS`, `INVALID_BUILDING_TYPE`, `ANTI_REPLAY`, `RATE_LIMIT`).

### `GET /api/:apiVersion/store/catalog`
- Status: **Implementado**
- Entrega catálogo de store (`items`) e estado do jogador (`credits`, `storeData`).
- Consumido pelo novo client para fluxos reais de `BUILDINGINFO/BUILDINGS` (compra via `/cmd PurchaseStoreItem`).

### `GET /api/:apiVersion/state`
- Status: **Implementado**
- Entrega snapshot canônico e tipado: `player`, `base`, `progression`, `resources`, `buildings`, `maproom`.
- Inclui resumo autoritativo de reparo (`repair.estimatedDurationSec`, `repair.repairingCount`, `repair.damagedCount`) para paridade com o núcleo de `BASE.as`.
- Suporta `scope=auto|main|inferno` e `baseId` opcional.
- Erros estruturados para cliente: `INVALID_STATE_QUERY`, `STATE_BASE_NOT_FOUND`, `STATE_SNAPSHOT_FAILED`.

### `GET /api/:apiVersion/stream`
- Status: **Implementado**
- SSE autenticado via `Bearer` com eventos `ready`, `snapshot`, `delta`, `tick`.
- Snapshot inicial usa o mesmo contrato canônico do `/state`.
- Deltas são publicados após comandos aceitos em `/cmd`.
- Cliente novo consome stream via `fetch` (header auth), aplica dedupe por `seq` e reconecta com backoff.

### `POST /api/:apiVersion/combat/start` + `GET /api/:apiVersion/combat/replay/:replayId`
- Status: **Implementado (E05-S01 baseline)**
- Start endpoint cria sessão de replay determinístico (idempotência por chave opcional + TTL em Redis).
- Stream SSE de replay publica eventos `ready`, `snapshot`, `frame`, `result`.
- Cliente novo:
  - possui contratos tipados para `combat/start` e replay SSE,
  - consome replay via `ApiClient.openCombatReplay(...)`,
  - expõe operação inicial na UI da maproom para base inimiga selecionada.
- Smoke dedicado: `./scripts/smoke-combat-replay.sh`.

### `GET /api/:apiVersion/worlds` + `GET /api/:apiVersion/leaderboards` + `GET /api/:apiVersion/attacklogs`
- Status: **Integrado no cliente novo (E06-S01 baseline)**
- Cliente novo adicionou contratos tipados para:
  - lista de mundos
  - ranking de outposts por mundo
  - logs de ataque por filtro (`both`, `myattacks`, `peopleattackingme`)
- `ApiClient` expõe:
  - `getAvailableWorlds()`
  - `getLeaderboards(worldId)`
  - `getAttackLogs(filter)`
- UI runtime:
  - novo overlay social (`L`) com seleção de mundo, leaderboard e filtros de attack logs.
- Smoke dedicado: `./scripts/smoke-social.sh`.

### `GET /api/:apiVersion/player/getmessagetargets` + `GET /api/:apiVersion/player/getmessagethreads` + `POST /api/:apiVersion/player/getmessagethread` + `POST /api/:apiVersion/player/sendmessage` + `POST /api/:apiVersion/player/reportmessagethread`
- Status: **Integrado no cliente novo (E06-S02)**
- Cliente novo adicionou contratos tipados para:
  - lista de targets de mensagem
  - lista de threads
  - leitura de thread específica
  - envio de mensagem
  - bloqueio por report da thread
- `ApiClient` expõe:
  - `getMessageTargets()`
  - `getMessageThreads()`
  - `getMessageThread(...)`
  - `sendMessage(...)`
  - `reportMessageThread(...)`
- UI runtime:
  - overlay social (`L`) com lista de threads, leitura da thread, composer e ação de report/block.
- Hardening server-side:
  - fluxo de atualização de `unreadmessages` corrigido para usuários sem `save` inicial (criação canônica de `Save` quando ausente).
- Smoke dedicado: `./scripts/smoke-mail.sh`.

### `POST /api/:apiVersion/player/register` + `POST /api/:apiVersion/player/getinfo` (bootstrap de acesso)
- Status: **Integrado e reforçado no cliente novo**
- Login overlay suporta:
  - login por email/senha,
  - criação de conta e login imediato,
  - token manual (debug).
- Startup agora valida token persistido e remove token inválido automaticamente antes de seguir boot.
- Smoke dedicado: `./scripts/smoke-auth-bootstrap.sh`.

## Segurança / robustez
- Implementado:
  - Guardrail de regressão `npm run guard:legacy-runtime` contra reintrodução de runtime legado (client(legacy)/SWF/storage inseguro).
  - Token store sem `localStorage/sessionStorage`.
  - Desktop secure token store com keyring (Tauri command).
  - Middleware auth server com validação JWT + token em Redis + usuário em Postgres.
  - Tratamento seguro para token inválido em ambiente local (sem crash no `JWT.decode`).
  - `/cmd` com validação de args/op, idempotência, seq e rate-limit.
  - Auditoria server-side para ações non-critical de `base/save`.
  - smokes de regressão robustos com usuários únicos por execução para stream/mail, evitando falso-negativo por estado persistido entre runs.
  - smoke dedicado de hardening para `/cmd` cobrindo guardrails de protocolo e anti-abuso.
  - interceptor global com tratamento explícito de erro de validação (Zod) para retorno `400` consistente.

## BASE.as (núcleo) - paridade método-a-método (checkpoint atual)
- `CanBuild/CanUpgrade`: cobertos no autoritativo (`/cmd`) com gates de TH, requirements, limits e custos legados.
- `CanFortify`: coberto no `/cmd` com operações dedicadas (`StartFortifyBuilding`, `CancelFortifyBuilding`, `FinishFortifyNow`) e validações legadas de requisitos/custos.
- `applyTemplate/getTemplate/getYardPlannerBuildings`: cobertos com Yard Planner autoritativo (`gettemplates/savetemplate` + `ApplyYardPlannerTemplate`).
- `CalcBaseValue/BaseLevel`: agora cobertos no servidor via `legacyBaseCoreParity` com atualização autoritativa de `baseValue/level` e delta `setProgression`.
- `getEstimatedRepairDuration`: coberto via resumo canônico `repair` no `/state` e delta `setRepairSummary`.
- `repairAllBuildingsToMinimumPercentage`: coberto no `/cmd StartRepairAllBuildings` com clamp mínimo de HP (25%) para outposts antes de iniciar reparo em lote.
- Conclusão de fortificação (`countdownFortify -> fort+1`): coberta no ticker autoritativo (`applyLegacyBuildingProgress`) com delta `setBuildingFortification` e campo canônico `fortification` em `/state`/`/base/load`.
- `Charge/Fund/SaveDeltaResources/CleanDeltaResources`: cobertos funcionalmente via fluxo autoritativo de comandos e `setResources` (sem replicar a mecânica client-trust de delta local do Flash).
- `BuildBlockers/BuildingOverlap/GetBuildingOverlap`: cobertos por validação de footprint/overlap/bounds no servidor.

## Conclusão
- A integração central cliente/server ficou substancialmente mais próxima do objetivo de produção descrito na documentação.
- Ainda é recomendado evoluir a cobertura de testes e o hardening de anti-replay com nonce/signature para releases futuras.
