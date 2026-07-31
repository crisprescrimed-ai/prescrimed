# Prescrimed

Aplicacao para gestao de prescricoes, residentes, agenda, estoque, financeiro e operacao de clinicas. O projeto e um monorepo com frontend React/Vite e API Express/Sequelize.

## Visao geral

- Frontend: React 18, Vite, Tailwind CSS e React Router com hash routing.
- Backend: Express 5 com rotas REST e Sequelize.
- Dados: SQLite local por padrao e PostgreSQL quando `DATABASE_URL` esta configurada.
- Autenticacao: tokens HMAC emitidos e validados pela API Express.
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

## Autenticacao

O frontend autentica em `POST /api/auth/login`, armazena o token de sessao localmente e recupera o perfil e as permissoes em `GET /api/auth/me`. O backend protege as rotas da aplicacao e deve receber `AUTH_TOKEN_SECRET` em producao.
