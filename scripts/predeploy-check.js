#!/usr/bin/env node
/**
 * Predeploy Check
 * Tenta validar variáveis no projeto Railway automaticamente.
 * - Se Railway CLI estiver instalado, roda `railway run` para injetar as Variables remotas
 * - Caso contrário, valida apenas o ambiente local atual
 */

import { spawnSync } from 'node:child_process';

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  return res;
}

function checkWithRailway() {
  const res = run('railway', ['run', 'node', 'scripts/check-railway-config.js']);
  if (typeof res.status === 'number') return res.status;
  return 1;
}

function checkLocal() {
  const res = run('node', ['scripts/check-railway-config.js']);
  return res.status ?? 1;
}

console.log('\n🔎 Predeploy: validando variáveis de ambiente...');
let status;

// Primeiro tenta via Railway CLI (se disponível)
const probe = spawnSync('railway', ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
if (probe.status === 0) {
  console.log('⚙️  Railway CLI detectado — validando com variáveis do projeto');
  status = checkWithRailway();
} else {
  console.log('ℹ️ Railway CLI não encontrado — validando ambiente local');
  status = checkLocal();
}

process.exit(status);
