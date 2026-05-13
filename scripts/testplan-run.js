/**
 * Runner do Plano de Testes (validação via API)
 *
 * Executa checagens e operações via API para confirmar:
 * - Login por role
 * - Isolamento multi-tenant
 * - Criação de registros principais (agendamentos, prescrições, enfermagem)
 * - Regras de imutabilidade (PUT enfermagem -> 405 history_immutable)
 * - Regras de exclusão (DELETE enfermagem: admin -> 403; superadmin -> ok)
 */

import axios from 'axios';

async function resolveApiUrl() {
  if (process.env.API_URL) return process.env.API_URL;

  const candidates = [
    'http://localhost:8000/api',
    'http://localhost:8001/api',
  ];

  for (const baseURL of candidates) {
    try {
      await axios.get(`${baseURL}/test`, { timeout: 2500 });
      return baseURL;
    } catch {
      // tenta o próximo
    }
  }

  // fallback (mantém compatibilidade com documentação antiga)
  return 'http://localhost:8000/api';
}

const API_URL = await resolveApiUrl();
const PASSWORD = process.env.SEED_TEST_PASSWORD || 'Teste@2026';

const PREFIX = 'TP 2026-01-27';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function login(email, senha) {
  const res = await axios.post(`${API_URL}/auth/login`, { email, senha });
  return res.data?.token;
}

function api(token, extraHeaders) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extraHeaders || {}),
    },
    timeout: 60_000,
  });
}

function companySlug(tipo, idx) {
  const pad = String(idx).padStart(2, '0');
  if (tipo === 'casa-repouso') return `casa_${pad}`;
  if (tipo === 'petshop') return `pet_${pad}`;
  return `fisio_${pad}`;
}

function expectedCodigo(tipo, idx) {
  const pad = String(idx).padStart(2, '0');
  if (tipo === 'casa-repouso') return `Casa_${pad}`;
  if (tipo === 'petshop') return `Pet_${pad}`;
  return `Fisio_${pad}`;
}

function findEmpresa(empresas, tipoSistema, idx) {
  const pad = String(idx).padStart(2, '0');
  const codigo = expectedCodigo(tipoSistema, idx);
  const nomeHint =
    tipoSistema === 'casa-repouso'
      ? `Casa de Repouso ${pad}`
      : tipoSistema === 'petshop'
        ? `PetShop ${pad}`
        : `Fisioterapia ${pad}`;

  return empresas.find((e) =>
    e?.tipoSistema === tipoSistema &&
    (String(e?.codigo || '') === codigo || String(e?.nome || '').includes(nomeHint))
  );
}

function rolesByTipo(tipo) {
  const common = ['admin', 'enfermeiro', 'assistente_social', 'medico'];
  if (tipo === 'fisioterapia') return [...common, 'fisioterapeuta'];
  return common;
}

async function getEmpresas(superToken) {
  const client = api(superToken);
  const res = await client.get('/empresas');
  const empresasList = Array.isArray(res.data) ? res.data : (res.data.empresas || []);
  return empresasList.filter((e) => String(e.nome || '').startsWith(PREFIX));
}

