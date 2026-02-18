# API Inventory (server)

Fonte do inventário: `../backyard-monsters-refitted/server/src/app.routes.ts`.

## Bootstrap / autenticação / base (relevantes ao cliente next)

| Método | Path | Auth | Handler | Observações migração `/cmd` |
|---|---|---|---|---|
| POST | `/init` | Não | `init` | Mantido para version gate final no cutover |
| GET/POST | `/api/:apiVersion/bm/getnewmap` | Não | `getNewMap` | Contrato já espelhado no cliente |
| POST | `/api/:apiVersion/player/getinfo` | Não | `login` | Candidato para fluxo de login não-manual |
| POST | `/api/:apiVersion/player/register` | Não (rate-limit) | `register` | Compat legado |
| POST | `/base/load` | Sim (`verifyUserAuth`) | `baseLoad` | Compat fase 1 |
| POST | `/base/save` | Sim (`verifyUserAuth`) | `baseSave` | Restringir para cliente novo (E01-S05) |
| POST | `/base/updatesaved` | Sim (`verifyUserAuth`) | `updateSaved` | Compat legado |
| POST | `/api/:apiVersion/bm/base/load` | Sim (`verifyUserAuth`) | `baseLoad` | Variante inferno |
| POST | `/api/:apiVersion/bm/base/save` | Sim (`verifyUserAuth`) | `infernoSave` | Variante inferno |
| POST | `/api/:apiVersion/bm/base/updatesaved` | Sim (`verifyUserAuth`) | `updateSaved` | Variante inferno |

## Maproom / social / apoio (resumo)

- MR2: `/worldmapv2/getarea`, `/worldmapv2/setmapversion`, `/worldmapv2/takeoverCell`, `/worldmapv2/transferassets`.
- MR3: `/worldmapv3/initworldmap` (GET/POST), `/worldmapv3/getcells`, `/worldmapv3/relocate`, `/worldmapv3/setmapversion` (GET/POST).
- Mensagens: `/api/:apiVersion/player/getmessagetargets`, `getmessagethreads`, `getmessagethread`, `sendmessage`, `reportmessagethread`.
- Outras: `/api/:apiVersion/worlds`, `/api/:apiVersion/leaderboards`, `/api/:apiVersion/attacklogs`.

## Gaps e próximos passos para server-authoritative

1. Criar `POST /api/:apiVersion/cmd` com envelope (`op`, `args`, `seq`, `idempotencyKey`, `clientTime`).
2. Implementar idempotência em Redis + rate-limit por operação.
3. Migrar primeira ação crítica: `PlaceBuilding` (E03-S01), com retorno de delta canônico.
4. Manter rotas legado para clientes antigos até cutover por version gate (`/init`).
