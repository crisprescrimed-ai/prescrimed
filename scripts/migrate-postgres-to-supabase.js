import 'dotenv/config';
import { spawn } from 'child_process';

const rootEnv = { ...process.env };

function resolveSourceUrl() {
  return (
    process.env.SOURCE_DATABASE_URL ||
    process.env.DATABASE_URL_OVERRIDE ||
    process.env.DATABASE_URL ||
    ''
  ).trim();
}

function resolveTargetUrl() {
  return (
    process.env.TARGET_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POOLER_URL ||
    ''
  ).trim();
}

function runNodeScript(scriptPath, env, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env,
      stdio: 'inherit',
      shell: false,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} falhou com código ${code}`));
    });

    child.on('error', reject);
  });
}

async function main() {
  const sourceUrl = resolveSourceUrl();
  const targetUrl = resolveTargetUrl();

  if (!sourceUrl) {
    throw new Error('Defina SOURCE_DATABASE_URL, DATABASE_URL_OVERRIDE ou DATABASE_URL com o Postgres de origem antes da migração.');
  }

  if (!targetUrl) {
    throw new Error('Defina TARGET_DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POOLER_URL ou DATABASE_URL com o Postgres destino.');
  }

  if (sourceUrl === targetUrl) {
    throw new Error('A URL de origem e a URL de destino são iguais. Informe uma URL do Supabase diferente do banco de origem.');
  }

  console.log('🚀 Iniciando migração Postgres -> Supabase...');
  console.log('1/3 Exportando dados para JSON...');
  await runNodeScript('scripts/export-postgres-to-json.js', {
    ...rootEnv,
    SOURCE_DATABASE_URL: sourceUrl,
  }, 'exportação');

  console.log('2/3 Validando conexão com o destino...');
  await runNodeScript('scripts/check-supabase-connection.js', {
    ...rootEnv,
    DATABASE_URL: targetUrl,
    SUPABASE_DB_URL: targetUrl,
    SUPABASE_POOLER_URL: targetUrl,
  }, 'validação do destino');

  console.log('3/3 Importando JSON no destino...');
  await runNodeScript('scripts/import-json-to-postgres.js', {
    ...rootEnv,
    DATABASE_URL_OVERRIDE: targetUrl,
  }, 'importação');

  console.log('✅ Migração concluída. Rode npm run supabase:check apontando para o destino e valide a aplicação.');
}

main().catch((error) => {
  console.error('❌ Falha na migração Postgres -> Supabase:', error.message);
  process.exitCode = 1;
});