import dotenv from 'dotenv';
import { applyDatabaseHardeningFromUrl } from '../utils/databaseHardening.js';

dotenv.config();

const databaseUrl = (
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  ''
).trim();

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada. Carregue o .env correto antes de executar este script.');
  process.exit(1);
}

applyDatabaseHardeningFromUrl(databaseUrl)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Falha ao aplicar hardening Supabase:', error?.message || error);
    process.exit(1);
  });