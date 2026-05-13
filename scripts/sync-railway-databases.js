import { Sequelize } from 'sequelize';

function maskUrl(url) {
  if (!url) return '';
  return url.replace(/:[^:@]+@/g, ':***@');
}

async function syncSchemaToTarget() {
  const sourceUrl = process.env.DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (!sourceUrl) {
    console.error('❌ DATABASE_URL não definida. Rode este script apontando para o banco de origem (local).');
    process.exit(1);
  }
  if (!targetUrl) {
    console.error('❌ TARGET_DATABASE_URL não definida. Informe a URL do Postgres destino (Railway).');
    console.error('   Ex.: TARGET_DATABASE_URL="postgresql://..." node scripts/sync-railway-databases.js');
    process.exit(1);
  }

  console.log(`🔧 Sincronizando schema (Sequelize sync) para o destino: ${maskUrl(targetUrl)}`);

  const isInternal = targetUrl.includes('railway.internal');
  const sequelize = new Sequelize(targetUrl, {
    dialect: 'postgres',
    dialectOptions: isInternal ? {} : { ssl: { rejectUnauthorized: false } },
    logging: false,
    pool: { max: 5, min: 0, acquire: 60000, idle: 10000 }
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao Postgres destino');

    // Importa models do projeto e sincroniza no destino.
    // Observação: os models usam o sequelize padrão do app; aqui fazemos sync via QueryInterface.
    // Para manter simples e não criar side-effects, delegamos para o próprio servidor quando necessário.
    console.log('ℹ️ Este script agora apenas valida conexão. Para criar/atualizar tabelas no Railway, use:');
    console.log('   - `SYNC_FORCE=true node server.js` (recria) ou `FORCE_SYNC=true node server.js` (ALTER)');
  } catch (error) {
    console.error('❌ Erro ao conectar/sincronizar:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

syncSchemaToTarget();
