#!/usr/bin/env node

const apiUrl = (process.env.API_URL || 'http://127.0.0.1:3000/api').replace(/\/$/, '');
const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@validacao.local';
const password = process.env.SEED_SUPERADMIN_PASSWORD || 'Teste@2026';
const results = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
};

const requireStatus = async (name, path, expectedStatus, options) => {
  const { response, body } = await request(path, options);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const passed = response.status === expectedStatus && isJson;
  const detail = response.status !== expectedStatus
    ? `HTTP ${response.status}: ${body?.error || JSON.stringify(body)}`
    : (isJson ? '' : `Resposta nao JSON: ${contentType || 'content-type ausente'}`);
  record(name, passed, detail);
  return { response, body, passed };
};

async function runSmokeValidation() {
  const healthUrl = apiUrl.replace(/\/api$/, '/health');
  const health = await fetch(healthUrl);
  record('health', health.ok, `HTTP ${health.status}`);

  await requireStatus('rejeita lista sem token', '/pacientes', 401);

  const login = await requireStatus('login superadmin', '/auth/login', 200, {
    method: 'POST',
    body: JSON.stringify({ email: superadminEmail, senha: password }),
  });
  const token = login.body?.token;
  if (!token) {
    record('token de autenticacao', false, 'Login nao retornou token.');
    return finish();
  }

  const authorization = { Authorization: `Bearer ${token}` };
  const me = await requireStatus('perfil autenticado', '/auth/me', 200, { headers: authorization });
  record('perfil superadmin', me.body?.role === 'superadmin', `role: ${me.body?.role || 'ausente'}`);

  const resources = [
    'empresas', 'usuarios', 'pacientes', 'prescricoes', 'agendamentos',
    'registro-enfermagem', 'sessoes-fisio', 'casa-repouso-leitos', 'pets',
    'estoque-itens', 'estoque-movimentacoes', 'financeiro-transacoes',
    'catalogo-items', 'pedidos', 'pedido-items', 'pagamentos', 'nota-fiscal',
    'nota-fiscal-logs', 'empresa-sequencias',
  ];

  for (const resource of resources) {
    const result = await requireStatus(`lista ${resource}`, `/${resource}`, 200, { headers: authorization });
    record(`${resource} retorna lista`, Array.isArray(result.body), `tipo: ${Array.isArray(result.body) ? 'array' : typeof result.body}`);
  }

  const companies = await request('/empresas', { headers: authorization });
  const companyId = companies.body?.[0]?.id;
  if (!companyId) {
    record('empresa para CRUD descartavel', false, 'Nenhuma empresa encontrada.');
  } else {
    const created = await requireStatus('cria pet descartavel', '/pets', 201, {
      method: 'POST',
      headers: authorization,
      body: JSON.stringify({
        empresaId: companyId,
        nome: `SMOKE-${Date.now()}`,
        especie: 'teste',
        raca: 'na',
        tutorNome: 'Smoke Test',
        observacoes: 'Registro temporario criado pelo smoke test.',
      }),
    });
    const petId = created.body?.id;
    if (petId) {
      await requireStatus('atualiza pet descartavel', `/pets/${petId}`, 200, {
        method: 'PUT',
        headers: authorization,
        body: JSON.stringify({ observacoes: 'Registro temporario atualizado pelo smoke test.' }),
      });
      await requireStatus('remove pet descartavel', `/pets/${petId}`, 200, {
        method: 'DELETE',
        headers: authorization,
      });
    }
  }

  const pageEndpoints = [
    '/dashboard/stats',
    '/dashboard/prescricoes-recentes',
    '/dashboard/pacientes-recentes',
    '/dashboard/next-steps',
    '/dashboard/alerts',
    '/comercial/overview',
    '/comercial/catalogo',
    '/comercial/pedidos',
    '/comercial/notas',
  ];
  for (const endpoint of pageEndpoints) {
    await requireStatus(`rota de tela ${endpoint}`, endpoint, 200, { headers: authorization });
  }

  const attendantLogin = await requireStatus('login atendente', '/auth/login', 200, {
    method: 'POST',
    body: JSON.stringify({ email: 'atendente@validacao.local', senha: password }),
  });
  const attendantAuthorization = { Authorization: `Bearer ${attendantLogin.body?.token}` };
  await requireStatus('atendente acessa pacientes', '/pacientes', 200, { headers: attendantAuthorization });
  await requireStatus('atendente bloqueado em usuarios', '/usuarios', 403, { headers: attendantAuthorization });
  await requireStatus('atendente bloqueado em financeiro', '/financeiro-transacoes', 403, { headers: attendantAuthorization });

  const catalog = await request('/comercial/catalogo?ativo=true', { headers: authorization });
  const catalogItem = catalog.body?.[0];
  if (!catalogItem?.id) {
    record('item para fluxo comercial', false, 'Catalogo ativo vazio.');
  } else {
    const order = await requireStatus('cria pedido comercial', '/comercial/pedidos', 201, {
      method: 'POST',
      headers: authorization,
      body: JSON.stringify({
        clienteNome: 'SMOKE Cliente',
        origem: 'balcao',
        observacoes: 'Pedido temporario do smoke test.',
        items: [{ catalogoItemId: catalogItem.id, quantidade: 1 }],
      }),
    });
    const orderId = order.body?.id;
    if (orderId) {
      await requireStatus('atualiza status do pedido', `/comercial/pedidos/${orderId}/status`, 200, {
        method: 'PUT',
        headers: authorization,
        body: JSON.stringify({ status: 'confirmado' }),
      });
      await requireStatus('registra pagamento do pedido', `/comercial/pedidos/${orderId}/pagamentos`, 201, {
        method: 'POST',
        headers: authorization,
        body: JSON.stringify({ metodo: 'pix', status: 'aprovado', gateway: 'manual' }),
      });
      await requireStatus('emite nota fiscal simulada', `/comercial/pedidos/${orderId}/nota-fiscal`, 201, {
        method: 'POST',
        headers: authorization,
        body: JSON.stringify({}),
      });
    }
  }

  finish();
}

function finish() {
  const failures = results.filter((result) => !result.passed);
  console.log(`\nResumo: ${results.length - failures.length}/${results.length} verificacoes aprovadas.`);
  if (failures.length) {
    console.error(`Falhas: ${failures.map((failure) => failure.name).join(', ')}`);
    process.exitCode = 1;
  }
}

runSmokeValidation().catch((error) => {
  console.error(`Smoke test falhou inesperadamente: ${error.message}`);
  process.exitCode = 1;
});