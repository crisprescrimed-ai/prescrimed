import 'dotenv/config';
import { sequelize } from '../models/index.js';

function getResolvedDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POOLER_URL ||
    ''
  ).trim();
}

async function checkSupabaseConnection() {
  const databaseUrl = getResolvedDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('Defina DATABASE_URL, SUPABASE_DB_URL ou SUPABASE_POOLER_URL antes de testar a conexão.');
  }

  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, '');
  const sslMode = parsed.searchParams.get('sslmode') || 'not-set';

  console.log('🔎 Validando conexão PostgreSQL/Supabase...');
  console.log(`   Host: ${host}`);
  console.log(`   Database: ${database}`);
  console.log(`   sslmode: ${sslMode}`);

  await sequelize.authenticate();

  const [result] = await sequelize.query('select current_database() as database, current_user as user_name, version() as version');
  const info = Array.isArray(result) ? result[0] : result;

  console.log('✅ Conexão validada com sucesso');
  console.log(`   current_database: ${info?.database}`);
  console.log(`   current_user: ${info?.user_name}`);
}

checkSupabaseConnection()
  .catch((error) => {
    console.error('❌ Falha ao validar Supabase/PostgreSQL:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
  });