# Desenvolvimento local

## Requisitos

- Node.js 20 ou superior recomendado.
- npm.
- PostgreSQL somente quando quiser testar o banco de producao. Sem configuracao adicional, a API usa SQLite em `tmp/dev.sqlite`.

## Instalar e executar

```bash
npm ci
```

Inicie a API em um terminal:

```bash
npm run dev:api
```

Inicie o frontend em outro terminal:

```bash
npm run dev
```

URLs locais:

| Servico | URL |
| --- | --- |
| Frontend | `http://localhost:5173/#/login` |
| API | `http://localhost:3000` |
| Health check | `http://localhost:3000/api/health` |

## Configuracao

Use `.env.example` como referencia. Variaveis do frontend precisam do prefixo `VITE_` e sao resolvidas durante a build.

| Variavel | Uso |
| --- | --- |
| `VITE_API_URL` | URL base da API. Localmente, use `/api`. |
| `LOCAL_BACKEND_URL` | Destino do proxy Vite. O padrao e `http://localhost:3000`. |
| `VITE_BACKEND_ROOT` | Raiz da API para health check em dominio separado. |
| `VITE_SUPABASE_URL` | URL do projeto Supabase, se utilizado. |
| `VITE_SUPABASE_ANON_KEY` | Chave anon publica do Supabase, se utilizado. |
| `DATABASE_URL` | Conexao PostgreSQL do backend. |
| `FORCE_SQLITE` | Use `true` para ignorar `DATABASE_URL` e usar SQLite. |
| `SQLITE_STORAGE` | Caminho do arquivo SQLite. Padrao: `tmp/dev.sqlite`. |
| `PORT` | Porta da API. Padrao: `3000`. |

O Vite recusa um `LOCAL_BACKEND_URL` que nao seja `localhost` ou `127.0.0.1`, protegendo o proxy de desenvolvimento contra destinos remotos acidentais.

## Verificacoes

```bash
npm test
npm run build
npm run build:github
```

No PowerShell, valide a API com:

```powershell
(Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health).Content
```

## Dados locais

O schema e sincronizado quando `server.js` inicia. Os scripts de seed ficam em `scripts/`; `scripts/seed-basic.js` e um wrapper para a carga completa e exige configuracao PostgreSQL. Nao execute scripts de seed contra dados de producao.

## Diagnostico rapido

- Health check falha: confirme que `npm run dev:api` esta rodando na porta 3000.
- O frontend nao encontra a API: mantenha `VITE_API_URL=/api` e `LOCAL_BACKEND_URL=http://localhost:3000` no desenvolvimento.
- Login local retorna ao login: consulte a limitacao de `/api/auth/me` no [README](../README.md#limitacao-conhecida).