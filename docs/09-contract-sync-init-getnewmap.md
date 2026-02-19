# Contract Sync — `/init` and `/api/:apiVersion/bm/getnewmap`

Objetivo: espelhar no cliente (`bymr-client-next`) os contratos atualmente implementados no servidor (`backyard-monsters-refitted/server`).

## `/init`

### Server (atual)
- Método: `POST /init`
- Request schema (Zod no servidor):
  - `apiVersion?: string`
- Regras:
  - se ausente ou diferente da versão esperada -> erro com `versionMismatch: true`
  - se válida -> retorna `debugMode`

### Client mirror
- `InitRequestSchema`: `{ apiVersion: string }` (cliente sempre envia versão)
- `InitResponseSchema`: `{ debugMode?: boolean; versionMismatch?: boolean; error?: string }`

## `/api/:apiVersion/bm/getnewmap`

### Server (atual)
- Métodos: `GET` e `POST`
- Quando maproom v3:
  - `{ newmap: true, mapheaderurl, width, height, data[] }`
- Caso contrário:
  - `{ newmap: false }`

### Client mirror
- Discriminated union por `newmap`:
  - `newmap: true` exige `mapheaderurl`, `width`, `height`, `data`
  - `newmap: false` sem payload adicional obrigatório

## Política de evolução
- Qualquer ajuste nesses contratos no servidor deve atualizar:
  1) `src/lib/contracts/compat.ts`
  2) testes de contrato em `src/lib/api/__tests__/client.contract.test.ts`
  3) este documento de sync