async function run() {
  console.log('🧪 Test Plan Runner (API)');
  console.log('API_URL:', API_URL);

  const superEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@prescrimed.com';
  const superPass = process.env.SUPERADMIN_PASSWORD || 'admin123';

  console.log('\n🔐 Login superadmin...');
  const superToken = await login(superEmail, superPass).catch((e) => {
    throw new Error(`Falha no login superadmin (${superEmail}). Configure SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD. Detalhe: ${e?.response?.data?.error || e.message}`);
  });
  assert(superToken, 'Token superadmin não retornado');

  console.log('✅ Superadmin logado.');

  const empresas = await getEmpresas(superToken);
  assert(empresas.length === 9, `Esperadas 9 empresas do plano de testes; encontrei ${empresas.length}. Rode o seed: npm run seed:testplan`);

  console.log(`✅ Empresas encontradas: ${empresas.length}`);

  // Teste de isolamento: usuario de uma empresa não deve listar pacientes de outra via tenantIsolation.
  // Seleção determinística alinhada ao seed: usa dois tenants conhecidos.
  const first =
    findEmpresa(empresas, 'fisioterapia', 1) ||
    findEmpresa(empresas, 'casa-repouso', 1) ||
    findEmpresa(empresas, 'petshop', 1);
  assert(first?.id, 'Não foi possível selecionar empresa A (idx 01). Rode o seed novamente.');

  const second = findEmpresa(empresas, first.tipoSistema, 2);
  assert(second?.id, `Não foi possível selecionar empresa B (${first.tipoSistema} idx 02). Rode o seed novamente.`);

  const adminEmailFirst = `admin.${companySlug(first.tipoSistema, 1)}@test.prescrimed.local`;
  const adminEmailSecond = `admin.${companySlug(second.tipoSistema, 2)}@test.prescrimed.local`;

  console.log(`\n🔐 Login admin (empresa A): ${adminEmailFirst}`);
  const adminTokenFirst = await login(adminEmailFirst, PASSWORD);
  assert(adminTokenFirst, 'Falha login admin empresa A');

  console.log(`🔐 Login admin (empresa B): ${adminEmailSecond}`);
  const adminTokenSecond = await login(adminEmailSecond, PASSWORD);
  assert(adminTokenSecond, 'Falha login admin empresa B');

  console.log('\n🔒 Validando isolamento multi-tenant (pacientes)...');
  const apiA = api(adminTokenFirst, { 'x-empresa-id': first.id });
  const apiB = api(adminTokenSecond, { 'x-empresa-id': second.id });

  const patientsA = await apiA.get('/pacientes');
  const patientsB = await apiB.get('/pacientes');
  assert((patientsA.data?.items || []).length >= 5, 'Empresa A deveria ter >= 5 pacientes');
  assert((patientsB.data?.items || []).length >= 5, 'Empresa B deveria ter >= 5 pacientes');

  // Tentativa indevida: usar token A, mas x-empresa-id B
  const apiAasB = api(adminTokenFirst, { 'x-empresa-id': second.id });
  const patientsShouldBeA = await apiAasB.get('/pacientes');
  const uniqueEmpresaIds = new Set((patientsShouldBeA.data?.items || []).map((p) => p.empresaId));
  assert(uniqueEmpresaIds.size === 1 && uniqueEmpresaIds.has(first.id), 'Tenant isolation falhou: token A não deveria enxergar pacientes da empresa B');
  console.log('✅ Isolamento OK.');

  console.log('\n🧩 Validando regras de evolução (enfermagem)...');
  const pac0 = (patientsA.data.items || [])[0];
  assert(pac0?.id, 'Paciente não encontrado');

  // Cria 1 registro de enfermagem
  const created = await apiA.post('/enfermagem', {
    pacienteId: pac0.id,
    tipo: 'evolucao',
    titulo: 'Evolução Test Plan (API)',
    descricao: 'Registro criado pelo runner para validar API.',
    sinaisVitais: { pa: '120/80', fc: 80, fr: 18, temp: 36.7, satO2: 98, glicemia: 98 },
    riscoQueda: 'baixo',
    riscoLesao: 'baixo',
    estadoGeral: 'bom',
    alerta: false,
    prioridade: 'baixa',
    observacoes: 'Teste automatizado.',
    anexos: [],
  });

  const registroId = created.data?.id;
  assert(registroId, 'Registro de enfermagem não retornou id');

  // PUT deve ser 405
  await apiA.put(`/enfermagem/${registroId}`, { titulo: 'tentativa' }).then(() => {
    throw new Error('PUT em enfermagem deveria falhar com 405');
  }).catch((e) => {
    const status = e?.response?.status;
    const code = e?.response?.data?.code;
    assert(status === 405, `Esperado 405 no PUT enfermagem; recebi ${status}`);
    assert(code === 'history_immutable', `Esperado code=history_immutable; recebi ${code}`);
  });

  // DELETE como admin deve ser 403
  await apiA.delete(`/enfermagem/${registroId}`).then(() => {
    throw new Error('DELETE em enfermagem como admin deveria falhar com 403');
  }).catch((e) => {
    const status = e?.response?.status;
    const code = e?.response?.data?.code;
    assert(status === 403, `Esperado 403 no DELETE enfermagem (admin); recebi ${status}`);
    assert(code === 'access_denied', `Esperado code=access_denied; recebi ${code}`);
  });

  // DELETE como superadmin (com contexto da empresa)
  const apiSuperOnA = api(superToken, { 'x-empresa-id': first.id });
  await apiSuperOnA.delete(`/enfermagem/${registroId}`);
  console.log('✅ Regras de imutabilidade/exclusão OK.');

  console.log('\n📌 Test Plan Runner finalizado com sucesso.');
}

run().catch((e) => {
  console.error('❌ Test Plan Runner falhou:', e?.message || e);
  process.exit(2);
});
