/**
 * Script de Teste Completo via API
 * Testa todas as funcionalidades do sistema fazendo chamadas diretas à API
 */

import 'dotenv/config';
import axios from 'axios';
import crypto from 'crypto';

const DEFAULT_API_URL = 'http://localhost:8000/api';

let API_URL = process.env.API_URL || DEFAULT_API_URL;
let SERVER_BASE_URL = API_URL.replace(/\/api\/?$/, '');

const recomputeServerBaseUrl = () => {
  SERVER_BASE_URL = API_URL.replace(/\/api\/?$/, '');
};

const buildAxiosErrorSummary = (error) => {
  if (!error) return 'erro desconhecido';
  const parts = [];

  if (error.code) parts.push(`code=${error.code}`);
  if (error.response?.status) parts.push(`status=${error.response.status}`);
  if (error.message) parts.push(error.message);

  const url = error.config?.url;
  if (url) parts.push(`url=${url}`);

  return parts.join(' | ') || 'erro sem detalhes';
};

async function pickWorkingApiUrl() {
  const envApiUrl = (process.env.API_URL || '').trim();
  const candidates = [
    envApiUrl,
    DEFAULT_API_URL,
    'http://localhost:8001/api'
  ].filter(Boolean);

  // Dedup preservando ordem
  const seen = new Set();
  const uniqueCandidates = candidates.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  for (const candidate of uniqueCandidates) {
    try {
      const response = await axios.get(`${candidate}/test`, {
        timeout: 3000,
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        return candidate;
      }
    } catch {
      // Ignora e tenta a próxima
    }
  }

  return envApiUrl || DEFAULT_API_URL;
}
let authTokens = {};
let testData = {
  usuarios: [],
  pacientes: [],
  prescricoes: [],
  agendamentos: [],
  registrosEnfermagem: [],
  sessoesFisio: [],
  itensEstoque: [],
  transacoesFinanceiras: [],
  catalogo: [],
  pedidos: [],
  notas: []
};

// Aguardar um tempo
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const normalizeCpf = (value) => String(value || '').replace(/\D/g, '');

// Função de login
async function login(email, senha) {
  try {
    console.log(`  Tentando login: ${email}...`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      senha
    });
    console.log(`  ✅ Login bem-sucedido!`);
    return response.data.token;
  } catch (error) {
    console.error(`❌ Erro no login de ${email}:`);
    console.error(`  Status: ${error.response?.status}`);
    console.error(`  Mensagem: ${error.response?.data?.message || error.message}`);
    console.error(`  Detalhes: ${buildAxiosErrorSummary(error)}`);
    console.error(`  Dados enviados:`, { email, senha });
    return null;
  }
}

async function apiGet(path, token, config = {}) {
  const baseHeaders = config.headers || undefined;
  const headers = token
    ? { ...(baseHeaders || {}), Authorization: `Bearer ${token}` }
    : baseHeaders;

  return axios.get(`${API_URL}${path}`, {
    ...config,
    headers
  });
}

async function buscarPacienteExistente(cpf, token) {
  const response = await apiGet('/pacientes?page=1&pageSize=200', token);
  const items = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data?.items)
      ? response.data.items
      : [];

  const targetCpf = normalizeCpf(cpf);
  return items.find((paciente) => normalizeCpf(paciente.cpf) === targetCpf) || null;
}

