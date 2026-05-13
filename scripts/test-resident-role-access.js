import axios from 'axios';
import 'dotenv/config';

const API = process.env.API_URL || 'http://localhost:8000/api';
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'teste123';

function envTrue(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(raw).trim().toLowerCase());
}

const ADMIN_SMOKE_ENABLED = envTrue('TEST_ADMIN_SMOKE', false);
const ADMIN_SMOKE_WRITE_ENABLED = envTrue('TEST_ADMIN_SMOKE_WRITE', false);

function roleEmail(role, slug) {
  return `${String(role).replace(/_+/g, '-')}.${slug}@prescrimed.com`;
}

function isAxiosError(err) {
  return !!(err && typeof err === 'object' && (err.isAxiosError || err.response || err.request));
}

function formatAxiosError(err) {
  if (!isAxiosError(err)) return err?.message || String(err);
  const status = err.response?.status;
  const data = err.response?.data;
  const details = typeof data === 'string' ? data : (data?.error || data?.message || JSON.stringify(data));
  return `${err.message}${status ? ` (HTTP ${status})` : ''}${details ? ` → ${details}` : ''}`;
}

async function waitForApiReady({ timeoutMs = 20000 } = {}) {
  const startedAt = Date.now();
  // /api/test é público e serve como ping
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await axios.get(`${API}/test`, { timeout: 2000 });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 750));
    }
  }
  return false;
}

async function login(email, senha) {
  const { data } = await axios.post(`${API}/auth/login`, { email, senha });
  return data?.token;
}

async function authed(token) {
  const client = axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } });
  return client;
}

async function runAdminSmoke(client, { empresaId, email }) {
  console.log(`   🔎 admin smoke: ${ADMIN_SMOKE_WRITE_ENABLED ? 'read+write' : 'read-only'}`);

  // Empresa
  const empresaMe = await client.get('/empresas/me');
  console.log('   🏢 empresas/me:', empresaMe?.data?.nome || 'ok');

  // Usuários: listagem
  const users = await client.get('/usuarios', { params: { page: 1, pageSize: 5, empresaId } });
  const items = users?.data?.items || [];
  console.log('   👤 usuarios listados:', items.length);

  // Usuário atual: summary (usa estatísticas mock)
  const summary = await client.get('/usuarios/me/summary');
  console.log('   🧾 usuarios/me/summary:', summary?.data?.usuario?.email || email || 'ok');

  if (!ADMIN_SMOKE_WRITE_ENABLED) return;

  // Usuários: cria + busca + remove (limpa depois)
  const unique = Date.now();
  const tempEmail = `temp.admin-smoke.${unique}@prescrimed.com`;
  const created = await client.post('/usuarios', {
    nome: `Temp Admin Smoke ${unique}`,
    email: tempEmail,
    senha: DEFAULT_PASSWORD,
    role: 'atendente',
    permissoes: []
  });
  const tempId = created?.data?.id;
  console.log('   ✅ usuario temp criado:', tempId || 'ok');

  if (tempId) {
    await client.get(`/usuarios/${tempId}`);
    await client.delete(`/usuarios/${tempId}`);
    console.log('   🧹 usuario temp removido:', tempId);
  }
}

