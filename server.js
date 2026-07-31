import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { createAuthToken, readAuthToken } from './lib/auth-token.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  sequelize,
  Empresa,
  Usuario,
  Paciente,
  Prescricao,
  Agendamento,
  RegistroEnfermagem,
  SessaoFisio,
  CasaRepousoLeito,
  Pet,
  EstoqueItem,
  EstoqueMovimentacao,
  FinanceiroTransacao,
  CatalogoItem,
  Pedido,
  PedidoItem,
  Pagamento,
  NotaFiscal,
  NotaFiscalLog,
  EmpresaSequencia,
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const distDir = path.resolve(__dirname, 'dist');
const app = express();
const authTokenSecret = process.env.AUTH_TOKEN_SECRET || 'local-development-secret';
const configuredAuthTokenLifetime = Number.parseInt(process.env.AUTH_TOKEN_TTL_SECONDS || '', 10);
const authTokenLifetime = Number.isFinite(configuredAuthTokenLifetime) && configuredAuthTokenLifetime > 0
  ? configuredAuthTokenLifetime
  : 28800;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && !process.env.AUTH_TOKEN_SECRET) {
  throw new Error('AUTH_TOKEN_SECRET e obrigatoria em producao.');
}

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('CORS_ALLOWED_ORIGINS e obrigatoria em producao.');
}

