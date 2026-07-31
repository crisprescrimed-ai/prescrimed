# Prescrimed

Aplicacao para gestao de prescricoes, residentes, agenda, estoque, financeiro e operacao de clinicas. O projeto e um monorepo com frontend React/Vite e API Express/Sequelize.

## Visao geral

- Frontend: React 18, Vite, Tailwind CSS e React Router com hash routing.
- Backend: Express 5 com rotas REST e Sequelize.
- Dados: SQLite local por padrao e PostgreSQL quando `DATABASE_URL` esta configurada.
- Autenticacao: Supabase opcional, com fallback para a API local.
- Publicacao: GitHub Pages para frontend estatico, Netlify para SPA e servidor Node para frontend mais API.

## Inicio rapido

Requisitos recomendados: Node.js 20 e npm.

```bash
npm ci
```

Em dois terminais, execute:

```bash
# API e banco SQLite local em http://localhost:3000
npm run dev:api
```

```bash
# Frontend Vite em http://localhost:5173
npm run dev
```

Abra `http://localhost:5173/#/login`. O Vite encaminha `/api` e `/health` para `http://localhost:3000`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia o frontend com proxy local. |
| `npm run dev:api` | Inicia a API Express. |
| `npm start` | Inicia a API e serve `dist/` quando a build existe. |
| `npm test` | Executa os testes de configuracao da API e autenticacao. |
| `npm run build` | Gera a build padrao em `dist/`. |
| `npm run build:github` | Gera a build para GitHub Pages em `/prescrimed/`. |
| `npm run build:railway` | Gera a build para ambiente Railway. |

## Documentacao

- [Arquitetura](docs/ARCHITECTURE.md)
- [Desenvolvimento local](docs/LOCAL_DEVELOPMENT.md)
- [API local](docs/API.md)
- [Deploy](docs/DEPLOYMENT.md)

## Qualidade

Antes de publicar alteracoes, execute:

```bash
npm test
npm run build:github
```

O workflow de GitHub Pages executa essa build ao receber alteracoes em `main`.

## Limitacao conhecida

O fluxo de login do frontend solicita `GET /api/auth/me` apos autenticar. A API local atual implementa `POST /api/auth/login` e `POST /api/auth/register`, mas ainda nao implementa `GET /api/auth/me`. Para login completo, configure Supabase com um perfil correspondente no backend ou implemente essa rota antes de depender do fallback local em producao.
