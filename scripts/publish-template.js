#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const distDir = path.join(root, 'client', 'dist');
const templateDir = path.join(root, 'Template');
const generatedAt = new Date().toLocaleString('pt-BR');

function readEnvFile(envFilePath) {
  if (!envFilePath || !fs.existsSync(envFilePath)) return {};
  const raw = fs.readFileSync(envFilePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function findHostgatorClientEnv() {
  const candidates = [
    path.join(root, 'client', '.env.hostgator.local'),
    path.join(root, 'client', '.env.hostgator'),
    path.join(root, 'client', '.env.production.local'),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  // No Windows, remover a pasta raiz pode falhar (locks/antivírus). É mais estável
  // remover apenas o conteúdo e manter o diretório.
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    const sourcePath = path.join(src, entry);
    const destinationPath = path.join(dest, entry);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

const htaccessContent = `Options -Indexes
DirectoryIndex index.html

# Fallback SPA relativo para public_html ou subpastas
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

  # IMPORTANTE: NUNCA envie rotas de API/health para o SPA.
  # Em HostGator, é comum o frontend ficar em public_html (Apache)
  # e a API rodar separadamente (Node App Manager, subdomínio ou proxy).
  # Se o fallback SPA capturar /api, o browser recebe index.html no lugar do JSON.
  RewriteCond %{REQUEST_URI} (^|/)(api|health)(/|$) [NC]
  RewriteRule .* - [L]

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>

# Cabecalhos recomendados para entrega estatica
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Cross-Origin-Opener-Policy "same-origin-allow-popups"
  Header always set Cross-Origin-Resource-Policy "same-site"

  <FilesMatch "\.(html|htm)$">
    Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
  </FilesMatch>

  <FilesMatch "\.(css|js|mjs|svg|ico|png|jpg|jpeg|gif|webp|woff|woff2|ttf)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

# Cache longo para assets versionados
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType application/x-javascript "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/ttf "access plus 1 year"
</IfModule>

# Compressao gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css
  AddOutputFilterByType DEFLATE application/javascript application/json
  AddOutputFilterByType DEFLATE image/svg+xml
  AddOutputFilterByType DEFLATE font/woff2 font/woff font/ttf
</IfModule>
`;

const page404Content = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0f766e">
  <title>Prescrimed - Redirecionando</title>
  <style>
    :root {
      --bg-a: #ecfeff;
      --bg-b: #f8fafc;
      --ink: #0f172a;
      --muted: #475569;
      --accent: #0f766e;
      --accent-2: #14b8a6;
      --panel: rgba(255, 255, 255, 0.92);
      --shadow: 0 24px 70px rgba(15, 23, 42, 0.16);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(20, 184, 166, 0.18), transparent 30%),
        linear-gradient(180deg, var(--bg-a), var(--bg-b));
    }

    .shell {
      width: min(720px, 100%);
      background: var(--panel);
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 28px;
      box-shadow: var(--shadow);
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    .hero {
      padding: 32px 32px 16px;
      background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(20, 184, 166, 0.18));
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.74);
      color: var(--accent);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .hero h1 {
      margin: 20px 0 8px;
      font-size: clamp(30px, 4vw, 44px);
      line-height: 1.04;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.6;
    }

    .content {
      padding: 24px 32px 32px;
      display: grid;
      gap: 18px;
    }

    .card {
      display: grid;
      gap: 10px;
      padding: 18px 20px;
      border-radius: 18px;
      background: #ffffff;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .label {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 6px;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 18px;
      border-radius: 14px;
      text-decoration: none;
      font-weight: 700;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }

    .button-primary {
      color: #ffffff;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      box-shadow: 0 12px 28px rgba(15, 118, 110, 0.24);
    }

    .button-secondary {
      color: var(--ink);
      background: #f8fafc;
      border: 1px solid rgba(148, 163, 184, 0.28);
    }

    .button:hover { transform: translateY(-1px); }

    .small {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    @media (max-width: 640px) {
      body { padding: 14px; }
      .hero, .content { padding-left: 20px; padding-right: 20px; }
      .actions { flex-direction: column; }
      .button { width: 100%; }
    }
  </style>
  <script>
    setTimeout(function () {
      window.location.replace('./');
    }, 1800);
  </script>
</head>
<body>
  <main class="shell" aria-labelledby="titulo-404">
    <section class="hero">
      <div class="brand">Prescrimed HostGator</div>
      <h1 id="titulo-404">Publicacao pronta e fallback configurado.</h1>
      <p>
        Esta pagina aparece quando uma rota do aplicativo precisa voltar para a entrada principal.
        O redirecionamento sera feito automaticamente para preservar a navegacao do sistema.
      </p>
    </section>

    <section class="content">
      <article class="card">
        <div class="label">Redirecionamento</div>
        <div>Se nada acontecer em instantes, abra manualmente a entrada principal do sistema.</div>
        <div class="actions">
          <a class="button button-primary" href="./">Abrir Prescrimed</a>
          <a class="button button-secondary" href="./limpar-cache.html">Limpar cache do navegador</a>
        </div>
      </article>

      <article class="card small">
        <div class="label">Publicacao estavel</div>
        <div>
          O pacote Template foi preparado para HostGator com assets relativos, compressao e fallback SPA.
          Isso preserva o layout responsivo no desktop, tablet e mobile.
        </div>
      </article>
    </section>
  </main>
</body>
</html>`;

const hostgatorEnvPath = findHostgatorClientEnv();
const hostgatorEnv = readEnvFile(hostgatorEnvPath);
const buildApiUrl = (hostgatorEnv.VITE_API_URL || '').trim();
const buildBackendRoot = (hostgatorEnv.VITE_BACKEND_ROOT || '').trim();
const isSameOriginApi = buildApiUrl === '/api' || buildApiUrl === '';
const apiModeLabel = isSameOriginApi ? 'mesma origem (/api)' : 'API em outro domínio';
const apiExampleDomain = buildBackendRoot || 'https://backend.seu-dominio.com.br';

const instructionsContent = `=============================================================
  PRESCRIMED - PUBLICACAO HOSTGATOR
  Gerado automaticamente por: npm run build:template
  Data: ${generatedAt}
=============================================================

CONTEUDO DESTA PASTA
---------------------
  index.html          -> Entrada principal do SPA React
  assets/             -> JS, CSS e fontes minificados (cache longo)
  .htaccess           -> Fallback SPA + seguranca + cache + gzip
  404.html            -> Fallback visual de redirecionamento
  favicon.ico         -> Icone do sistema
  robots.txt          -> Instrucoes para indexadores
  limpar-cache.html   -> Ajuda para limpar cache apos atualizar a publicacao

COMO PUBLICAR NO HOSTGATOR
---------------------------
1. Acesse o cPanel da sua conta HostGator.
2. Abra o Gerenciador de Arquivos e navegue ate public_html
   (ou uma subpasta, ex: public_html/prescrimed/).
3. Remova arquivos antigos do frontend para evitar conflito de cache.
4. Envie TODO o conteudo desta pasta, incluindo .htaccess e assets/.
5. Se usar FTP, habilite a exibicao de arquivos ocultos antes do upload.
6. Confirme que index.html, .htaccess e assets/ ficaram no mesmo nivel.
7. Acesse o dominio e teste navegacao, login e recarga de pagina em rota interna.

PUBLICAR NA RAIZ OU SUBPASTA
-----------------------------
  -> Este pacote usa assets relativos e fallback SPA relativo.
  -> Pode ser publicado diretamente em public_html.
  -> Tambem pode ser publicado em subpastas como public_html/prescrimed.
  -> Este build foi gerado para: ${apiModeLabel}.

CHECKLIST RAPIDO POS-UPLOAD
---------------------------
  [ ] index.html abre sem erro 404
  [ ] assets/ carrega CSS e JS minificados
  [ ] login funciona
  [ ] atualizar a pagina em /dashboard nao quebra
  [ ] layout permanece responsivo no celular
  [ ] limpar-cache.html abre corretamente

TESTE LOCAL (ANTES DO UPLOAD)
------------------------------
  -> Nao abra index.html com file:// no Chrome/Edge.
     Browsers bloqueiam JS/CSS por politica de seguranca (CORS) e a tela fica em branco.
  -> Para validar localmente, sirva esta pasta via HTTP.
     Exemplo (na raiz do projeto):
       npm run preview:template

CONFIGURACAO DA API
-------------------
  -> Configuracao usada neste build:
       VITE_API_URL=${buildApiUrl || '(nao definido)'}
       VITE_BACKEND_ROOT=${buildBackendRoot || '(nao definido)'}

  -> Este build foi gerado para: ${apiModeLabel}.
  -> Para publicar frontend + backend no HostGator, o plano precisa ter Node.js.
  -> Garanta que o servidor estatico (public_html/.htaccess) nao reescreva /api e /health
     para index.html. Este Template ja vem com essa excecao.
  -> MODO A (RECOMENDADO: mesmo dominio, sem proxy Apache):
       - Configure o Node App Manager para usar o dominio da aplicacao.
       - Rode no servidor: npm run build:client
       - O backend ja serve o frontend a partir de client/dist.
       - Assim, /api e o SPA ficam na mesma origem (mais estavel).
  -> MODO B (frontend em public_html):
       - Envie este Template para public_html.
       - Garanta que as chamadas do frontend cheguem na API correta.

  -> Se for usar API em outro dominio/subdominio (recomendado para HostGator), gere o build com:
       VITE_API_URL=${apiExampleDomain}/api
       VITE_BACKEND_ROOT=${apiExampleDomain}
  -> No backend, se usar subdominio backend. (ou outro host), defina PUBLIC_BASE_URL=${apiExampleDomain}
        para gerar corretamente a URL publica do webhook: ${apiExampleDomain}/api/public/webhooks/payment
     e gere novamente:
       npm run build:template

  PAGAMENTOS (WEBHOOK ASSINADO)
  ------------------------------
    -> O webhook publico de pagamentos fica em: /api/public/webhooks/payment
    -> Para o webhook assinado funcionar (HMAC), configure no backend:
      PAYMENT_WEBHOOK_SECRET=<segredo>
      PAYMENT_WEBHOOK_STRICT=true
    -> Sem PAYMENT_WEBHOOK_SECRET, o endpoint retorna 400 com:
      "Assinatura do webhook inválida (missing-secret)"
    -> Dica: copie essas variaveis no Node App Manager junto com JWT/DATABASE_URL.

PADRAO VISUAL
-------------
  -> O Template nao altera o layout do sistema.
  -> O build preserva a interface responsiva e profissional do frontend atual.
  -> As paginas auxiliares geradas para HostGator seguem o mesmo cuidado visual.

SUPORTE OPERACIONAL
-------------------
  -> Sistema: Prescrimed v1.0
  -> Build indicado para publicacao estatica profissional em HostGator.
=============================================================
`;

try {
  if (!fs.existsSync(distDir)) {
    console.error('❌ Build não encontrado em client/dist. Execute: npm run build:template');
    process.exit(1);
  }

  ensureDir(templateDir);
  cleanDir(templateDir);
  copyDir(distDir, templateDir);

  // HostGator (Apache/cPanel) nao usa arquivos de plataforma tipo Netlify.
  // Mantemos o pacote enxuto para evitar confusao e regras de proxy indevidas.
  for (const platformFile of ['_redirects', '_headers']) {
    const platformPath = path.join(templateDir, platformFile);
    if (fs.existsSync(platformPath)) {
      fs.unlinkSync(platformPath);
    }
  }

  fs.writeFileSync(path.join(templateDir, '.htaccess'), htaccessContent, 'utf8');
  fs.writeFileSync(path.join(templateDir, '404.html'), page404Content, 'utf8');
  fs.writeFileSync(path.join(templateDir, 'LEIA-ME-HOSTGATOR.txt'), instructionsContent, 'utf8');

  // Exibe resumo dos arquivos gerados
  const files = fs.readdirSync(templateDir);
  const assetsCount = fs.existsSync(path.join(templateDir, 'assets'))
    ? fs.readdirSync(path.join(templateDir, 'assets')).length
    : 0;

  console.log('');
  console.log('✅ Template Hostgator pronto em Template/');
  console.log(`   Arquivos raiz : ${files.length}`);
  console.log(`   Assets        : ${assetsCount} arquivos em assets/`);
  console.log('');
  console.log('📦 Para publicar: envie TODO o conteúdo de Template/ para o public_html da Hostgator.');
  console.log('');
  process.exit(0);
} catch (error) {
  console.error('❌ Falha ao gerar Template:', error.message);
  process.exit(1);
}