import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const EXPORT_DIR = path.resolve('data', 'export');
const SOURCE_URL = (
  process.env.SOURCE_DATABASE_URL ||
  process.env.DATABASE_URL_OVERRIDE ||
  process.env.DATABASE_URL ||
  ''
).trim();

const TABLES = (process.env.EXPORT_ONLY_TABLE || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const DEFAULT_TABLES = [
  'empresas',
  'usuarios',
  'pacientes',
  'EstoqueItens',
  'EstoqueMovimentacoes',
  'FinanceiroTransacoes',
  'prescricoes',
  'agendamentos',
  'cr_leitos',
  'petshop_pets',
  'fisio_sessoes',
  'RegistrosEnfermagem'
];

function maskUrl(url) {
  if (!url) return '';
  return url.replace(/:[^:@]+@/g, ':***@');
}

function buildClient(url) {
  const isInternal = url.includes('.internal');
  const isLocal = /localhost|127\.0\.0\.1|\[::1\]/i.test(url);
  return new pg.Client({
    connectionString: url,
    ssl: (isInternal || isLocal) ? undefined : { rejectUnauthorized: false }
  });
}

async function tableExists(client, table) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [table]
  );
  return Boolean(result.rows[0]?.exists);
}

async function exportTable(client, table) {
  if (!(await tableExists(client, table))) {
    console.warn(`⚠️ Tabela ${table} não encontrada na origem. Pulando.`);
    return { table, exported: 0, missing: true };
  }

  const result = await client.query(`SELECT * FROM "${table}"`);
  const rows = result.rows || [];
  const filePath = path.join(EXPORT_DIR, `${table}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(rows, null, 2), 'utf8');
  return { table, exported: rows.length, filePath };
}

async function main() {
  if (!SOURCE_URL) {
    console.error('❌ Defina SOURCE_DATABASE_URL, DATABASE_URL_OVERRIDE ou DATABASE_URL para exportar do Postgres de origem.');
    process.exit(1);
  }

  await fs.promises.mkdir(EXPORT_DIR, { recursive: true });
  const client = buildClient(SOURCE_URL);
  const tables = TABLES.length ? TABLES : DEFAULT_TABLES;

  try {
    console.log(`🔌 Exportando dados da origem: ${maskUrl(SOURCE_URL)}`);
    await client.connect();

    const summary = [];
    for (const table of tables) {
      const result = await exportTable(client, table);
      summary.push(result);
      console.log(`✔ ${table}: ${result.exported} registros exportados` + (result.missing ? ' (tabela ausente)' : ''));
    }

    const summaryPath = path.join(EXPORT_DIR, '_summary.json');
    await fs.promises.writeFile(summaryPath, JSON.stringify({ at: new Date().toISOString(), source: maskUrl(SOURCE_URL), summary }, null, 2), 'utf8');
    console.log(`✅ Resumo salvo em ${summaryPath}`);
  } catch (error) {
    console.error('❌ Falha ao exportar Postgres:', error.message);
    process.exitCode = 1;
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

main();