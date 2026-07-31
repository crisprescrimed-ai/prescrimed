#!/usr/bin/env node
/**
 * seed-basic.js
 * - Valida variáveis de ambiente mínimas para PostgreSQL
 * - Fornece instruções rápidas caso falte configuração
 * - Executa de forma segura o `scripts/seed-complete-data.js`
 *
 * Uso:
 *   node scripts/seed-basic.js
 */
import 'dotenv/config';
import { spawn } from 'child_process';

function hasDbEnv() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE)
  );
}

if (!hasDbEnv()) {
  console.error('\n❌ Variáveis de conexão com PostgreSQL não encontradas.');
  console.error('Defina `DATABASE_URL` ou as variáveis `PGHOST/PGUSER/PGPASSWORD/PGDATABASE` no seu .env.');
  console.error('\nExemplo rápido: copie o exemplo e ajuste:');
  console.error('  cp .env.example .env');
  console.error('\nInstale dependências necessárias caso ainda não tenha:');
  console.error('  npm install sequelize pg pg-hstore bcryptjs dotenv --save');
  console.error('\nDepois, execute:');
  console.error('  node scripts/seed-complete-data.js');
  process.exit(1);
}

console.log('\n🔁 Executando seed completo (wrapper) via scripts/seed-complete-data.js');

const child = spawn(process.execPath, ['scripts/seed-complete-data.js'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Seed finalizado com sucesso.');
    process.exit(0);
  } else {
    console.error(`\n❌ Seed retornou código ${code}. Verifique a saída acima para erros.`);
    process.exit(code ?? 1);
  }
});
