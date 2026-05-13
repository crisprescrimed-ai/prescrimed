import pg from 'pg';
const { Client } = pg;

function maskUrl(url) {
  if (!url) return '';
  return url.replace(/:[^:@]+@/g, ':***@');
}

async function checkTables() {
  const databaseUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não definida. Defina DATABASE_URL (ou DATABASE_URL_OVERRIDE) com o Postgres do Railway.');
    process.exit(1);
  }

  const isInternal = databaseUrl.includes('railway.internal');
  const isLocal = /localhost|127\.0\.0\.1|\[::1\]/i.test(databaseUrl);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: (isInternal || isLocal) ? undefined : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ Conectado ao Postgres: ${maskUrl(databaseUrl)}`);

    // Lista todas as tabelas no schema public
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📋 Tabelas encontradas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log(`\n📊 Total: ${result.rows.length} tabelas`);

    // Verifica dados nas tabelas principais
    const empresas = await client.query('SELECT COUNT(*) FROM empresas');
    const usuarios = await client.query('SELECT COUNT(*) FROM usuarios');
    const pacientes = await client.query('SELECT COUNT(*) FROM pacientes');
    
    console.log('\n📈 Dados nas tabelas:');
    console.log(`  - Empresas: ${empresas.rows[0].count}`);
    console.log(`  - Usuários: ${usuarios.rows[0].count}`);
    console.log(`  - Pacientes: ${pacientes.rows[0].count}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
