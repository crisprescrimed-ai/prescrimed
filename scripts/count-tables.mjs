/* Conta registros das tabelas principais diretamente no Postgres (ignora tenant da API).
   Use DATABASE_URL_OVERRIDE ou DATABASE_URL. */
import pg from 'pg';

const URL = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;
if (!URL) {
  console.error('❌ Defina DATABASE_URL_OVERRIDE com a URL pública do Postgres (ou DATABASE_URL).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: URL, ssl: { rejectUnauthorized: false } });

const tables = [
  'empresas', 'usuarios', 'pacientes',
  'prescricoes', 'agendamentos', 'RegistrosEnfermagem',
  'cr_leitos', 'petshop_pets', 'fisio_sessoes'
];

async function count(table) {
  try {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    return rows[0]?.c ?? 0;
  } catch (e) {
    return `erro: ${e.message}`;
  }
}

(async () => {
  try {
    console.log('🔌 Conectando...');
    await client.connect();
    console.log('✅ Conectado');
    const result = {};
    for (const t of tables) {
      result[t] = await count(t);
    }
    console.log('📊 Contagens:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  } finally {
    try { await client.end(); } catch {}
  }
})();
