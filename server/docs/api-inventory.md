# API Inventory (server)

Fonte do inventário: `../backyard-monsters-refitted/server/src/app.routes.ts`.

## Bootstrap / autenticação / base (relevantes ao cliente next)

| Método | Path | Auth | Handler | Observações migração `/cmd` |
|---|---|---|---|---|
| POST | `/init` | Não | `init` | Version/build gate + capacidades de protocolo canônico (`protocol.*`) |
| GET/POST | `/api/:apiVersion/bm/getnewmap` | Não | `getNewMap` | Contrato já espelhado no cliente |
| POST | `/api/:apiVersion/player/getinfo` | Não | `login` | Candidato para fluxo de login não-manual |
| POST | `/api/:apiVersion/player/register` | Não (rate-limit) | `register` | Compat legado |
| POST | `/base/load` | Sim (`verifyUserAuth`) | `baseLoad` | Compat fase 1; payload next-client pode ser bloqueado via `DISABLE_NEXT_CLIENT_BASE_LOAD` |
| POST | `/base/save` | Sim (`verifyUserAuth`) | `baseSave` | Next-client pode ser bloqueado via `DISABLE_NEXT_CLIENT_BASE_SAVE`; legado segue compat |
| GET | `/api/:apiVersion/state` | Sim (`verifyUserAuth`) | `getState` | Snapshot canônico normalizado para cliente novo (sem blobs stringificados) |
| GET | `/api/:apiVersion/stream` | Sim (`verifyUserAuth`) | `streamState` | SSE autenticado; push de snapshot inicial + deltas de `/cmd` + heartbeat |
| POST | `/api/:apiVersion/combat/start` | Sim (`verifyUserAuth`) | `startCombatReplay` | Inicia sessão de replay de combate autoritativo (TTL + idempotência opcional) |
| GET | `/api/:apiVersion/combat/replay/:replayId` | Sim (`verifyUserAuth`) | `streamCombatReplay` | Stream SSE de replay (`ready/snapshot/frame/result`) |
| POST | `/api/:apiVersion/cmd` | Sim (`verifyUserAuth`) | `cmd` | Server-authoritative com seq/idempotência/rate-limit |
| POST | `/base/updatesaved` | Sim (`verifyUserAuth`) | `updateSaved` | Compat legado |
| POST | `/api/:apiVersion/bm/base/load` | Sim (`verifyUserAuth`) | `baseLoad` | Variante inferno |
| POST | `/api/:apiVersion/bm/base/save` | Sim (`verifyUserAuth`) | `infernoSave` | Variante inferno |
| POST | `/api/:apiVersion/bm/base/updatesaved` | Sim (`verifyUserAuth`) | `updateSaved` | Variante inferno |

## Maproom / social / apoio (resumo)

- MR2: `/worldmapv2/getarea`, `/worldmapv2/setmapversion`, `/worldmapv2/takeoverCell`, `/worldmapv2/transferassets`.
- MR3: `/worldmapv3/initworldmap` (GET/POST), `/worldmapv3/getcells`, `/worldmapv3/relocate`, `/worldmapv3/setmapversion` (GET/POST).
- Next-client: integração ativa de `initworldmap/getcells/relocate` + ações avançadas (`takeoverCell`, `transferassets`, `savebookmarks`) com contratos tipados e overlay runtime (atalho `M`).
- Mensagens: `/api/:apiVersion/player/getmessagetargets`, `getmessagethreads`, `getmessagethread`, `sendmessage`, `reportmessagethread`.
- Outras: `/api/:apiVersion/worlds`, `/api/:apiVersion/leaderboards`, `/api/:apiVersion/attacklogs`.

## Próximos passos para server-authoritative

1. Expandir o `/cmd` para domínio de combate/social (além de base/build já migrados).
2. Adicionar nonce + assinatura no envelope para anti-replay avançado.
3. Cobrir `/state`, `/stream` e `/cmd` com testes de integração end-to-end (cliente + backend + Redis + Postgres).
4. Manter rotas legado para clientes antigos até cutover por version gate (`/init`) e feature flags.
