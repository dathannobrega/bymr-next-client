# Auditoria de Integracao Client <-> Server (2026-02-20)

## Escopo
- Cliente (`src/*`)
- Serverside (`server/src/*`)
- Documentação de migração (`docs/*`, `MIGRATION_STATUS.md`)

## Resumo executivo
- A integração cliente/server evoluiu para um estado funcional mais robusto.
- O backend agora implementa `/api/:apiVersion/cmd` com envelope validado, idempotência Redis e controle de sequência.
- `base/load` e `base/save` aceitam o contrato novo sem quebrar o fluxo legado.
- Login do cliente foi integrado ao endpoint real `/api/:apiVersion/player/getinfo`.
- Endpoints `worldmapv3/*` deixaram de ser placeholder e passaram a usar dados reais de célula/mundo.

## Matriz por contrato crítico

### `POST /init`
- Status: **OK (compatível)**
- Cliente envia `apiVersion`; servidor valida versão e retorna `versionMismatch` quando necessário.

### `GET/POST /api/:apiVersion/bm/getnewmap`
- Status: **OK (compatível)**
- Contrato principal está espelhado no cliente.
- Cliente agora exige token antes de chamar para evitar erro de bearer inválido no server.

### `POST /base/load`
- Status: **Compatível (modo dual)**
- Contrato novo (`{ baseId, mode }`) suportado para o cliente next.
- Payload next-client normalizado inclui `yardTheme` para seleção de tiles no renderer.
- Contrato legado continua suportado para compatibilidade.

### `POST /base/save`
- Status: **Compatível (modo dual)**
- Payload non-critical (`action`, `payload`, `audit`) suportado e auditado server-side.
- Schema legado Flash permanece suportado para clientes antigos.

### `POST /api/:apiVersion/cmd`
- Status: **Implementado**
- Envelope validado (`op`, `args`, `seq`, `idempotencyKey`).
- Idempotência Redis por `cmd:<userId>:<idempotencyKey>`.
- Rejeição por sequência fora de ordem, anti-replay por nonce e rate-limit por operação.
- Operações atuais: `PlaceBuilding`, `MoveBuilding`, `UpgradeBuilding`, `CancelUpgrade`, `CollectHarvester`.
- Retorno em delta canônico (`addBuilding`, `moveBuilding`, `upgradeBuilding`, `startUpgrade`, `cancelUpgrade`, `setResources`).
- Place/Move agora validam ocupação por `footprint` legado (não apenas 1 tile), com checagem de bounds por área.

## Segurança / robustez
- Implementado:
  - Token store sem `localStorage/sessionStorage`.
  - Desktop secure token store com keyring (Tauri command).
  - Middleware auth server com validação JWT + token em Redis + usuário em Postgres.
  - Tratamento seguro para token inválido em ambiente local (sem crash no `JWT.decode`).
  - `/cmd` com validação de args/op, idempotência, seq e rate-limit.
  - Auditoria server-side para ações non-critical de `base/save`.

## Conclusão
- A integração central cliente/server ficou substancialmente mais próxima do objetivo de produção descrito na documentação.
- Ainda é recomendado evoluir a cobertura de testes e o hardening de anti-replay com nonce/signature para releases futuras.
