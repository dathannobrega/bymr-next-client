# BYMR Next Client

Cliente BYMR em migração para **TypeScript + PixiJS + WebAudio**, com execução Web (Vite) e Desktop (Tauri).

## Requisitos

- Node.js 20+
- npm 10+
- (Desktop) Rust + toolchain do Tauri

Referência detalhada de setup: [`docs/06-dev-setup.md`](docs/06-dev-setup.md).

## Configuração local

1. Instale dependências:

```bash
npm ci
```

2. Crie seu arquivo local de config a partir do exemplo:

```bash
cp config.local.json.example config.local.json
```

3. Ajuste `baseUrl`, `apiVersion` e `cdnUrl` conforme o ambiente.

> O cliente carrega config nesta prioridade: `window.__BYMR_CONFIG__` → `/config.local.json` → variáveis `VITE_BYMR_*`.

## Executar (Web)

```bash
npm run dev
```

Build de produção web:

```bash
npm run build
```

## Executar (Desktop / Tauri)

Modo desenvolvimento desktop:

```bash
npm run tauri dev
```

Build desktop (.exe no Windows):

```bash
npm run tauri build
```

Guia de release Windows: [`docs/07-release-windows.md`](docs/07-release-windows.md).

### CSP/connect-src por ambiente (Desktop)

O build desktop gera CSP dinamicamente antes de `tauri dev/build` com `npm run prepare:tauri-config`.

Variáveis:
- `BYMR_ENV=development|staging|production`
- `BYMR_CONNECT_SRC` (lista CSV para sobrescrever allowlist)

Exemplo:

```bash
BYMR_ENV=staging npm run tauri build
```

## Qualidade (local e CI)

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Documentação de migração

- Visão geral: [`docs/00-overview.md`](docs/00-overview.md)
- Arquitetura alvo: [`docs/01-architecture.md`](docs/01-architecture.md)
- Backlog oficial: [`docs/02-migration-backlog.md`](docs/02-migration-backlog.md)
- Segurança server-authoritative: [`docs/03-security-server-authoritative.md`](docs/03-security-server-authoritative.md)
- Contratos de API: [`docs/04-api-contracts.md`](docs/04-api-contracts.md)
- Pipeline de assets: [`docs/05-assets-pipeline.md`](docs/05-assets-pipeline.md)
- Setup dev: [`docs/06-dev-setup.md`](docs/06-dev-setup.md)
- Release desktop: [`docs/07-release-windows.md`](docs/07-release-windows.md)
- Cutover legado: [`docs/08-cutover-plan.md`](docs/08-cutover-plan.md)
- Contratos `/init` e `/bm/getnewmap`: [`docs/09-contract-sync-init-getnewmap.md`](docs/09-contract-sync-init-getnewmap.md)

## Status da migração

Acompanhe o progresso em [`MIGRATION_STATUS.md`](MIGRATION_STATUS.md).