async function apiPost(path, data, token) {
  return axios.post(`${API_URL}${path}`, data, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

async function apiPostRaw(path, rawBody, headers = {}) {
  return axios.post(`${API_URL}${path}`, rawBody, {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

async function testarDiagnosticos() {
  console.log('\n🩺 === DIAGNÓSTICOS BÁSICOS ===');
  try {
    const t = await apiGet('/test');
    console.log('✅ /api/test:', t.data?.message || 'ok');
  } catch (e) {
    console.error('❌ /api/test falhou:', e.response?.data?.error || buildAxiosErrorSummary(e));
  }

  for (const path of ['/diagnostic/env-check', '/diagnostic/db-ping', '/diagnostic/db-check']) {
    try {
      const r = await apiGet(path);
      console.log(`✅ ${path}:`, r.data?.ok === false ? 'ok=false' : 'ok');
    } catch (e) {
      console.error(`❌ ${path} falhou:`, e.response?.data?.error || buildAxiosErrorSummary(e));
    }
  }
}

// Criar usuários
async function criarUsuarios() {
  console.log('\n👥 === TESTANDO CRIAÇÃO DE USUÁRIOS ===');
  
  const usuarios = [
    {
      nome: 'Dr. João Silva',
      email: 'joao.silva@test.com',
      senha: 'teste123',
      contato: '(11) 98765-4321',
      role: 'nutricionista',
      especialidade: 'Clínico Geral'
    },
    {
      nome: 'Enf. Ana Costa',
      email: 'ana.costa@test.com',
      senha: 'teste123',
      contato: '(11) 98765-4322',
      role: 'enfermeiro',
      especialidade: 'Enfermeira Chefe'
    },
    {
      nome: 'Ft. Julia Oliveira',
      email: 'julia.oliveira@test.com',
      senha: 'teste123',
      contato: '(11) 98765-4323',
      role: 'fisioterapeuta',
      especialidade: 'Fisioterapia Motora'
    }
  ];

  // Primeiro vamos fazer login com admin (que já existe)
  console.log('\n🔐 Fazendo login como admin...');
  const adminToken = await login('admin@prescrimed.com', 'admin123');
  
  if (!adminToken) {
    console.log('❌ Falha no login do admin. Certifique-se de que o servidor está rodando.');
    return false;
  }

  console.log('✅ Login admin bem-sucedido!');
  authTokens.admin = adminToken;

  // Criar os usuários de teste
  for (const userData of usuarios) {
    try {
      const response = await apiPost('/usuarios', userData, adminToken);
      
      testData.usuarios.push(response.data);
      console.log(`✅ Usuário criado: ${userData.nome} (${userData.role})`);
      
      // Fazer login com cada usuário criado
      const token = await login(userData.email, userData.senha);
      if (token) {
        authTokens[userData.email] = token;
        console.log(`  🔐 Token obtido para ${userData.nome}`);
      }
      
      await sleep(500);
    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 400) {
        const token = await login(userData.email, userData.senha);
        if (token) {
          authTokens[userData.email] = token;
          testData.usuarios.push({
            nome: userData.nome,
            email: userData.email,
            role: userData.role
          });
          console.log(`ℹ️ Usuário já existia e foi reaproveitado: ${userData.nome} (${userData.role})`);
          await sleep(500);
          continue;
        }
      }

      console.error(`❌ Erro ao criar ${userData.nome}:`, error.response?.data?.message || error.message);
    }
  }

  return true;
}

// Criar pacientes
async function criarPacientes() {
  console.log('\n📋 === TESTANDO CRIAÇÃO DE PACIENTES ===');
  
  const pacientes = [
    {
      nome: 'José Ferreira',
      dataNascimento: '1945-03-15',
      cpf: '529.982.247-25',
      telefone: '(11) 3456-7890',
      email: 'jose.ferreira@email.com'
    },
    {
      nome: 'Maria Aparecida Silva',
      dataNascimento: '1952-07-20',
      cpf: '111.444.777-35',
      telefone: '(11) 3456-7891',
      email: 'maria.aparecida@email.com'
    },
    {
      nome: 'Antonio Carlos Oliveira',
      dataNascimento: '1958-11-10',
      cpf: '935.411.347-80',
      telefone: '(11) 3456-7892',
      email: 'antonio.carlos@email.com'
    }
  ];

  for (const pacienteData of pacientes) {
    try {
      const response = await apiPost('/pacientes', pacienteData, authTokens.admin);
      
      testData.pacientes.push(response.data);
      console.log(`✅ Paciente criado: ${pacienteData.nome}`);
      await sleep(500);
    } catch (error) {
      if (error.response?.status === 409) {
        try {
          const existente = await buscarPacienteExistente(pacienteData.cpf, authTokens.admin);
          if (existente) {
            testData.pacientes.push(existente);
            console.log(`ℹ️ Paciente já existia e foi reaproveitado: ${pacienteData.nome}`);
            await sleep(500);
            continue;
          }
        } catch (lookupError) {
          console.error(`❌ Erro ao reaproveitar paciente ${pacienteData.nome}:`, lookupError.response?.data?.error || lookupError.message);
        }
      }

      console.error(`❌ Erro ao criar paciente ${pacienteData.nome}:`, error.response?.data?.error || error.response?.data?.message || error.message);
    }
  }
}

// Criar prescrições
async function criarPrescricoes() {
  console.log('\n💊 === TESTANDO CRIAÇÃO DE PRESCRIÇÕES ===');
  
  if (testData.pacientes.length === 0) {
    console.log('⚠️  Nenhum paciente disponível para criar prescrições');
    return;
  }

  const nutricionista = testData.usuarios.find(u => u.role === 'nutricionista');
  if (!nutricionista) {
    console.log('⚠️  Nenhum nutricionista disponível');
    return;
  }

  for (let i = 0; i < Math.min(3, testData.pacientes.length); i++) {
    const paciente = testData.pacientes[i];
    
    try {
      const response = await apiPost('/prescricoes', {
        pacienteId: paciente.id,
        tipo: 'nutricional',
        descricao: `Prescrição nutricional para ${paciente.nome}`,
        observacoes: 'Acompanhamento nutricional semanal',
        status: 'ativa'
      }, authTokens[nutricionista.email]);
      
      testData.prescricoes.push(response.data);
      console.log(`✅ Prescrição criada para: ${paciente.nome}`);
      await sleep(500);
    } catch (error) {
      console.error(`❌ Erro ao criar prescrição:`, error.response?.data?.message || error.message);
    }
  }
}

// Criar agendamentos
async function criarAgendamentos() {
  console.log('\n📅 === TESTANDO CRIAÇÃO DE AGENDAMENTOS ===');
  
  if (testData.pacientes.length === 0) {
    console.log('⚠️  Nenhum paciente disponível para criar agendamentos');
    return;
  }

  const responsavel = testData.usuarios.find(u => u.role === 'atendente') || testData.usuarios[0];

  for (let i = 0; i < Math.min(3, testData.pacientes.length); i++) {
    const paciente = testData.pacientes[i];
    const dataHora = new Date();
    dataHora.setDate(dataHora.getDate() + i + 1); // Agendar para os próximos dias
    
    try {
      const response = await apiPost('/agendamentos', {
        pacienteId: paciente.id,
        usuarioId: responsavel?.id,
        titulo: `Consulta de rotina - ${paciente.nome}`,
        descricao: 'Agendamento criado via teste automatizado',
        dataHora: dataHora.toISOString(),
        tipo: 'Consulta',
        status: 'agendado',
        observacoes: `Consulta de rotina para ${paciente.nome}`,
        duracao: 60,
        local: 'Unidade SP'
      }, authTokens.admin);
      
      testData.agendamentos.push(response.data);
      console.log(`✅ Agendamento criado para: ${paciente.nome} - ${dataHora.toLocaleDateString()}`);
      await sleep(500);
    } catch (error) {
      console.error(`❌ Erro ao criar agendamento:`, error.response?.data?.message || error.message);
    }
  }
}

// Criar registros de enfermagem
async function criarRegistrosEnfermagem() {
  console.log('\n🏥 === TESTANDO REGISTROS DE ENFERMAGEM ===');
  
  if (testData.pacientes.length === 0) {
    console.log('⚠️  Nenhum paciente disponível para criar registros');
    return;
  }

  const enfermeiro = testData.usuarios.find(u => u.role === 'enfermeiro');
  if (!enfermeiro) {
    console.log('⚠️  Nenhum enfermeiro disponível');
    return;
  }

  for (let i = 0; i < Math.min(3, testData.pacientes.length); i++) {
    const paciente = testData.pacientes[i];
    
    try {
      const response = await apiPost('/enfermagem', {
        pacienteId: paciente.id,
        tipo: 'sinais_vitais',
        titulo: 'Sinais vitais aferidos',
        descricao: `Paciente ${paciente.nome} estável, sinais vitais normais`,
        sinaisVitais: {
          PA: '130/85',
          FC: 72,
          FR: 16,
          Temp: 36.5,
          SatO2: 98,
          Glicemia: 98
        },
        prioridade: 'baixa',
        alerta: false
      }, authTokens[enfermeiro.email]);
      
      testData.registrosEnfermagem.push(response.data);
      console.log(`✅ Registro de enfermagem criado para: ${paciente.nome}`);
      await sleep(500);
    } catch (error) {
      console.error(`❌ Erro ao criar registro:`, error.response?.data?.message || error.message);
    }
  }
}

// Criar sessões de fisioterapia
async function criarSessoesFisio() {
  console.log('\n🏃 === TESTANDO SESSÕES DE FISIOTERAPIA ===');
  
  if (testData.pacientes.length === 0) {
    console.log('⚠️  Nenhum paciente disponível para criar sessões');
    return;
  }

  const fisioterapeuta = testData.usuarios.find(u => u.role === 'fisioterapeuta');
  if (!fisioterapeuta) {
    console.log('⚠️  Nenhum fisioterapeuta disponível');
    return;
  }

  for (let i = 0; i < Math.min(3, testData.pacientes.length); i++) {
    const paciente = testData.pacientes[i];
    
    try {
      const dataHora = new Date();
      dataHora.setDate(dataHora.getDate() + i + 1);

      const response = await apiPost('/fisioterapia/sessoes', {
        pacienteId: paciente.id,
        protocolo: 'Alongamento e mobilidade',
        dataHora: dataHora.toISOString(),
        duracao: 60,
        observacoes: 'Paciente colaborativo, boa evolução'
      }, authTokens[fisioterapeuta.email]);
      
      testData.sessoesFisio.push(response.data);
      console.log(`✅ Sessão de fisioterapia criada para: ${paciente.nome}`);
      await sleep(500);
    } catch (error) {
      console.error(`❌ Erro ao criar sessão:`, error.response?.data?.message || error.message);
    }
  }
}

async function testarModulosExtras() {
  console.log('\n🧩 === SMOKE TEST DE MÓDULOS EXTRAS ===');

  // Empresa do usuário
  try {
    const r = await apiGet('/empresas/me', authTokens.admin);
    console.log('✅ /empresas/me:', r.data?.nome || 'ok');
  } catch (e) {
    console.error('❌ /empresas/me falhou:', e.response?.data?.error || e.message);
  }

  // Casa de repouso: leitos
  try {
    const created = await apiPost('/casa-repouso/leitos', { numero: 'L-99', status: 'disponivel' }, authTokens.admin);
    console.log('✅ Leito criado:', created.data?.numero || 'ok');
    const list = await apiGet('/casa-repouso/leitos', authTokens.admin);
    console.log('✅ Leitos listados:', Array.isArray(list.data) ? list.data.length : 'ok');
  } catch (e) {
    console.error('❌ Casa-repouso/leitos falhou:', e.response?.data?.error || e.message);
  }

  // Petshop
  try {
    const created = await apiPost('/petshop/pets', { nome: 'Thor', especie: 'Cão', raca: 'Labrador', tutorNome: 'Marcos' }, authTokens.admin);
    console.log('✅ Pet criado:', created.data?.nome || 'ok');
    const list = await apiGet('/petshop/pets', authTokens.admin);
    console.log('✅ Pets listados:', Array.isArray(list.data) ? list.data.length : 'ok');
  } catch (e) {
    console.error('❌ Petshop/pets falhou:', e.response?.data?.error || e.message);
  }

  // Estoque
  try {
    const med = await apiPost(
      '/estoque/medicamentos',
      { nome: 'Paracetamol 750mg', quantidade: 10, unidade: 'cx', categoria: 'analgésico', quantidadeMinima: 2 },
      authTokens.admin
    );
    console.log('✅ Medicamento criado:', med.data?.nome || 'ok');
    const medId = med.data?._id || med.data?.id;
    if (medId) {
      const mov = await apiPost(
        '/estoque/medicamentos/movimentacao',
        { medicamentoId: medId, tipo: 'entrada', quantidade: 5, motivo: 'Reposição', observacao: 'Teste automatizado' },
        authTokens.admin
      );
      console.log('✅ Movimentação registrada:', mov.data?._id ? 'ok' : 'ok');
    }
    const meds = await apiGet('/estoque/medicamentos', authTokens.admin);
    console.log('✅ Medicamentos listados:', Array.isArray(meds.data) ? meds.data.length : 'ok');
    const movs = await apiGet('/estoque/movimentacoes?tipo=medicamento', authTokens.admin);
    console.log('✅ Movimentações listadas:', Array.isArray(movs.data?.movimentacoes) ? movs.data.movimentacoes.length : 'ok');
  } catch (e) {
    console.error('❌ Estoque falhou:', e.response?.data?.error || e.message);
  }

  // Financeiro
  try {
    const pacienteId = testData.pacientes?.[0]?.id;
    const tx = await apiPost(
      '/financeiro',
      {
        tipo: 'receita',
        categoria: 'mensalidade',
        descricao: 'Mensalidade (teste)',
        valor: 100,
        status: 'pendente',
        dataVencimento: new Date().toISOString(),
        pacienteId
      },
      authTokens.admin
    );
    console.log('✅ Transação criada:', tx.data?._id ? 'ok' : 'ok');
    const list = await apiGet('/financeiro', authTokens.admin);
    console.log('✅ Transações listadas:', Array.isArray(list.data) ? list.data.length : 'ok');
    const stats = await apiGet('/financeiro/stats', authTokens.admin);
    console.log('✅ Financeiro stats:', typeof stats.data === 'object' ? 'ok' : 'ok');
  } catch (e) {
    console.error('❌ Financeiro falhou:', e.response?.data?.error || e.message);
  }

  // Comercial/Fiscal
  try {
    const item = await apiPost(
      '/comercial/catalogo',
      {
        tipo: 'servico',
        nome: 'Sessão expressa de fisioterapia',
        categoria: 'fisioterapia',
        preco: 180,
        unidade: 'sessão'
      },
      authTokens.admin
    );
    const itemId = item.data?.id;
    testData.catalogo.push(item.data);
    console.log('✅ Item comercial criado:', item.data?.nome || 'ok');

    const pedido = await apiPost(
      '/comercial/pedidos',
      {
        clienteNome: 'Cliente Teste Comercial',
        origem: 'online',
        items: [{ catalogoItemId: itemId, quantidade: 1 }]
      },
      authTokens.admin
    );
    testData.pedidos.push(pedido.data);
    console.log('✅ Pedido comercial criado:', pedido.data?.id ? 'ok' : 'ok');

    const checkout = await apiPost(
      `/comercial/pedidos/${pedido.data?.id}/pagamentos`,
      {
        metodo: 'pix',
        valor: 180,
        gateway: 'externo',
        iniciarCheckout: true,
        clienteNome: 'Cliente Teste Comercial'
      },
      authTokens.admin
    );
    console.log('✅ Checkout comercial preparado:', checkout.data?.checkout ? 'ok' : 'ok');

    let nota = null;
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || '';
    const webhookStrict = process.env.PAYMENT_WEBHOOK_STRICT !== 'false';
    const externalId = checkout.data?.checkout?.externalId;

    if (webhookSecret && externalId) {
      const webhookPayload = JSON.stringify({
        type: 'payment.approved',
        provider: checkout.data?.checkout?.provider || 'simulacao-interna',
        data: {
          id: externalId,
          status: 'approved',
          amount: 180,
          paymentMethod: 'pix',
          metadata: {
            pedidoId: pedido.data?.id,
            empresaId: pedido.data?.empresaId
          }
        }
      });
      const signature = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');
      try {
        const webhook = await apiPostRaw('/public/webhooks/payment', webhookPayload, {
          'X-Webhook-Signature': signature
        });
        console.log('✅ Webhook de pagamento processado:', webhook.data?.acknowledged ? 'ok' : 'ok');
      } catch (error) {
        const details = error?.response?.data?.details;
        console.error('❌ Webhook de pagamento falhou:', error?.response?.data?.error || error.message);
        if (details) {
          console.error('   details:', details);
        } else {
          console.error('   Detalhes:', buildAxiosErrorSummary(error));
        }
        throw error;
      }
    } else if (webhookStrict) {
      console.log('⚠️  Webhook assinado não testado: PAYMENT_WEBHOOK_SECRET não configurado no ambiente local.');
    }

    const pedidoAtualizado = await apiGet(`/comercial/pedidos`, authTokens.admin);
    const pedidoComercial = Array.isArray(pedidoAtualizado.data)
      ? pedidoAtualizado.data.find((entry) => entry.id === pedido.data?.id)
      : null;

    if (pedidoComercial?.notasFiscais?.length > 0) {
      nota = { data: pedidoComercial.notasFiscais[0] };
      console.log('✅ Nota fiscal automática detectada:', nota.data?.numero || 'ok');
    } else {
      nota = await apiPost(`/comercial/pedidos/${pedido.data?.id}/nota-fiscal`, {}, authTokens.admin);
      console.log('✅ Nota fiscal registrada manualmente:', nota.data?.numero || 'ok');
    }

    if (nota?.data) {
      testData.notas.push(nota.data);
    }

    const overview = await apiGet('/comercial/overview', authTokens.admin);
    console.log('✅ Overview comercial:', overview.data?.metrics ? 'ok' : 'ok');

    const notas = await apiGet('/comercial/notas', authTokens.admin);
    console.log('✅ Notas listadas:', Array.isArray(notas.data) ? notas.data.length : 'ok');
  } catch (e) {
    console.error('❌ Comercial/fiscal falhou:', e.response?.data?.error || e.message);
  }
}

async function testarCronogramaECensoMP() {
  console.log('\n🗓️ === CRONOGRAMA + CENSO M.P. (SMOKE) ===');

  // Cronograma: agendamentos filtrados por janela de datas + status
  try {
    const now = new Date();
    const dataInicio = new Date(now);
    dataInicio.setDate(dataInicio.getDate() - 1);

    const dataFim = new Date(now);
    dataFim.setDate(dataFim.getDate() + 31);

    const list = await apiGet('/agendamentos', authTokens.admin, {
      params: {
        page: 1,
        pageSize: 50,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
      }
    });
    const items = Array.isArray(list.data?.items) ? list.data.items : (Array.isArray(list.data) ? list.data : []);
    const createdIds = testData.agendamentos.map((a) => a?.id).filter(Boolean);
    const hits = createdIds.length
      ? items.filter((a) => createdIds.includes(a?.id)).length
      : 0;
    console.log(`✅ Cronograma: agendamentos (janela datas) = ${items.length} | encontrados dos criados = ${hits}`);

    const listAgendado = await apiGet('/agendamentos', authTokens.admin, {
      params: { page: 1, pageSize: 20, status: 'agendado' }
    });
    const itemsAgendado = Array.isArray(listAgendado.data?.items) ? listAgendado.data.items : [];
    console.log(`✅ Cronograma: filtro status=agendado → ${itemsAgendado.length} itens`);
  } catch (e) {
    console.error('❌ Cronograma falhou:', e.response?.data?.error || buildAxiosErrorSummary(e));
  }

  // Censo M.P.: correlaciona pacientes e prescrições ativas
  try {
    const [pacientesRes, prescricoesRes] = await Promise.all([
      apiGet('/pacientes', authTokens.admin, { params: { page: 1, pageSize: 200 } }),
      apiGet('/prescricoes', authTokens.admin, { params: { page: 1, pageSize: 200 } }),
    ]);

    const pacientes = Array.isArray(pacientesRes.data)
      ? pacientesRes.data
      : (Array.isArray(pacientesRes.data?.items) ? pacientesRes.data.items : []);

    const prescricoes = Array.isArray(prescricoesRes.data)
      ? prescricoesRes.data
      : (Array.isArray(prescricoesRes.data?.items) ? prescricoesRes.data.items : []);

    const ativas = prescricoes.filter((p) => String(p?.status || '').toLowerCase() === 'ativa');
    const pacientesComAtiva = new Set(ativas.map((p) => p?.pacienteId).filter(Boolean));
    const createdPrescIds = testData.prescricoes.map((p) => p?.id).filter(Boolean);
    const createdHits = createdPrescIds.length
      ? prescricoes.filter((p) => createdPrescIds.includes(p?.id)).length
      : 0;

    console.log(`✅ Censo M.P.: pacientes=${pacientes.length} | prescrições=${prescricoes.length} | ativas=${ativas.length}`);
    console.log(`✅ Censo M.P.: pacientes com prescrição ativa=${pacientesComAtiva.size} | prescrições criadas encontradas=${createdHits}`);
  } catch (e) {
    console.error('❌ Censo M.P. falhou:', e.response?.data?.error || buildAxiosErrorSummary(e));
  }
}

// Relatório final
async function gerarRelatorio() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 RELATÓRIO FINAL DE TESTES');
  console.log('='.repeat(70));
  console.log(`✅ Usuários criados: ${testData.usuarios.length}`);
  console.log(`✅ Pacientes criados: ${testData.pacientes.length}`);
  console.log(`✅ Prescrições criadas: ${testData.prescricoes.length}`);
  console.log(`✅ Agendamentos criados: ${testData.agendamentos.length}`);
  console.log(`✅ Registros de enfermagem: ${testData.registrosEnfermagem.length}`);
  console.log(`✅ Sessões de fisioterapia: ${testData.sessoesFisio.length}`);
  console.log(`✅ Itens comerciais: ${testData.catalogo.length}`);
  console.log(`✅ Pedidos comerciais: ${testData.pedidos.length}`);
  console.log(`✅ Notas fiscais: ${testData.notas.length}`);
  console.log('='.repeat(70));
  
  console.log('\n📝 CREDENCIAIS DE ACESSO:');
  console.log('-'.repeat(70));
  console.log('Todos os usuários de teste usam a senha: teste123');
  console.log('-'.repeat(70));
  
  testData.usuarios.forEach(usuario => {
    console.log(`  - ${usuario.email} (${usuario.role})`);
  });
  
  console.log('-'.repeat(70));
  console.log('\n✅ Dados gerados no PostgreSQL e prontos para uso!');
  console.log(`🚀 Servidor rodando em: ${SERVER_BASE_URL}`);
  console.log('🌐 Frontend acessível em: http://localhost:5173');
}

// Executar todos os testes
async function executarTestes() {
  try {
    const selectedApiUrl = await pickWorkingApiUrl();
    if (selectedApiUrl && selectedApiUrl !== API_URL) {
      console.log(`ℹ️ API_URL ajustada automaticamente: ${API_URL} -> ${selectedApiUrl}`);
      API_URL = selectedApiUrl;
      recomputeServerBaseUrl();
    }

    console.log('🚀 Iniciando testes completos do sistema...\n');
    console.log(`⚠️  CERTIFIQUE-SE DE QUE O SERVIDOR ESTÁ RODANDO EM ${SERVER_BASE_URL}\n`);
    
    await sleep(2000);

    await testarDiagnosticos();
    await sleep(500);
    
    // Criar usuários
    const usuariosCriados = await criarUsuarios();
    if (!usuariosCriados) {
      console.log('\n❌ Testes interrompidos - falha ao criar usuários');
      process.exit(1);
    }
    
    await sleep(1000);
    
    // Criar pacientes
    await criarPacientes();
    await sleep(1000);
    
    // Criar prescrições
    await criarPrescricoes();
    await sleep(1000);
    
    // Criar agendamentos
    await criarAgendamentos();
    await sleep(1000);
    
    // Criar registros de enfermagem
    await criarRegistrosEnfermagem();
    await sleep(1000);
    
    // Criar sessões de fisioterapia
    await criarSessoesFisio();
    await sleep(1000);

    // Smoke-test módulos extras
    await testarModulosExtras();
    await sleep(500);

    // Cronograma + Censo M.P.
    await testarCronogramaECensoMP();
    await sleep(500);
    
    // Gerar relatório
    await gerarRelatorio();
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro fatal durante testes:', error.message);
    process.exit(1);
  }
}

executarTestes();
