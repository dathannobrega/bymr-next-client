# AGENTS

## Objetivo do repositório
Migrar o cliente BYMR para TypeScript + PixiJS + WebAudio, com execução em Web (Vite) e Desktop (.exe via Tauri), removendo dependências de Flash/SWF e evoluindo para modelo server-authoritative.

## Resumo curto dos docs
- `docs/00-overview.md`: define migração incremental e foco em protocolo por comandos.
- `docs/01-architecture.md`: estrutura alvo por módulos (`api`, `auth`, `game/scenes`) e runtime Pixi + Tauri.
- `docs/02-migration-backlog.md`: backlog oficial por épicos/histórias com critérios de aceite e DoD.
- `docs/03-security-server-authoritative.md`: requisitos anti-cheat (idempotency, anti-replay, rate limit, deltas, logs).
- `docs/04-api-contracts.md`: endpoints atuais de compatibilidade e proposta `/api/:apiVersion/cmd`.
- `docs/05-assets-pipeline.md`: pipeline de assets Flash→atlas/audio moderno.
- `docs/06-dev-setup.md`: setup de dev local (Node/Rust/Tauri).
- `docs/07-release-windows.md`: build/release do .exe.
- `docs/08-cutover-plan.md`: estratégia de cutover e desativação legado.

## Convenções de trabalho
- Trabalhar em incrementos pequenos e revisáveis.
- Não usar localStorage/sessionStorage para token.
- Ações que alteram estado devem migrar para validação server-side.
- Atualizar documentação de progresso em `MIGRATION_STATUS.md`.

## Comandos padrão
- Dev: `npm run dev`
- Testes: `npm run test`
- Lint: `npm run lint`
- Tipagem: `npm run typecheck`
- Build web: `npm run build`
- Build desktop (quando aplicável): `npm run tauri build`

## Estrutura rápida
- `src/lib/api/*`: cliente HTTP + contratos
- `src/lib/auth/*`: abstração de armazenamento de token
- `src/game/*`: cenas e renderização Pixi
- `docs/*`: plano e políticas de migração

## Do / Don't
### Do
- Priorizar compatibilidade com endpoints atuais no início da migração.
- Usar schemas (Zod) para contratos e testes de contrato.
- Aplicar feature flags/versionamento em mudanças que podem impactar legado.

### Don't
- Não enviar estado final confiável do cliente para ações críticas.
- Não quebrar compatibilidade do servidor legado durante a transição.
- Não persistir tokens sensíveis em storage inseguro no browser.
