/* Eleva usuário demo para superadmin para acessar todos os tenants. */
const BASE = process.env.BASE_URL || 'https://prescrimed-backend-production.up.railway.app';
const EMAIL = process.env.EMAIL || 'jeansoares@gmail.com';
const SENHA = process.env.SENHA || '123456';

async function fetchJson(url, opts={}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  try {
    console.log('🔎 BASE_URL =', BASE);
    let login = await fetchJson(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, senha: SENHA })
    });
    if (!login.ok) {
      console.log('ℹ️ Login falhou, tentando registrar empresa/admin demo...');
      const register = await fetchJson(`${BASE}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeEmpresa: 'Clínica Demo', tipoSistema: 'casa-repouso', cnpj: '12345678000199',
          nomeAdmin: 'Jean Soares', email: EMAIL, senha: SENHA, cpf: '12345678900', contato: '(71) 99658-2310'
        })
      });
      if (!register.ok) throw new Error(`Registro falhou (${register.status}): ${typeof register.data==='string'?register.data:JSON.stringify(register.data)}`);
      login = await fetchJson(`${BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, senha: SENHA })
      });
      if (!login.ok) throw new Error(`Login falhou (${login.status}): ${typeof login.data==='string'?login.data:JSON.stringify(login.data)}`);
    }
    const token = login.data.token;
    console.log('🔐 Login OK');

    const users = await fetchJson(`${BASE}/api/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
    if (!users.ok) throw new Error(`Listagem falhou (${users.status}): ${typeof users.data==='string'?users.data:JSON.stringify(users.data)}`);

    const me = Array.isArray(users.data) ? users.data.find(u => u.email === EMAIL) : null;
    if (!me?.id) throw new Error('Usuário demo não encontrado na listagem');

    const upd = await fetchJson(`${BASE}/api/usuarios/${me.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: 'superadmin' })
    });
    if (!upd.ok) throw new Error(`Elevação falhou (${upd.status}): ${typeof upd.data==='string'?upd.data:JSON.stringify(upd.data)}`);

    console.log('🏁 Usuário elevado para superadmin.');
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