app.use(cors({
  origin(origin, callback) {
    const allowAllDevelopmentOrigins = process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0;
    if (!origin || allowAllDevelopmentOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origem nao permitida pelo CORS.'));
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const respondError = (res, status, message, details) => {
  res.status(status).json({ error: message, details });
};

const normalizePassword = (password) => {
  if (!password) return '';
  if (typeof password !== 'string') return String(password);
  return password;
};

const comparePassword = (password, storedPassword) => {
  const candidate = normalizePassword(password);
  if (!storedPassword) return false;
  if (typeof storedPassword === 'string' && storedPassword.startsWith('$2')) {
    return bcrypt.compareSync(candidate, storedPassword);
  }
  return candidate === storedPassword;
};

const toUserProfile = (user) => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  role: user.role,
  empresaId: user.empresaId,
  permissoes: user.permissoes || [],
});

const requireAuth = async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = readAuthToken({ token, secret: authTokenSecret });

  if (!payload) {
    return respondError(res, 401, 'Sessao invalida ou expirada', null);
  }

  try {
    const user = await Usuario.findByPk(payload.sub);
    if (!user || !user.ativo) {
      return respondError(res, 401, 'Usuario nao encontrado ou inativo', null);
    }

    req.user = user;
    return next();
  } catch (error) {
    return respondError(res, 500, 'Erro ao validar sessao', error.message);
  }
};

const requirePermission = (permission) => (req, res, next) => {
  if (!permission || ['admin', 'superadmin'].includes(req.user.role)) return next();
  const permissions = Array.isArray(req.user.permissoes) ? req.user.permissoes : [];
  if (permissions.includes(permission)) return next();
  return respondError(res, 403, 'Usuario sem permissao para este modulo', null);
};

const requireRole = (roles) => (req, res, next) => {
  if (roles.includes(req.user.role)) return next();
  return respondError(res, 403, 'Apenas administradores podem acessar este modulo', null);
};

const getModelScope = (model, req) => {
  if (model.rawAttributes.empresaId) return getEmpresaScope(req);
  if (model === Empresa && req.user.role !== 'superadmin') return { id: req.user.empresaId };
  return {};
};

const registerCrudRoutes = (resourcePath, model, permission, allowedRoles) => {
  const roleGuard = allowedRoles ? requireRole(allowedRoles) : (_req, _res, next) => next();

  app.get(`/api/${resourcePath}`, requireAuth, roleGuard, requirePermission(permission), async (req, res) => {
    try {
      const rows = await model.findAll({ where: getModelScope(model, req), order: [['createdAt', 'DESC']] });
      res.json(rows);
    } catch (error) {
      respondError(res, 500, 'Erro ao listar registros', error.message);
    }
  });

  app.get(`/api/${resourcePath}/:id`, requireAuth, roleGuard, requirePermission(permission), async (req, res) => {
    try {
      const row = await model.findOne({ where: { id: req.params.id, ...getModelScope(model, req) } });
      if (!row) return respondError(res, 404, 'Registro não encontrado', null);
      res.json(row);
    } catch (error) {
      respondError(res, 500, 'Erro ao buscar registro', error.message);
    }
  });

  app.post(`/api/${resourcePath}`, requireAuth, roleGuard, requirePermission(permission), async (req, res) => {
    try {
      const tenantValues = model.rawAttributes.empresaId && req.user.role !== 'superadmin'
        ? { empresaId: req.user.empresaId }
        : {};
      const row = await model.create({ ...req.body, ...tenantValues });
      res.status(201).json(row);
    } catch (error) {
      respondError(res, 500, 'Erro ao criar registro', error.message);
    }
  });

  app.put(`/api/${resourcePath}/:id`, requireAuth, roleGuard, requirePermission(permission), async (req, res) => {
    try {
      const row = await model.findOne({ where: { id: req.params.id, ...getModelScope(model, req) } });
      if (!row) return respondError(res, 404, 'Registro não encontrado', null);
      const tenantValues = model.rawAttributes.empresaId && req.user.role !== 'superadmin'
        ? { empresaId: req.user.empresaId }
        : {};
      await row.update({ ...req.body, ...tenantValues });
      res.json(row);
    } catch (error) {
      respondError(res, 500, 'Erro ao atualizar registro', error.message);
    }
  });

  app.delete(`/api/${resourcePath}/:id`, requireAuth, roleGuard, requirePermission(permission), async (req, res) => {
    try {
      const row = await model.findOne({ where: { id: req.params.id, ...getModelScope(model, req) } });
      if (!row) return respondError(res, 404, 'Registro não encontrado', null);
      await row.destroy();
      res.json({ success: true });
    } catch (error) {
      respondError(res, 500, 'Erro ao excluir registro', error.message);
    }
  });
};

const getEmpresaScope = (req) => {
  const requestedEmpresaId = req.query.empresaId || req.body?.empresaId;
  if (req.user.role === 'superadmin') return requestedEmpresaId ? { empresaId: requestedEmpresaId } : {};
  return req.user.empresaId ? { empresaId: req.user.empresaId } : {};
};

const sumValues = (rows) => rows.reduce((total, row) => total + Number(row.valor || row.total || 0), 0);

app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const scope = getEmpresaScope(req);
    const canViewFinancialData = ['admin', 'superadmin'].includes(req.user.role);
    const [totalPacientes, totalPrescricoes, totalUsuarios, leitos, estoque, financeiro, agendamentos] = await Promise.all([
      Paciente.count({ where: scope }),
      Prescricao.count({ where: scope }),
      Usuario.count({ where: req.user.role === 'superadmin' ? {} : { empresaId: req.user.empresaId, ativo: true } }),
      CasaRepousoLeito.findAll({ where: scope }),
      EstoqueItem.findAll({ where: scope }),
      canViewFinancialData ? FinanceiroTransacao.findAll({ where: scope }) : Promise.resolve([]),
      Agendamento.findAll({ where: scope }),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const prescriptions = await Prescricao.findAll({ where: scope, order: [['createdAt', 'ASC']] });
    const chart = Object.values(prescriptions.reduce((groups, item) => {
      const date = item.createdAt.toISOString().slice(0, 10);
      groups[date] = groups[date] || { data: date, total: 0 };
      groups[date].total += 1;
      return groups;
    }, {}));
    const receitasPagas = sumValues(financeiro.filter((item) => item.tipo === 'receita' && item.status === 'pago'));
    const despesasPagas = sumValues(financeiro.filter((item) => item.tipo === 'despesa' && item.status === 'pago'));
    const receitasPendentes = sumValues(financeiro.filter((item) => item.tipo === 'receita' && item.status !== 'pago'));
    const despesasPendentes = sumValues(financeiro.filter((item) => item.tipo === 'despesa' && item.status !== 'pago'));
    res.json({
      totalPacientes,
      totalPrescricoes,
      totalUsuarios,
      prescrioesAtivas: prescriptions.filter((item) => item.status === 'ativa').length,
      agendamentosHoje: agendamentos.filter((item) => item.dataHora?.toISOString().slice(0, 10) === today).length,
      leitos: { total: leitos.length, ocupados: leitos.filter((item) => item.status === 'ocupado').length, disponiveis: leitos.filter((item) => item.status === 'disponivel').length },
      estoque: { total: estoque.length, abaixoMinimo: estoque.filter((item) => Number(item.quantidade) <= Number(item.quantidadeMinima)).length },
      financeiro: canViewFinancialData
        ? { receitasPagas, despesasPagas, receitasPendentes, despesasPendentes, saldo: receitasPagas - despesasPagas }
        : null,
      graficoPrescricoes: chart,
    });
  } catch (error) {
    respondError(res, 500, 'Erro ao carregar estatisticas do dashboard', error.message);
  }
});

app.get('/api/dashboard/prescricoes-recentes', requireAuth, async (req, res) => {
  try {
    const rows = await Prescricao.findAll({ where: getEmpresaScope(req), order: [['createdAt', 'DESC']], limit: 5 });
    const patients = await Paciente.findAll({ where: { id: rows.map((row) => row.pacienteId) } });
    const patientNames = new Map(patients.map((patient) => [patient.id, patient.nome]));
    res.json({ prescricoes: rows.map((row) => ({ ...row.toJSON(), pacienteNome: patientNames.get(row.pacienteId) || 'Paciente nao identificado' })) });
  } catch (error) {
    respondError(res, 500, 'Erro ao carregar prescricoes recentes', error.message);
  }
});

app.get('/api/dashboard/pacientes-recentes', requireAuth, async (req, res) => {
  try {
    const pacientes = await Paciente.findAll({ where: getEmpresaScope(req), order: [['createdAt', 'DESC']], limit: 5 });
    res.json({ pacientes });
  } catch (error) {
    respondError(res, 500, 'Erro ao carregar pacientes recentes', error.message);
  }
});

app.get('/api/dashboard/next-steps', requireAuth, async (req, res) => {
  try {
    const scope = getEmpresaScope(req);
    const canViewFinancialData = ['admin', 'superadmin'].includes(req.user.role);
    const [pendingPayments, stock] = await Promise.all([
      canViewFinancialData ? FinanceiroTransacao.count({ where: { ...scope, status: 'pendente' } }) : Promise.resolve(0),
      EstoqueItem.findAll({ where: scope }),
    ]);
    const lowStock = stock.filter((item) => Number(item.quantidade) <= Number(item.quantidadeMinima)).length;
    const nextSteps = [];
    if (pendingPayments) nextSteps.push({ id: 'financeiro-pendente', title: 'Revisar pendencias financeiras', description: `${pendingPayments} lancamento(s) aguardam baixa.`, ctaLabel: 'Abrir financeiro', ctaRoute: '/financeiro' });
    if (lowStock) nextSteps.push({ id: 'estoque-minimo', title: 'Repor estoque critico', description: `${lowStock} item(ns) esta(ao) no limite minimo.`, ctaLabel: 'Abrir estoque', ctaRoute: '/estoque' });
    res.json({ nextSteps });
  } catch (error) {
    respondError(res, 500, 'Erro ao carregar proximos passos', error.message);
  }
});

app.get('/api/dashboard/alerts', requireAuth, async (req, res) => {
  try {
    const records = await RegistroEnfermagem.findAll({ where: { ...getEmpresaScope(req), alerta: true }, order: [['createdAt', 'DESC']], limit: 5 });
    res.json({ alerts: records.map((record) => ({ id: record.id, title: record.titulo, detail: record.descricao, severity: record.prioridade === 'alta' ? 'critical' : 'warning' })) });
  } catch (error) {
    respondError(res, 500, 'Erro ao carregar alertas', error.message);
  }
});

app.get('/api/comercial/overview', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const scope = getEmpresaScope(req);
    const [catalogo, pedidos, notas] = await Promise.all([
      CatalogoItem.findAll({ where: scope }),
      Pedido.findAll({ where: scope }),
      NotaFiscal.findAll({ where: scope }),
    ]);
    const paidOrders = pedidos.filter((order) => order.pagamentoStatus === 'pago' || order.pagamentoStatus === 'aprovado');
    res.json({
      metrics: {
        catalogoTotal: catalogo.filter((item) => item.ativo).length,
        produtosAtivos: catalogo.filter((item) => item.ativo && item.tipo === 'produto').length,
        servicosAtivos: catalogo.filter((item) => item.ativo && item.tipo === 'servico').length,
        pedidosAbertos: pedidos.filter((order) => order.status === 'aberto').length,
        receitaMes: sumValues(paidOrders),
        ticketMedio: paidOrders.length ? sumValues(paidOrders) / paidOrders.length : 0,
        notasEmitidas: notas.filter((note) => note.status === 'emitida' || note.status === 'simulada').length,
        notasPendentes: notas.filter((note) => note.status !== 'emitida' && note.status !== 'simulada').length,
      },
      readiness: {
        fiscal: { configured: false, provider: 'sandbox-interno', certificateConfigured: false, cityCode: null },
        payment: { configured: false, provider: 'manual' },
      },
    });
  } catch (error) {
    respondError(res, 500, 'Erro ao carregar visao comercial', error.message);
  }
});

