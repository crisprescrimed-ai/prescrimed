import { spawn } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const localEnvPath = path.join(rootDir, '.env.hostgator.production.local');
const clientHostgatorLocalEnvPath = path.join(rootDir, 'client', '.env.hostgator.local');
const clientDistPath = path.join(rootDir, 'client', 'dist');
const templateDirPath = path.join(rootDir, 'Template');
const artifactsDirPath = path.join(rootDir, 'hostgator-artifacts');

const requiredEnvKeys = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'ALLOWED_ORIGINS',
  'PUBLIC_BASE_URL',
  'HOSTGATOR_EMPRESA_NOME',
  'HOSTGATOR_EMPRESA_TIPO',
  'HOSTGATOR_EMPRESA_CNPJ',
  'HOSTGATOR_EMPRESA_EMAIL',
  'HOSTGATOR_ADMIN_NOME',
  'HOSTGATOR_ADMIN_EMAIL',
  'HOSTGATOR_ADMIN_PASSWORD',
];

const recommendedFrontendEnvKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return null;
  }

  return dotenv.parse(fs.readFileSync(envPath, 'utf8'));
}

function isPlaceholderValue(value = '') {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return true;

  const markers = [
    'usuario',
    'senha',
    'host',
    'nome_do_banco',
    'troque_por',
    'defina-',
    'seu-token',
    'example.com',
  ];

  return markers.some((marker) => normalized.includes(marker));
}

function maskValue(key, value = '') {
  if (!value) return '';

  const upperKey = key.toUpperCase();
  if (upperKey.includes('PASSWORD') || upperKey.includes('SECRET') || upperKey.includes('TOKEN')) {
    if (value.length <= 8) return '********';
    return `${value.slice(0, 4)}********${value.slice(-4)}`;
  }

  return value;
}

function validateEnv(env) {
  const missing = [];
  const placeholders = [];
  const recommendedMissing = [];
  const recommendedPlaceholders = [];

  for (const key of requiredEnvKeys) {
    const value = env[key];
    if (!value || !String(value).trim()) {
      missing.push(key);
      continue;
    }

    if (isPlaceholderValue(value)) {
      placeholders.push(key);
    }
  }

  for (const key of recommendedFrontendEnvKeys) {
    const value = env[key];
    if (!value || !String(value).trim()) {
      recommendedMissing.push(key);
      continue;
    }

    if (isPlaceholderValue(value)) {
      recommendedPlaceholders.push(key);
    }
  }

  return { missing, placeholders, recommendedMissing, recommendedPlaceholders };
}

function buildEnvReview(env) {
  const orderedKeys = [
    ...requiredEnvKeys,
    'URL_FRONTEND',
    'CORS_ORIGIN',
    'SUPERADMIN_EMAIL',
    'SUPERADMIN_PASSWORD',
    'SUPERADMIN_NOME',
  ];

  const lines = [];
  for (const key of orderedKeys) {
    if (!(key in env)) continue;
    lines.push(`${key}=${maskValue(key, env[key])}`);
  }

  return lines.join('\n');
}

function buildEnvExport(env) {
  const orderedKeys = [
    ...requiredEnvKeys,
    'URL_FRONTEND',
    'CORS_ORIGIN',
    'SUPERADMIN_EMAIL',
    'SUPERADMIN_PASSWORD',
    'SUPERADMIN_NOME',
  ];

  const lines = [];
  for (const key of orderedKeys) {
    if (!(key in env)) continue;
    lines.push(`${key}=${env[key]}`);
  }

  return lines.join('\n');
}

function buildFrontendEnv(env) {
  const publicBaseUrl = env.PUBLIC_BASE_URL || env.FRONTEND_URL || 'https://prescrimed.com.br';
  const frontendEnv = {
    VITE_API_URL: env.VITE_API_URL || '/api',
    VITE_BACKEND_ROOT: env.VITE_BACKEND_ROOT || publicBaseUrl,
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
  };

  return frontendEnv;
}

