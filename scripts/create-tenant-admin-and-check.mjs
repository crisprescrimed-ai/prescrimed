/* Cria um usuário admin vinculado a uma empresa importada e valida evolução por tenant. */
const BASE = process.env.BASE_URL || 'https://prescrimed-backend-production.up.railway.app';
const SUPER_EMAIL = process.env.SUPER_EMAIL || 'jeansoares@gmail.com';
const SUPER_SENHA = process.env.SUPER_SENHA || '123456';
const TARGET_EMPRESA_ID = process.env.TARGET_EMPRESA_ID || '181c5405-348a-4ec6-8657-371bac432dac';
const NEW_EMAIL = process.env.NEW_EMAIL || 'admin.empresa+demo@prescrimed.com';
const NEW_SENHA = process.env.NEW_SENHA || 'admin123';

async function fetchJson(url, opts={}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  try {
    console.log('🔎 BASE_URL =', BASE);
    // Login superadmin
    let login = await fetchJson(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SUPER_EMAIL, senha: SUPER_SENHA })
    });
    if (!login.ok) {
      console.log('ℹ️ Superadmin login falhou; registrando demo...');
      const reg = await fetchJson(`${BASE}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeEmpresa: 'Clínica Demo', tipoSistema: 'casa-repouso', cnpj: '12345678000199',
          nomeAdmin: 'Jean Soares', email: SUPER_EMAIL, senha: SUPER_SENHA, cpf: '12345678900', contato: '(71) 99658-2310'
        })
      });
      if (!reg.ok) throw new Error(`Registro falhou (${reg.status}): ${typeof reg.data==='string'?reg.data:JSON.stringify(reg.data)}`);
      login = await fetchJson(`${BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: SUPER_EMAIL, senha: SUPER_SENHA })
      });
      if (!login.ok) throw new Error(`Login falhou (${login.status}): ${typeof login.data==='string'?login.data:JSON.stringify(login.data)}`);
    }
    const token = login.data.token;
    console.log('🔐 Superadmin OK');

    // Verifica se usuário já existe
    const list = await fetchJson(`${BASE}/api/usuarios?empresaId=${TARGET_EMPRESA_ID}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!list.ok) throw new Error(`Listagem usuários falhou (${list.status}): ${JSON.stringify(list.data)}`);
    const exists = Array.isArray(list.data) && list.data.find(u => u.email === NEW_EMAIL);

    if (!exists) {
      console.log('👤 Criando admin vinculado à empresa alvo...');
      const create = await fetchJson(`${BASE}/api/usuarios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: 'Admin Empresa', email: NEW_EMAIL, senha: NEW_SENHA,
          role: 'admin', empresaId: TARGET_EMPRESA_ID, ativo: true
        })
      });
      if (!create.ok) throw new Error(`Criação falhou (${create.status}): ${JSON.stringify(create.data)}`);
      console.log('✅ Admin criado.');
    } else {
      console.log('ℹ️ Admin já existe.');
    }

    // Login como admin vinculado
    const loginAdmin = await fetchJson(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: NEW_EMAIL, senha: NEW_SENHA })
    });
    if (!loginAdmin.ok) throw new Error(`Login admin falhou (${loginAdmin.status}): ${JSON.stringify(loginAdmin.data)}`);
    const tokenAdmin = loginAdmin.data.token;
    console.log('🔐 Admin tenant OK');

    // Checa evolução por tenant
    const evol = await fetchJson(`${BASE}/api/enfermagem`, { headers: { Authorization: `Bearer ${tokenAdmin}` } });
    console.log('📋 Evolução por tenant:', evol.status, Array.isArray(evol.data)?evol.data.length:evol.data);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
