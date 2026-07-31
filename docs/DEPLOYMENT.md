# Deploy

## GitHub Pages

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

A API externa deve liberar CORS para o dominio do Pages. Sem essas variaveis, o monitor de backend fica desativado na hospedagem estatica para evitar alertas falsos.

## Netlify

`netlify.toml` define:

- build: `npm run build`;
- diretorio publicado: `dist`;
- Node 20;
- cache imutavel para assets;
- headers de seguranca basicos;
- fallback SPA para `index.html`.

Defina no painel da Netlify as mesmas variaveis `VITE_API_URL`, `VITE_BACKEND_ROOT` e, se necessario, as variaveis Supabase. Essas variaveis sao incorporadas na build; uma alteracao exige novo deploy.

## Servidor Node com API

Para servir frontend e API no mesmo processo:

```bash
npm ci
npm run build
npm start
```

`npm start` executa `server.js`, que entrega `dist/`, expoe `/api` e responde aos health checks. Configure `PORT`, `DATABASE_URL` e, para PostgreSQL com SSL, `PGSSLMODE=require`.

`npm run start:railway` usa apenas `vite preview`; ele nao inicia as rotas Express. Para uma implantacao com API integrada, o comando de inicio da plataforma deve ser `npm start`.

## Checklist de publicacao

1. Execute `npm test`.
2. Execute a build correspondente ao destino.
3. Configure variaveis sem salvar segredos no repositorio.
4. Valide `/api/health` quando houver backend.
5. Teste login, navegacao, responsividade e uma operacao de CRUD no ambiente publicado.