app.get('/api/comercial/catalogo', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const where = { ...getEmpresaScope(req) };
    if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';
    res.json(await CatalogoItem.findAll({ where, order: [['createdAt', 'DESC']] }));
  } catch (error) {
    respondError(res, 500, 'Erro ao listar catalogo', error.message);
  }
});

app.post('/api/comercial/catalogo', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const item = await CatalogoItem.create({ ...req.body, ...getEmpresaScope(req) });
    res.status(201).json(item);
  } catch (error) {
    respondError(res, 500, 'Erro ao criar item de catalogo', error.message);
  }
});

app.put('/api/comercial/catalogo/:id', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const item = await CatalogoItem.findOne({ where: { id: req.params.id, ...getEmpresaScope(req) } });
    if (!item) return respondError(res, 404, 'Item de catalogo nao encontrado', null);
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    respondError(res, 500, 'Erro ao atualizar item de catalogo', error.message);
  }
});

app.get('/api/comercial/pedidos', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    res.json(await Pedido.findAll({ where: getEmpresaScope(req), order: [['createdAt', 'DESC']] }));
  } catch (error) {
    respondError(res, 500, 'Erro ao listar pedidos', error.message);
  }
});

app.get('/api/comercial/notas', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    res.json(await NotaFiscal.findAll({ where: getEmpresaScope(req), order: [['createdAt', 'DESC']] }));
  } catch (error) {
    respondError(res, 500, 'Erro ao listar notas fiscais', error.message);
  }
});

