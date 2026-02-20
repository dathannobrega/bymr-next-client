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

4. (Opcional) Re-sincronize assets de yard para fallback local/web desktop:

```bash
npm run assets:sync-yard
```

> O cliente carrega config nesta prioridade: `window.__BYMR_CONFIG__` → `/config.local.json` → variáveis `VITE_BYMR_*`.

## Executar (Web)

```bash
npm run dev
```

Build de produção web:

```bash
npm run build
```

## Executar stack completa (Client + Server + Bancos) com Docker

1. Opcional: copie variáveis de exemplo:

```bash
cp .env.docker.example .env
```

Flag de rollout para corte do endpoint legado de save no next-client:
- `BYMR_DISABLE_NEXT_CLIENT_BASE_SAVE=true` (server rejeita payload next-client em `/base/save` com `NEXT_CLIENT_BASE_SAVE_DEPRECATED`, mantendo compat legado).
- `BYMR_DISABLE_NEXT_CLIENT_BASE_LOAD=true` (server rejeita payload next-client em `/base/load` com `NEXT_CLIENT_BASE_LOAD_DEPRECATED`).
- `BYMR_REQUIRE_NEXT_CLIENT_CANONICAL_STATE=true` (server sinaliza no `/init` modo estrito canônico; cliente não usa fallback de `/base/load`).

2. Suba os serviços:

```bash
docker compose up --build
```

Se você usa `docker compose run` em paralelo com o serviço `client`, pode ser útil reiniciar só o client após alterações de dependências:
```bash
docker compose restart client
```

Se o frontend falhar ao subir por `node_modules` corrompido no volume Docker, recrie apenas o volume do client:
```bash
docker compose stop client
docker volume rm bymr-next_bymr_client_node_modules
docker compose up -d client
```

3. Acessos:
- Client (Vite): `http://localhost:5173`
- API server: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin (profile `tools`): `http://localhost:8080`

Perfis opcionais:
- Seed de banco: `docker compose --profile seed up server-seed`
- pgAdmin: `docker compose --profile tools up -d pgadmin`
- Smoke API snapshot (com server ativo): `./scripts/smoke-state-snapshot.sh`
- Smoke API stream SSE (com server ativo): `./scripts/smoke-state-stream.sh`
- Smoke Maproom v3 + ações avançadas (com server ativo): `./scripts/smoke-maproom-v3.sh`
- Smoke combate autoritativo baseline (com server ativo): `./scripts/smoke-combat-replay.sh`
- Smoke social baseline (worlds + leaderboards + attacklogs): `./scripts/smoke-social.sh`
- Smoke mensageria (targets/threads/read/send/report): `./scripts/smoke-mail.sh`
- Smoke hardening `/cmd` (idempotência/seq/rate-limit/anti-replay): `./scripts/smoke-cmd-hardening.sh`
- Smoke bootstrap de conta/base (login/register + state + maproom): `./scripts/smoke-auth-bootstrap.sh`
- Build desktop remoto (Windows/macOS via GitHub Actions): `docker compose --profile release run --rm desktop-release-orchestrator`

## Executar (Desktop / Tauri)

Modo desenvolvimento desktop:

```bash
npm run tauri dev
```

Build desktop (.exe no Windows):

```bash
npm run tauri build
```

Importante:
- O build desktop não roda no container Docker `client` padrão (falta Rust/cargo nesse container).
- Execute o build desktop no host com Node.js + Rust instalados.
- Para gerar executáveis Windows + macOS com container, use o orquestrador de release:
```bash
export GH_TOKEN=seu_token_github
export BYMR_GH_REPO=owner/repo
docker compose --profile release run --rm desktop-release-orchestrator
```
- Esse container dispara o workflow `.github/workflows/build-clients.yml` e baixa os artefatos para `dist/desktop-artifacts`.

Guia de release Windows: [`docs/07-release-windows.md`](docs/07-release-windows.md).

Observação de renderização:
- O cliente agora empacota tiles de terreno (`public/assets/yardbg/*`) e sprite de building (`public/assets/buildings/yardplanner/top.1.png`) para funcionar sem depender do CDN no runtime desktop.

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
npm run guard:legacy-runtime
npm test
npm run build
```

## Build artifacts via GitHub Actions

- CI de qualidade: `.github/workflows/ci.yml`
- Build de clientes (web + desktop Windows/macOS): `.github/workflows/build-clients.yml`

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
- Auditoria de integração (cliente/server): [`docs/10-integration-audit.md`](docs/10-integration-audit.md)
- Gate de corte do legado: [`docs/legacy-cutover-checklist.md`](docs/legacy-cutover-checklist.md)

## Status da migração

Acompanhe o progresso em [`MIGRATION_STATUS.md`](MIGRATION_STATUS.md).
