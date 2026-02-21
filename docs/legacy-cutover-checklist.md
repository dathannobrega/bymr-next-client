# Legacy Cutover Checklist (Go/No-Go para excluir `client(legacy)`)

Objetivo: garantir migração completa sem perda de feature/asset antes da exclusão da pasta legada.

## Regra de corte
- `NO-GO` enquanto existir qualquer linha `pending` ou `in_progress` em `docs/legacy-migration-tracker.tsv`.
- `GO` somente quando:
  - todas as linhas estiverem em `migrated`, `n/a` (com justificativa) ou `archived` (com evidência),
  - testes críticos passarem em Docker,
  - smoke test de gameplay e autenticação passar em Web + Desktop.

## Checklist obrigatório
- [ ] Inventário completo rastreável por arquivo (`docs/legacy-client-file-audit.tsv` + `docs/legacy-migration-tracker.tsv`)
- [ ] Toda lógica `building_gameplay_logic` migrada para contratos/validação server-authoritative
- [ ] Todo fluxo `core_gameplay_or_flow` migrado ou marcado `n/a` com motivo técnico
- [ ] Todos `ui_behavior_flash` reimplementados em TS/Pixi (ou `n/a` justificado)
- [ ] Todos `flash_symbol_wrapper` removidos do runtime novo e classificados como `reference_only`/`archived`
- [ ] Todos assets numéricos (`image_asset_numeric_id`) mapeados para chave semântica em pipeline
- [ ] Fontes (`font_asset`) com licença validada ou substituídas
- [ ] `morphshapes/*.swf` extraído/convertido (sem SWF em runtime)
- [ ] Paridade de comandos críticos de base/combat/social validada contra documentação
- [ ] E2E em Docker: login -> state(snapshot) -> load -> place/move/upgrade/cancel/collect -> save non-critical
- [ ] Builds CI: web + desktop (windows/macos) com artifacts válidos
- [ ] Plano de rollback/cutover atualizado (`docs/08-cutover-plan.md`)

## Tracker oficial (arquivo a arquivo)
- Fonte de verdade: `docs/legacy-migration-tracker.tsv`
- Colunas:
  - `status`: `pending | in_progress | migrated | n/a | archived`
  - `evidence`: arquivo(s)/PR/testes que comprovam migração
  - `notes`: decisão técnica, risco e justificativa

Critério de uso de `archived`:
- Aplicado apenas para wrappers/símbolos Flash sem regra de negócio (`flash_symbol_wrapper`).
- Só pode ser marcado `archived` quando existe equivalente funcional no novo runtime (com `evidence`).
- Regras de gameplay/fluxo (`core_gameplay_or_flow`, `building_gameplay_logic`) não devem ir para `archived`; nesses casos fica `migrated`, `in_progress` ou `n/a` justificado.

Status atual desta rodada:
- `pending`: 433
- `in_progress`: 5
- `migrated`: 26
- `archived`: 7