const resolveEmpresaId = async (req) => {
  if (req.body?.empresaId || req.query.empresaId) return req.body?.empresaId || req.query.empresaId;
  if (req.user.empresaId) return req.user.empresaId;
  const company = await Empresa.findOne({ order: [['createdAt', 'ASC']] });
  return company?.id || null;
};

app.post('/api/comercial/pedidos', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    if (!empresaId) return respondError(res, 400, 'Empresa obrigatoria para criar pedido', null);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return respondError(res, 400, 'Informe ao menos um item para o pedido', null);
    const catalogIds = items.map((item) => item.catalogoItemId).filter(Boolean);
    const catalog = await CatalogoItem.findAll({ where: { id: catalogIds, empresaId } });
    const catalogById = new Map(catalog.map((item) => [item.id, item]));
    if (catalogById.size !== catalogIds.length) return respondError(res, 400, 'Item de catalogo invalido para a empresa', null);
    const orderItems = items.map((item) => {
      const catalogItem = catalogById.get(item.catalogoItemId);
      const quantity = Math.max(1, Number(item.quantidade) || 1);
      const unitPrice = Number(catalogItem.preco) || 0;
      return { catalogItem, quantity, unitPrice, total: quantity * unitPrice };
    });
    const subtotal = orderItems.reduce((total, item) => total + item.total, 0);
    const desconto = Math.max(0, Number(req.body?.desconto) || 0);
    const total = Math.max(0, subtotal - desconto);
    const payment = req.body?.pagamento;
    const order = await Pedido.create({
      empresaId,
      pacienteId: req.body?.pacienteId || null,
      clienteNome: req.body?.clienteNome || null,
      origem: req.body?.origem || 'balcao',
      status: 'aberto',
      pagamentoStatus: payment?.status === 'aprovado' || payment?.status === 'pago' ? 'pago' : 'pendente',
      subtotal,
      desconto,
      total,
      observacoes: req.body?.observacoes || null,
    });
    await PedidoItem.bulkCreate(orderItems.map((item) => ({
      pedidoId: order.id,
      catalogoItemId: item.catalogItem.id,
      tipo: item.catalogItem.tipo,
      descricao: item.catalogItem.nome,
      quantidade: item.quantity,
      valorUnitario: item.unitPrice,
      total: item.total,
    })));
    if (payment) {
      await Pagamento.create({
        empresaId,
        pedidoId: order.id,
        metodo: payment.metodo || 'pix',
        gateway: payment.gateway || 'manual',
        status: payment.status || 'pendente',
        valor: Number(payment.valor) || total,
        pagoEm: payment.status === 'aprovado' || payment.status === 'pago' ? new Date() : null,
      });
    }
    res.status(201).json(order);
  } catch (error) {
    respondError(res, 500, 'Erro ao criar pedido', error.message);
  }
});

