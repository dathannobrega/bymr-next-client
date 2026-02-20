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
- [ ] E2E em Docker: login -> load -> place/move/upgrade/cancel/collect -> save non-critical
- [ ] Builds CI: web + desktop (windows/macos) com artifacts válidos
- [ ] Plano de rollback/cutover atualizado (`docs/08-cutover-plan.md`)

## Tracker oficial (arquivo a arquivo)
- Fonte de verdade: `docs/legacy-migration-tracker.tsv`
- Colunas:
  - `status`: `pending | in_progress | migrated | n/a | archived`
  - `evidence`: arquivo(s)/PR/testes que comprovam migração
  - `notes`: decisão técnica, risco e justificativa

Status atual desta rodada:
- `pending`: 448
- `in_progress`: 4
- `migrated`: 19

## Execução iniciada nesta rodada
- [x] Comandos autoritativos adicionais migrados: `CancelUpgrade` e `CollectHarvester`
- [x] Delta canônico ampliado: `startUpgrade`, `cancelUpgrade`, `setResources`
- [x] Cliente integrado com atalhos de operação e render de recursos/upgrade pendente
- [x] Terrain pipeline inicial migrado do legado para runtime novo (`yardbg` + fallback local/CDN)
- [x] Footprints legados iniciais migrados para validação autoritativa de ocupação (`PlaceBuilding`/`MoveBuilding`) e preview no renderer
- [x] Smoke test API em Docker: `PlaceBuilding` -> `UpgradeBuilding(defer)` -> `CancelUpgrade` -> `CollectHarvester`

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
```
