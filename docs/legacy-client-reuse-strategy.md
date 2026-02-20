# Legacy Client Reuse Strategy (client(legacy))

## Decisão de arquitetura
- Manter **um único cliente** TypeScript + PixiJS + WebAudio para Web + Desktop.
- Gerar desktop por Tauri para **Windows e macOS** a partir do mesmo código.
- Não criar forks de cliente por sistema operacional.

## Evidência da auditoria arquivo-a-arquivo
Fonte: `docs/legacy-client-file-audit.md` e `docs/legacy-client-file-audit.tsv`.

- Total de arquivos auditados: 471
- `building_gameplay_logic`: 48
- `core_gameplay_or_flow`: 23
- `flash_symbol_wrapper`: 60
- `ui_behavior_flash`: 10
- `image_asset_numeric_id`: 251
- `image_asset_semantic_name`: 65
- `font_asset`: 10
- `flash_binary_morphshape`: 1

## O que reaproveitar e adaptar

### 1) Regras de domínio (prioridade máxima)
Portar como regra server-authoritative + contratos de comando:
- `scripts/BASE.as`
- `scripts/ATTACK.as`
- `scripts/BFOUNDATION.as`
- `scripts/BRESOURCE.as`
- `scripts/BTOWER.as`
- `scripts/BUILDING*.as`
- `scripts/CREATURELOCKER.as`
- `scripts/CREATURES.as`
- `scripts/CREEPS.as`
- `scripts/ACADEMY.as`
- `scripts/CHAMPIONCAGE.as`
- `scripts/CHAMPIONCHAMBER.as`

### 2) Fluxo de UI (reimplementar, não portar literal)
Usar como referência de fluxo/copy:
- `scripts/BUILDINGOPTIONSPOPUP.as`
- `scripts/CREATURELOCKERPOPUP.as`
- `scripts/CHAMPIONCAGEPOPUP.as`
- `scripts/CHAMPIONCHAMBERPOPUP.as`
- `scripts/BUILDINGSPOPUP.as`
- `scripts/BUY.as`

### 3) Assets
- Reuso direto com pipeline atlas: 65 arquivos semânticos em `images/*`.
- Reuso com mapeamento de símbolo: 251 imagens com nome numérico.
- Fontes TTF: reaproveitar somente após validação de licença.
- `morphshapes/1817.swf`: extrair e converter para spritesheet (não usar SWF em runtime).

## O que não reaproveitar como código
- `*_CLIP.as` e classes com `[Embed(...assets.swf...)]`: wrappers de timeline Flash.
- `ChatUI_fla/*`, `BasePlanner_fla/*`: artefatos de authoring Flash.
- Chamadas de plataforma social legado (`ExternalInterface`, `GLOBAL.CallJS`) devem virar adapters modernos opcionais.

## Estratégia Windows + macOS
- Build matrix por host OS com Tauri:
  - Windows host: `msi`, `nsis`
  - macOS host: `app`, `dmg`
- O script `scripts/prepare-tauri-config.mjs` já define targets automaticamente por plataforma.
- Para override manual: `BYMR_TAURI_TARGETS=app,dmg npm run tauri build`.

## Riscos e controles
- Risco: imagens numéricas sem semântica.
  - Controle: tabela de mapeamento `legacy_id -> semantic_key` antes de empacotar atlas final.
- Risco: regras antigas misturadas com UI no AS3.
  - Controle: extrair invariantes para testes de contrato server-side antes da reimplementação visual.
- Risco: fontes sem licença redistribuível.
  - Controle: inventário legal antes de release.

## Próxima execução recomendada
1. Criar `assets/legacy-id-map.json` e iniciar mapeamento dos 251 numerados.
2. Portar primeiro núcleo de regra: `BASE/BFOUNDATION/BUILDING14/ATTACK` para `/cmd` e validações server-side.
3. Reimplementar popups críticos (`building options`, `creature locker`) em TS com testes de integração.
4. Configurar CI desktop com jobs separados para Windows e macOS (build + assinatura).