async function run() {
  try {
    console.log('🔐 Testando acessos por role (residentes)...');

    const ready = await waitForApiReady();
    if (!ready) {
      throw new Error(`API não respondeu em ${API}/test dentro do timeout. Verifique se o backend está rodando.`);
    }

    // Buscar empresaId via /usuarios/me (após login)
    const accounts = [
      { role: 'admin', email: null },
      { role: 'nutricionista', email: null },
      { role: 'medico', email: null },
      { role: 'assistente_social', email: null },
      { role: 'tecnico_enfermagem', email: null },
      { role: 'auxiliar_administrativo', email: null },
      // Perfil solicitado: “Estoque” (email dedicado), mas role no banco é auxiliar_administrativo
      { role: 'estoque', email: null },
    ];

    // Descobrir emails criados (padrão): <role>.<slugEmpresa>@prescrimed.com — vamos tentar pela empresa principal slug
    const slug = 'casa-de-repouso-vida-plena';
    for (const acc of accounts) {
      acc.email = roleEmail(acc.role, slug);
    }

    // Fallback: se não existir, usar já existentes conhecidos
    const fallbacks = {
      admin: 'admin@prescrimed.com',
      nutricionista: 'joao.nutri@prescrimed.com',
      estoque: roleEmail('auxiliar_administrativo', slug),
    };

    for (const acc of accounts) {
      let email = acc.email;
      let token;
      try {
        token = await login(email, DEFAULT_PASSWORD);
      } catch (e) {
        if (fallbacks[acc.role]) {
          email = fallbacks[acc.role];
          token = await login(email, DEFAULT_PASSWORD);
        } else {
          throw new Error(`Falha no login para role '${acc.role}' com email '${email}': ${formatAxiosError(e)}`);
        }
      }
      console.log(`\n👤 ${acc.role} → ${email}`);
      const client = await authed(token);

      // Perfil
      const me = await client.get('/usuarios/me');
      const empresaId = me?.data?.empresaId || me?.data?.empresa?.id;
      console.log('   🏢 empresaId =', empresaId);

      // Listar pacientes
      const pacientes = await client.get('/pacientes', { params: { page: 1, pageSize: 5, empresaId } });
      console.log('   👥 pacientes:', pacientes?.data?.items?.length ?? (Array.isArray(pacientes?.data) ? pacientes.data.length : 0));

      // Listar agendamentos
      const agends = await client.get('/agendamentos', { params: { page: 1, pageSize: 5, empresaId } });
      console.log('   📅 agendamentos:', agends?.data?.items?.length ?? (Array.isArray(agends?.data) ? agends.data.length : 0));

      // Estoque (leitura básica)
      try {
        const stats = await client.get('/estoque/stats');
        console.log('   📦 estoque stats:', {
          totalMedicamentos: stats?.data?.totalMedicamentos,
          totalItens: stats?.data?.totalItens,
          emFalta: stats?.data?.emFalta
        });
      } catch (e) {
        throw new Error(`Falha ao ler estoque/stats (${acc.role}): ${formatAxiosError(e)}`);
      }

      // Operações específicas
      if (acc.role === 'nutricionista') {
        const pacItems = pacientes?.data?.items || pacientes?.data || [];
        const pac = pacItems[0];
        if (pac) {
          const presc = await client.post('/prescricoes', {
            pacienteId: pac.id,
            tipo: 'nutricional',
            medicamentos: [ { nome: 'Plano alimentar', dosagem: '', frequencia: '', duracao: '', observacoes: '' } ],
            observacoes: 'Teste rápido'
          });
          console.log('   💊 prescrição criada id =', presc?.data?.id || presc?.data?._id || 'ok');
        }
      }

      if (acc.role === 'medico') {
        const pacItems = pacientes?.data?.items || pacientes?.data || [];
        const pac = pacItems[0];
        if (pac) {
          const presc = await client.post('/prescricoes', {
            pacienteId: pac.id,
            tipo: 'medicamentosa',
            medicamentos: [ { nome: 'Dipirona', dosagem: '500mg', frequencia: '8/8h', duracao: '3 dias', observacoes: '' } ],
            observacoes: 'Prescrição de teste (médico)'
          });
          console.log('   🩻 prescrição medicamentosa id =', presc?.data?.id || presc?.data?._id || 'ok');
        }
      }

      if (acc.role === 'tecnico_enfermagem') {
        const pacItems = pacientes?.data?.items || pacientes?.data || [];
        const pac = pacItems[0];
        if (pac) {
          const reg = await client.post('/enfermagem', {
            pacienteId: pac.id,
            tipo: 'sinais_vitais',
            titulo: 'Aferição teste',
            descricao: 'Registro automatizado de teste',
            sinaisVitais: { PA: '120/80', FC: 72 },
            prioridade: 'baixa'
          });
          console.log('   🩺 registro criado id =', reg?.data?.id || reg?.data?._id || 'ok');
        }
      }

      // Assistente social: valida leitura geral
      if (acc.role === 'assistente_social') {
        // Nenhuma operação de escrita específica; valida leitura ok
        console.log('   📖 assistente social consegue ler pacientes/agendamentos.');
      }

      // Admin/Auxiliar: valida escrita básica no estoque
      if (acc.role === 'admin' || acc.role === 'auxiliar_administrativo' || acc.role === 'estoque') {
        const nome = `Medicamento Teste ${Date.now()}`;
        const created = await client.post('/estoque/medicamentos', {
          nome,
          quantidade: 10,
          unidade: 'un',
          categoria: 'Teste',
          quantidadeMinima: 1
        });
        const itemId = created?.data?.id || created?.data?._id;
        console.log('   ✅ estoque item criado id =', itemId || 'ok');

        if (itemId) {
          await client.post('/estoque/medicamentos/movimentacao', {
            medicamentoId: itemId,
            tipo: 'saida',
            quantidade: 1,
            motivo: 'teste',
            observacao: 'movimentação automatizada'
          });
          const movs = await client.get('/estoque/movimentacoes', { params: { tipo: 'medicamento' } });
          console.log('   🧾 movimentações (med):', movs?.data?.movimentacoes?.length ?? 0);
        }
      }

      // Admin: smoke opcional de rotas de Empresa/Usuários
      if (acc.role === 'admin' && ADMIN_SMOKE_ENABLED) {
        try {
          await runAdminSmoke(client, { empresaId, email });
        } catch (e) {
          throw new Error(`Falha no admin smoke: ${formatAxiosError(e)}`);
        }
      }
    }

    console.log('\n✅ Teste de acesso por roles concluído.');
  } catch (err) {
    console.error('❌ Falha no teste:', err?.message || err);
    process.exitCode = 1;
  }
}

run();