function buildFrontendEnvExport(env) {
  return Object.entries(buildFrontendEnv(env))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

function buildFrontendEnvReview(env) {
  return Object.entries(buildFrontendEnv(env))
    .map(([key, value]) => `${key}=${maskValue(key, value)}`)
    .join('\n');
}

function buildDeploymentSummary(env) {
  const frontendDomain = env.FRONTEND_URL || env.URL_FRONTEND || 'https://seu-dominio';
  const apiDomain = env.PUBLIC_BASE_URL || env.API_BASE_URL || env.BACKEND_URL || frontendDomain;
  const frontendEnv = buildFrontendEnv(env);
  const supabaseFrontendReady = Boolean(frontendEnv.VITE_SUPABASE_URL && frontendEnv.VITE_SUPABASE_ANON_KEY);

  const normalizedFrontend = String(frontendDomain || '').replace(/\/$/, '');
  const normalizedApi = String(apiDomain || '').replace(/\/$/, '');

  return [
    'PRESCRIMED - RESUMO DE PREPARO HOSTGATOR',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
    'ARTEFATOS GERADOS',
    '- Template/ -> frontend estatico pronto para upload (modo B: public_html)',
    '- hostgator-artifacts/node-app-manager.env.txt -> variaveis para copiar no painel',
    '- hostgator-artifacts/frontend-hostgator.env.txt -> variaveis finais usadas no build hostgator',
    '- hostgator-artifacts/deploy-summary.txt -> este resumo',
    '- client/.env.hostgator.local -> override local do build hostgator gerado automaticamente',
    '',
    'NODE APP MANAGER',
    '- Node.js: 20.x ou superior',
    '- Mode: Production',
    '- Startup file: server.js',
    '- Application root: pasta raiz do projeto',
    '',
    'URLS PARA TESTE',
    `- Frontend: ${normalizedFrontend}`,
    `- API health: ${normalizedApi}/health`,
    `- API login: ${normalizedApi}/api/auth/login`,
    '',
    'FRONTEND HOSTGATOR',
    `- VITE_API_URL=${frontendEnv.VITE_API_URL}`,
    `- VITE_BACKEND_ROOT=${frontendEnv.VITE_BACKEND_ROOT}`,
    `- SDK Supabase no frontend: ${supabaseFrontendReady ? 'pronto' : 'pendente de anon key/url publica'}`,
    '',
    'BOOTSTRAP',
    '- Depois de publicar e subir a app Node:',
    '- npm run seed:hostgator',
    '- npm run create:superadmin',
    '',
    'TOPOLOGIA (RECOMENDADO)',
    '- Modo A (mesmo dominio): rode npm run build:client e deixe o Node servir o frontend via client/dist.',
    '- Modo B (public_html): envie Template/ para public_html e garanta que /api/* chegue no Node.',
    '- Modo B + subdominio (backend.): publique o frontend no www e a API no subdominio backend.; nesse caso PUBLIC_BASE_URL deve ser o dominio da API.',
    '',
    'OBSERVACOES',
    '- Este preparo valida placeholders perigosos no .env local.',
    '- Ajuste DATABASE_URL e os secrets JWT antes da publicacao real.',
    '- Se VITE_SUPABASE_ANON_KEY estiver vazia, o frontend continua operacional, mas o SDK do Supabase fica apenas parcial.',
  ].join('\n');
}

function buildEnvIssuesReport(missing, placeholders, recommendedMissing, recommendedPlaceholders) {
  const lines = [
    'PRESCRIMED - REVISAO DE AMBIENTE HOSTGATOR',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
  ];

  if (!missing.length && !placeholders.length && !recommendedMissing.length && !recommendedPlaceholders.length) {
    lines.push('Status: OK');
    lines.push('Nenhuma pendencia encontrada nas variaveis obrigatorias.');
    return lines.join('\n');
  }

  lines.push('Status: PENDENTE');

  if (missing.length) {
    lines.push('');
    lines.push(`Variaveis ausentes: ${missing.join(', ')}`);
  }

  if (placeholders.length) {
    lines.push('');
    lines.push(`Variaveis com placeholder: ${placeholders.join(', ')}`);
  }

  if (recommendedMissing.length) {
    lines.push('');
    lines.push(`Variaveis recomendadas para frontend/Supabase ausentes: ${recommendedMissing.join(', ')}`);
  }

  if (recommendedPlaceholders.length) {
    lines.push('');
    lines.push(`Variaveis recomendadas para frontend/Supabase com placeholder: ${recommendedPlaceholders.join(', ')}`);
  }

  lines.push('');
  lines.push('Ajuste essas chaves no .env.hostgator.production.local e depois rode novamente npm run hostgator:prepare.');
  return lines.join('\n');
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} falhou com código ${code}`));
    });

    child.on('error', reject);
  });
}

async function prepareHostgatorDeploy() {
  console.log('🚀 Preparando deploy HostGator...');

  const envConfig = readEnvFile(localEnvPath);

  if (!envConfig) {
    console.warn('⚠️ Arquivo local de ambiente não encontrado: .env.hostgator.production.local');
    console.warn('⚠️ Continue apenas se as variáveis forem configuradas diretamente no painel do HostGator.');
  } else {
    console.log('✅ Arquivo local de ambiente encontrado.');

    ensureDir(artifactsDirPath);

    const { missing, placeholders, recommendedMissing, recommendedPlaceholders } = validateEnv(envConfig);
    const frontendEnvExport = buildFrontendEnvExport(envConfig);

    fs.writeFileSync(
      path.join(artifactsDirPath, 'node-app-manager.env.txt'),
      buildEnvExport(envConfig),
      'utf8'
    );
    fs.writeFileSync(
      path.join(artifactsDirPath, 'node-app-manager.env.preview.txt'),
      buildEnvReview(envConfig),
      'utf8'
    );
    fs.writeFileSync(
      path.join(artifactsDirPath, 'frontend-hostgator.env.txt'),
      frontendEnvExport,
      'utf8'
    );
    fs.writeFileSync(
      path.join(artifactsDirPath, 'frontend-hostgator.env.preview.txt'),
      buildFrontendEnvReview(envConfig),
      'utf8'
    );
    fs.writeFileSync(
      path.join(artifactsDirPath, 'deploy-summary.txt'),
      buildDeploymentSummary(envConfig),
      'utf8'
    );
    fs.writeFileSync(
      path.join(artifactsDirPath, 'env-validation.txt'),
      buildEnvIssuesReport(missing, placeholders, recommendedMissing, recommendedPlaceholders),
      'utf8'
    );
    fs.writeFileSync(clientHostgatorLocalEnvPath, `${frontendEnvExport}\n`, 'utf8');

    if (missing.length) {
      console.warn(`⚠️ Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
    }

    if (placeholders.length) {
      console.warn(`⚠️ Variáveis ainda com placeholder: ${placeholders.join(', ')}`);
    }

    if (recommendedMissing.length) {
      console.warn(`⚠️ Variáveis recomendadas para o frontend Supabase ausentes: ${recommendedMissing.join(', ')}`);
    }

    if (recommendedPlaceholders.length) {
      console.warn(`⚠️ Variáveis recomendadas para o frontend Supabase ainda com placeholder: ${recommendedPlaceholders.join(', ')}`);
    }

    console.log('✅ Revisão do .env registrada em hostgator-artifacts/env-validation.txt.');
    console.log('✅ Artefatos do Node App Manager gerados em hostgator-artifacts/.');
    console.log('✅ Arquivo client/.env.hostgator.local sincronizado para o build do frontend HostGator.');
  }

  await run('npm', ['install']);
  await run('npm', ['run', 'build:template']);

  if (!fs.existsSync(clientDistPath)) {
    throw new Error('Build do frontend não foi gerado em client/dist');
  }

  if (!fs.existsSync(templateDirPath)) {
    throw new Error('Template/ não foi gerado. Verifique npm run build:template');
  }

  console.log('✅ Dependências instaladas');
  console.log('✅ Frontend compilado em client/dist');
  console.log('✅ Template pronto em Template/ (modo B: upload no public_html)');
  console.log('📌 Próximos passos no HostGator:');
  console.log('   1. Copiar hostgator-artifacts/node-app-manager.env.txt para o Node App Manager');
  console.log('   2. Revisar hostgator-artifacts/env-validation.txt e substituir placeholders pendentes');
  console.log('   3. Iniciar a aplicação com server.js');
  console.log('   4. Rodar npm run seed:hostgator uma vez');
  console.log('   5. MODO A (recomendado - mesmo dominio): rodar npm run build:client');
  console.log('   6. MODO B (public_html): enviar Template/ para o public_html');
}

prepareHostgatorDeploy().catch((error) => {
  console.error('❌ Falha ao preparar deploy HostGator:', error.message);
  process.exitCode = 1;
});