app.put('/api/comercial/pedidos/:id/status', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const order = await Pedido.findOne({ where: { id: req.params.id, ...getEmpresaScope(req) } });
    if (!order) return respondError(res, 404, 'Pedido nao encontrado', null);
    await order.update({ status: req.body?.status || order.status, pagamentoStatus: req.body?.pagamentoStatus || order.pagamentoStatus });
    res.json(order);
  } catch (error) {
    respondError(res, 500, 'Erro ao atualizar status do pedido', error.message);
  }
});

app.post('/api/comercial/pedidos/:id/pagamentos', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const order = await Pedido.findOne({ where: { id: req.params.id, ...getEmpresaScope(req) } });
    if (!order) return respondError(res, 404, 'Pedido nao encontrado', null);
    const status = req.body?.status || (req.body?.iniciarCheckout ? 'processando' : 'pendente');
    const payment = await Pagamento.create({
      empresaId: order.empresaId,
      pedidoId: order.id,
      metodo: req.body?.metodo || 'pix',
      gateway: req.body?.gateway || 'manual',
      status,
      valor: Number(req.body?.valor) || Number(order.total),
      pagoEm: status === 'aprovado' || status === 'pago' ? new Date() : null,
    });
    if (status === 'aprovado' || status === 'pago') await order.update({ pagamentoStatus: 'pago' });
    const checkout = req.body?.iniciarCheckout ? {
      provider: payment.gateway,
      status: 'simulado',
      qrCode: `PIX-SIMULADO-${order.id}`,
      reference: payment.id,
    } : null;
    res.status(201).json({ payment, checkout, notaFiscal: null });
  } catch (error) {
    respondError(res, 500, 'Erro ao registrar pagamento', error.message);
  }
});

