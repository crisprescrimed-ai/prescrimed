# Deploy

## GitHub Pages

O GitHub Pages serve somente os arquivos estaticos. Ele nao executa `server.js`, portanto
o build exige a variavel de repositorio `PRESCRIMED_API_URL` com uma URL HTTPS completa
terminando em `/api`, por exemplo `https://api.exemplo.com/api`. Configure tambem
`PRESCRIMED_BACKEND_ROOT` com a mesma URL sem o sufixo `/api` para o health check.

No host da API, configure `DATABASE_URL` com a conexao PostgreSQL gerenciada,
`PGSSLMODE=require`, `AUTH_TOKEN_SECRET` e
`CORS_ALLOWED_ORIGINS=https://cristiano-superacao.github.io`.

O workflow `.github/workflows/deploy-gh-pages.yml` publica automaticamente quando `main` recebe alteracoes.

Ele executa:

```bash
npm ci
npm run build:github
```

O modo `github` usa `base: /prescrimed/`, necessario para os assets funcionarem no subdiretorio do GitHub Pages. Como Pages hospeda apenas arquivos estaticos, configure uma API externa se a aplicacao precisar usar recursos de backend:

```env
VITE_API_URL=https://api.exemplo.com/api
VITE_BACKEND_ROOT=https://api.exemplo.com
```

No repositorio GitHub, cadastre as variaveis `PRESCRIMED_API_URL` e `PRESCRIMED_BACKEND_ROOT` em **Settings > Secrets and variables > Actions > Variables**. O workflow as injeta na build de Pages. A API externa deve definir `CORS_ALLOWED_ORIGINS=https://cristiano-superacao.github.io` e um `AUTH_TOKEN_SECRET` forte. Sem `PRESCRIMED_API_URL`, o workflow falha antes de publicar, evitando uma versao com chamadas `/api` que retornariam 404 no GitHub Pages.

## Netlify

`netlify.toml` define:

- build: `npm run build`;
- diretorio publicado: `dist`;
- Node 20;
- cache imutavel para assets;
- headers de seguranca basicos;
- fallback SPA para `index.html`.

Defina no painel da Netlify as variaveis `VITE_API_URL` e `VITE_BACKEND_ROOT`. Essas variaveis sao incorporadas na build; uma alteracao exige novo deploy.

## Servidor Node com API

Para servir frontend e API no mesmo processo:

```bash
npm ci
npm run build
npm start
```

`npm start` executa `server.js`, que entrega `dist/`, expoe `/api` e responde aos health checks. Configure `PORT`, `DATABASE_URL`, `AUTH_TOKEN_SECRET`, `CORS_ALLOWED_ORIGINS` e, para PostgreSQL com SSL, `PGSSLMODE=require`. Em producao, o servidor recusa iniciar sem `AUTH_TOKEN_SECRET` ou `CORS_ALLOWED_ORIGINS`.

`railway.toml` fixa `npm run build`, `npm start` e o health check `/health` para esse modelo de deploy.

`npm run start:railway` usa apenas `vite preview`; ele nao inicia as rotas Express. Para uma implantacao com API integrada, o comando de inicio da plataforma deve ser `npm start`.

## Checklist de publicacao

1. Execute `npm test`.
2. Execute a build correspondente ao destino.
3. Configure variaveis sem salvar segredos no repositorio.
4. Valide `/api/health` quando houver backend.
5. Teste login, navegacao, responsividade e uma operacao de CRUD no ambiente publicado.
