/* Teste completo Railway: health + login/registro + listagens principais */
const BASE = process.env.BASE_URL || process.argv[2] || 'http://localhost:8000';

// Permite passar BASE via env ou como primeiro argumento CLI.

import http from 'node:http';
import https from 'node:https';

function tryParse(jsonText) {
  try { return JSON.parse(jsonText); } catch { return jsonText; }
}

async function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const options = {
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };
    const req = lib.request(u, options, (res) => {
      let txt = '';
      res.on('data', (chunk) => { txt += chunk; });
      res.on('end', () => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: tryParse(txt) });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function main() {
  console.log('🔎 BASE_URL =', BASE);
  const api = (p) => `${BASE}/api${p}`;

  // Health
  const health = await fetchJson(`${BASE}/health`);
  console.log('🩺 /health:', health.status, health.data);

  // Tentar login com admin demo
  let token = null;
  let userEmail = 'admin.demo@prescrimed.com';
  let userPass = 'Demo@123456';

  const login1 = await fetchJson(api('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, senha: userPass })
  });
  if (!login1.ok) {
    console.log('ℹ️ Login demo falhou, tentando registro de empresa + admin...');
    const register = await fetchJson(api('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeEmpresa: 'Casa Repouso Demo',
        tipoSistema: 'casa-repouso',
        cnpj: '11222333000144',
        nomeAdmin: 'Admin Demo',
        email: userEmail,
        senha: userPass,
        cpf: '12345678900',
        contato: '(71) 99658-2310'
      })
    });
    console.log('📝 /auth/register:', register.status, typeof register.data === 'object' ? 'ok' : register.data);

    const login2 = await fetchJson(api('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, senha: userPass })
    });
    if (!login2.ok) {
      console.error('❌ Login após registro falhou:', login2.status, login2.data);
      process.exit(1);
    }
    token = login2.data.token;
  } else {
    token = login1.data.token;
  }
  console.log('🔐 Login OK');

  const headers = { Authorization: `Bearer ${token}` };

  // Listagens principais
  const endpoints = [
    ['/pacientes', '👥 Pacientes'],
    ['/agendamentos', '🗓️ Agendamentos'],
    ['/prescricoes', '💊 Prescrições'],
    ['/enfermagem', '🏥 Enfermagem'],
    ['/petshop/pets', '🐾 Pets'],
    ['/fisioterapia/sessoes', '🏃 Fisio'],
    ['/estoque/itens', '📦 Estoque'],
    ['/financeiro/transacoes', '💰 Financeiro']
  ];

  for (const [path, label] of endpoints) {
    const res = await fetchJson(api(path), { headers });
    const count = Array.isArray(res.data) ? res.data.length : res.data;
    console.log(`${label}:`, res.status, count);
  }

  console.log('\n🎉 Teste completo Railway concluído.');
}

main().catch(err => { console.error('❌ Erro:', err?.message || err); console.error(err?.stack || ''); process.exit(1); });