app.post('/api/comercial/pedidos/:id/nota-fiscal', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const order = await Pedido.findOne({ where: { id: req.params.id, ...getEmpresaScope(req) } });
    if (!order) return respondError(res, 404, 'Pedido nao encontrado', null);
    const number = `SIM-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
    const note = await NotaFiscal.create({
      empresaId: order.empresaId,
      pedidoId: order.id,
      tipoDocumento: req.body?.tipoDocumento || 'nfs-e',
      status: 'simulada',
      numero: number,
      serie: '1',
      chaveAcesso: `SIM-${order.id.replace(/-/g, '')}`,
      provedor: 'sandbox-interno',
      ambiente: 'homologacao',
      payload: { pedidoId: order.id, total: order.total },
      resposta: { simulated: true, status: 'accepted' },
      emitidaEm: new Date(),
    });
    await NotaFiscalLog.create({ empresaId: order.empresaId, notaFiscalId: note.id, nivel: 'info', mensagem: 'Nota fiscal simulada criada pelo fluxo comercial.', detalhes: { pedidoId: order.id } });
    await order.update({ status: 'faturado' });
    res.status(201).json(note);
  } catch (error) {
    respondError(res, 500, 'Erro ao emitir nota fiscal', error.message);
  }
});

app.get('/api/pacientes/:id/prescricoes', requireAuth, async (req, res) => {
  try {
    const patient = await Paciente.findOne({ where: { id: req.params.id, ...getEmpresaScope(req) } });
    if (!patient) return respondError(res, 404, 'Paciente nao encontrado', null);
    const prescricoes = await Prescricao.findAll({ where: { pacienteId: patient.id, empresaId: patient.empresaId }, order: [['createdAt', 'DESC']] });
    res.json({ prescricoes });
  } catch (error) {
    respondError(res, 500, 'Erro ao carregar historico do paciente', error.message);
  }
});

app.put('/api/pacientes/:id/inativar', requireAuth, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) return respondError(res, 403, 'Apenas administradores podem inativar pacientes', null);
    const patient = await Paciente.findOne({ where: { id: req.params.id, ...getEmpresaScope(req) } });
    if (!patient) return respondError(res, 404, 'Paciente nao encontrado', null);
    await patient.update({ status: 'inativo' });
    res.json(patient);
  } catch (error) {
    respondError(res, 500, 'Erro ao inativar paciente', error.message);
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prescrimed-local' });
});

app.get('/_health', (_req, res) => {
  res.json({ status: 'ok', service: 'prescrimed-local' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'prescrimed-local' });
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API local funcionando', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      return respondError(res, 400, 'Email e senha são obrigatórios', null);
    }

    const user = await Usuario.findOne({ where: { email } });
    if (!user || !comparePassword(senha, user.senha)) {
      return respondError(res, 401, 'Credenciais inválidas', null);
    }

    const token = createAuthToken({
      userId: user.id,
      secret: authTokenSecret,
      expiresInSeconds: authTokenLifetime,
    });
    res.json({
      user: toUserProfile(user),
      token,
    });
  } catch (error) {
    respondError(res, 500, 'Erro ao autenticar', error.message);
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(toUserProfile(req.user));
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      nome,
      nomeAdmin,
      nomeEmpresa,
      tipoSistema,
      cnpj,
      email,
      senha,
      cpf,
      contato,
      role = 'admin',
    } = req.body || {};
    const userName = nomeAdmin || nome;
    const isCompanyRegistration = Boolean(nomeEmpresa || nomeAdmin || tipoSistema || cnpj || cpf || contato);

    if (!userName || !email || !senha) {
      return respondError(res, 400, 'Nome, email e senha são obrigatórios', null);
    }

    if (isCompanyRegistration && (!nomeEmpresa || !tipoSistema || !cnpj || !cpf || !contato)) {
      return respondError(res, 400, 'Preencha os dados obrigatórios da empresa e do administrador', null);
    }

    const existingUser = await Usuario.findOne({ where: { email } });
    if (existingUser) {
      return respondError(res, 409, 'Já existe uma conta cadastrada com este e-mail', null);
    }

    if (isCompanyRegistration) {
      const existingCompany = await Empresa.findOne({ where: { cnpj } });
      if (existingCompany) {
        return respondError(res, 409, 'Já existe uma empresa cadastrada com este CNPJ', null);
      }
    }

    const created = await sequelize.transaction(async (transaction) => {
      const empresa = isCompanyRegistration
        ? await Empresa.create({
          nome: nomeEmpresa,
          tipoSistema,
          cnpj,
          email,
          telefone: contato,
          ativo: true,
        }, { transaction })
        : null;

      return Usuario.create({
        nome: userName,
        email,
        senha: bcrypt.hashSync(normalizePassword(senha), 10),
        role,
        contato,
        empresaId: empresa?.id || null,
        ativo: true,
      }, { transaction });
    });

    res.status(201).json({ user: toUserProfile(created) });
  } catch (error) {
    respondError(res, 500, 'Erro ao criar usuário', error.message);
  }
});

app.get('/api/empresas/me', requireAuth, async (_req, res) => {
  try {
    const empresa = await Empresa.findOne({ order: [['createdAt', 'ASC']] });
    if (!empresa) return respondError(res, 404, 'Nenhuma empresa cadastrada', null);
    res.json(empresa);
  } catch (error) {
    respondError(res, 500, 'Erro ao buscar empresa', error.message);
  }
});

registerCrudRoutes('empresas', Empresa, 'superadmin');
registerCrudRoutes('usuarios', Usuario, 'usuarios');
registerCrudRoutes('pacientes', Paciente, 'pacientes');
registerCrudRoutes('prescricoes', Prescricao, 'prescricoes');
registerCrudRoutes('agendamentos', Agendamento, 'agenda');
registerCrudRoutes('registro-enfermagem', RegistroEnfermagem, 'evolucao');
registerCrudRoutes('sessoes-fisio', SessaoFisio, 'evolucao');
registerCrudRoutes('casa-repouso-leitos', CasaRepousoLeito, 'pacientes');
registerCrudRoutes('pets', Pet, 'comercial');
registerCrudRoutes('estoque-itens', EstoqueItem, 'estoque');
registerCrudRoutes('estoque-movimentacoes', EstoqueMovimentacao, 'estoque');
registerCrudRoutes('financeiro-transacoes', FinanceiroTransacao, 'financeiro', ['admin', 'superadmin']);
registerCrudRoutes('catalogo-items', CatalogoItem, 'comercial', ['admin', 'superadmin']);
registerCrudRoutes('pedidos', Pedido, 'comercial', ['admin', 'superadmin']);
registerCrudRoutes('pedido-items', PedidoItem, 'comercial', ['admin', 'superadmin']);
registerCrudRoutes('pagamentos', Pagamento, 'comercial', ['admin', 'superadmin']);
registerCrudRoutes('nota-fiscal', NotaFiscal, 'comercial', ['admin', 'superadmin']);
registerCrudRoutes('nota-fiscal-logs', NotaFiscalLog, 'comercial', ['admin', 'superadmin']);
registerCrudRoutes('empresa-sequencias', EmpresaSequencia, 'superadmin');

app.use(express.static(distDir));

app.use(async (_req, res) => {
  try {
    res.sendFile(path.join(distDir, 'index.html'));
  } catch (error) {
    res.status(404).send('Not found');
  }
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: { drop: false } });
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar backend local:', error);
    process.exit(1);
  }
};

startServer();

export default app;