## Execução iniciada nesta rodada
- [x] Comandos autoritativos adicionais migrados: `CancelUpgrade` e `CollectHarvester`
- [x] Delta canônico ampliado: `startUpgrade`, `cancelUpgrade`, `setResources`
- [x] Cliente integrado com atalhos de operação e render de recursos/upgrade pendente
- [x] Terrain pipeline inicial migrado do legado para runtime novo (`yardbg` + fallback local/CDN)
- [x] Footprints legados iniciais migrados para validação autoritativa de ocupação (`PlaceBuilding`/`MoveBuilding`) e preview no renderer
- [x] Smoke test API em Docker: `PlaceBuilding` -> `UpgradeBuilding(defer)` -> `CancelUpgrade` -> `CollectHarvester`
- [x] Gate de deprecação gradual de `/base/save` para next-client (feature flag `DISABLE_NEXT_CLIENT_BASE_SAVE`)
- [x] Gate de deprecação gradual de `/base/load` para next-client (feature flag `DISABLE_NEXT_CLIENT_BASE_LOAD`) com fallback legado controlado por capacidade do `/init`
- [x] `guard:legacy-runtime` integrado ao CI para bloquear regressão de runtime Flash/SWF/storage inseguro
- [x] Snapshot canônico `GET /api/:apiVersion/state` implementado e cliente novo inicializando preferencialmente por esse contrato
- [x] Stream canônico `GET /api/:apiVersion/stream` implementado (SSE auth + deltas `/cmd`) e cliente novo conectado com reconexão/dedupe
- [x] Maproom v3 do cliente novo integrado (`initworldmap/getcells/relocate`) com smoke de regressão dedicado
- [x] Ações avançadas maproom no cliente novo integradas (`takeoverCell`, `transferassets`, `savebookmarks`) com UI operacional e validação de rota no smoke
- [x] Combate baseline autoritativo integrado (`combat/start` + `combat/replay/:replayId`) com smoke SSE dedicado
- [x] Social baseline integrado (`worlds`, `leaderboards`, `attacklogs`) com overlay runtime (`L`) e smoke dedicado
- [x] Mensageria in-game integrada no overlay social (`threads/read/send/report`) com smoke dedicado
- [x] Hardening de `/cmd` validado por smoke dedicado (idempotência/seq/anti-replay/rate-limit)
- [x] Auth hardening: payload inválido de login/registro/reset retorna `400 VALIDATION_ERROR` (sem `500`) + validação de UX no LoginScene
- [x] Container de orquestração de release desktop (`desktop-release-orchestrator`) para disparar build Windows/macOS via GitHub Actions e baixar artefatos
- [x] `BUILDINGOPTIONS`/`BUILDINGOPTIONSPOPUP` migrados para painel runtime `Building Ops` no Yard (place/move/upgrade/cancel/collect sem dependência de atalhos ocultos)
- [x] Catálogo legado inicial de tipos de building migrado (`src/lib/base/buildingType.ts`) com filtro por código/tipo/classe no painel
- [x] Fluxo `BUILDINGSPOPUP/BUILDINGBUTTON/BUILDINGSARROW` migrado para catálogo visual no `Building Ops` (abas/subabas, paginação de 10 itens, cards com contagem e status de limite + fallback coming soon)
- [x] `BUILDINGINFO` fechado com fluxos reais de contexto (`store/hatchery/bunker/housing/juice/lockers/baiter`) + yard planner (`gettemplates/savetemplate`) no novo client
- [x] `BUILDINGS` fechado com paridade de compra/store no catálogo (`SKU/custo/estoque`, compra direta por card e sincronização de `credits/storeData` via delta autoritativo)
- [x] `ERRORMESSAGE` migrado para modal global (fatal + unhandled) com detalhes estruturados (`code/traceId/issue`) a partir dos erros do `ApiClient`
- [x] Hardening de erro HTTP no client para envelope `errorDetails` (code/traceId/issues) mantendo mensagens estruturadas no novo client
- [x] Login server com compatibilidade legada restaurada (senha no login aceita formato legado; política forte mantida em `register/reset`)

## Validação rápida (comandos)
```bash
# contagem por status
awk -F '\t' 'NR>1 {c[$4]++} END {for (k in c) print k"\t"c[k]}' docs/legacy-migration-tracker.tsv | sort

# gate automático: falha se ainda houver pendências
awk -F '\t' 'NR>1 && ($4=="pending" || $4=="in_progress") {n++} END {exit (n>0)}' docs/legacy-migration-tracker.tsv

# qualidade do cliente (via Docker)
docker compose run --rm client sh -lc 'npm ci && npm run typecheck && npm run lint && npm test && npm run build'

# qualidade do server (via Docker)
docker compose run --rm server sh -lc 'bun install --frozen-lockfile && bun run typecheck'

# smoke do snapshot canônico (requer stack server ativa)
./scripts/smoke-state-snapshot.sh

# smoke bootstrap de conta/base (register/login + state + maproom)
./scripts/smoke-auth-bootstrap.sh

# smoke do stream canônico (SSE + delta de /cmd)
./scripts/smoke-state-stream.sh

# smoke maproom v3 + ações avançadas (init/getcells/relocate/savebookmarks + guardrails takeover/transfer)
./scripts/smoke-maproom-v3.sh

# smoke combate autoritativo baseline (start + replay SSE)
./scripts/smoke-combat-replay.sh

# smoke social baseline (worlds + leaderboards + attacklogs)
./scripts/smoke-social.sh

# smoke mensageria (targets + threads + read + send + report)
./scripts/smoke-mail.sh

# smoke hardening do /cmd (idempotência + seq + anti-replay + rate-limit)
./scripts/smoke-cmd-hardening.sh
```
