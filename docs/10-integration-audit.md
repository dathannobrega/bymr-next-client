# Auditoria de Integracao Client <-> Server (2026-02-20)

## Escopo
- Cliente (`src/*`)
- Serverside (`server/src/*`)
- Documentação de migração (`docs/*`, `MIGRATION_STATUS.md`)

## Resumo executivo
- A base de migração existe e está estruturada, mas a integração fim a fim ainda está **parcial**.
- O cliente já foi preparado para o protocolo por comandos (`/cmd`), porém o backend ainda não implementa o endpoint.
- Há divergência de contrato em `base/load` e `base/save` entre cliente novo e schema legado do servidor.
- Segurança base de autenticação (Bearer + Redis + Postgres) está presente, mas o modelo server-authoritative completo ainda não.

## Matriz por contrato crítico

### `POST /init`
- Status: **OK (compatível)**
- Cliente envia `apiVersion`; servidor valida versão e retorna `versionMismatch` quando necessário.

### `GET/POST /api/:apiVersion/bm/getnewmap`
- Status: **Parcial**
- Contrato principal está espelhado no cliente.
- Cliente hoje exige token para essa chamada; no server a rota não exige auth.

### `POST /base/load`
- Status: **Não compatível**
- Cliente: `{ baseId, mode }`
- Servidor: `{ baseid, type, userid, attackData? }`

### `POST /base/save`
- Status: **Não compatível**
- Cliente novo envia formato non-critical com `action`, `payload`, `audit`.
- Server atual espera payload legado Flash (`basesaveid`, `buildingdata`, campos stringificados, etc.).

### `POST /api/:apiVersion/cmd`
- Status: **Não implementado no backend**
- Cliente já envia envelope (`op`, `args`, `seq`, `idempotencyKey`) e tenta usar o endpoint.

## Segurança / robustez
- Implementado:
  - Token store sem `localStorage/sessionStorage`.
  - Desktop secure token store com keyring (Tauri command).
  - Middleware auth server com validação JWT + token em Redis + usuário em Postgres.
- Pendente para aderência ao doc de hardening:
  - Endpoint `/cmd` com validação autoritativa por operação.
  - Idempotência Redis por `userId + idempotencyKey`.
  - Anti-replay/rate limit por operação e trilha de auditoria por comando.
  - Deprecação segura de `/base/save` para o cliente novo.

## Conclusão
- **Não**: ainda não está “tudo funcionando corretamente” na integração completa client/server de acordo com a documentação alvo.
- **Sim**: a fundação está pronta para convergir rápido (contratos no cliente, scenes iniciais, auth baseline, docs e backlog organizados).
