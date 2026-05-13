// Verifica tabelas e colunas no PostgreSQL (Railway)
// Uso: node scripts/check-pg-tables.js <DATABASE_URL>

import pg from 'pg';

const dbUrl = process.argv[2] || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Uso: node scripts/check-pg-tables.js <DATABASE_URL>');
  process.exit(1);
}

let ssl = { rejectUnauthorized: false };
try {
  const url = new URL(dbUrl);
  const host = (url.hostname || '').toLowerCase();
  const sslMode = url.searchParams.get('sslmode');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (isLocal || sslMode === 'disable') {
    ssl = false;
  }
} catch {
  // Se não conseguir parsear, mantém SSL ligado por compatibilidade com Railway
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl,
});

async function run() {
  try {
    console.log('🔌 Conectando no PostgreSQL para verificação...');
    await client.connect();
    console.log('✅ Conectado');

    const { rows: tables } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    const tableNames = tables.map(t => t.tablename);
    console.log('📋 Tabelas públicas:', tableNames);

    const expected = ['empresas', 'usuarios', 'pacientes', 'prescricoes'];
    expected.forEach(name => {
      const exists = tableNames.includes(name);
      console.log(`${exists ? '✅' : '❌'} ${name}`);
    });

    // Conferir colunas chave
    const colChecks = [
      { table: 'empresas', columns: ['id', 'nome', 'tipoSistema', 'cnpj', 'ativo'] },
      { table: 'usuarios', columns: ['id', 'nome', 'email', 'role', 'empresaId', 'cpf', 'contato'] },
      { table: 'pacientes', columns: ['id', 'nome', 'empresaId'] },
      { table: 'prescricoes', columns: ['id', 'tipo', 'status', 'empresaId', 'pacienteId'] },
    ];

    for (const check of colChecks) {
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
        [check.table]
      );
      const cols = rows.map(r => r.column_name);
      const missing = check.columns.filter(c => !cols.includes(c));
      if (missing.length === 0) {
        console.log(`🔎 ${check.table}: todas as colunas presentes`);
      } else {
        console.log(`⚠️ ${check.table}: faltando colunas -> ${missing.join(', ')}`);
      }
    }

    console.log('🎉 Verificação concluída');
  } catch (err) {
    console.error('❌ Erro na verificação:', err.message);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch {}
  }
}

run();
