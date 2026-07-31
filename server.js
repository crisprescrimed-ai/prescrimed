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
const authTokenLifetime = Number.parseInt(process.env.AUTH_TOKEN_TTL_SECONDS || '28800', 10);
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

const registerCrudRoutes = (resourcePath, model) => {
  app.get(`/api/${resourcePath}`, requireAuth, async (_req, res) => {
    try {
      const rows = await model.findAll({ order: [['createdAt', 'DESC']] });
      res.json(rows);
    } catch (error) {
      respondError(res, 500, 'Erro ao listar registros', error.message);
    }
  });

  app.get(`/api/${resourcePath}/:id`, requireAuth, async (req, res) => {
    try {
      const row = await model.findByPk(req.params.id);
      if (!row) return respondError(res, 404, 'Registro não encontrado', null);
      res.json(row);
    } catch (error) {
      respondError(res, 500, 'Erro ao buscar registro', error.message);
    }
  });

  app.post(`/api/${resourcePath}`, requireAuth, async (req, res) => {
    try {
      const row = await model.create(req.body);
      res.status(201).json(row);
    } catch (error) {
      respondError(res, 500, 'Erro ao criar registro', error.message);
    }
  });

  app.put(`/api/${resourcePath}/:id`, requireAuth, async (req, res) => {
    try {
      const row = await model.findByPk(req.params.id);
      if (!row) return respondError(res, 404, 'Registro não encontrado', null);
      await row.update(req.body);
      res.json(row);
    } catch (error) {
      respondError(res, 500, 'Erro ao atualizar registro', error.message);
    }
  });

  app.delete(`/api/${resourcePath}/:id`, requireAuth, async (req, res) => {
    try {
      const row = await model.findByPk(req.params.id);
      if (!row) return respondError(res, 404, 'Registro não encontrado', null);
      await row.destroy();
      res.json({ success: true });
    } catch (error) {
      respondError(res, 500, 'Erro ao excluir registro', error.message);
    }
  });
};

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

    res.json({
      user: toUserProfile(user),
      token: createAuthToken({
        userId: user.id,
        secret: authTokenSecret,
        expiresInSeconds: authTokenLifetime,
      }),
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
    const { nome, email, senha, role = 'admin' } = req.body || {};
    if (!nome || !email || !senha) {
      return respondError(res, 400, 'Nome, email e senha são obrigatórios', null);
    }

    const hashedPassword = bcrypt.hashSync(normalizePassword(senha), 10);
    const created = await Usuario.create({
      nome,
      email,
      senha: hashedPassword,
      role,
      ativo: true,
    });

    res.status(201).json({ user: { id: created.id, nome: created.nome, email: created.email, role: created.role } });
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

registerCrudRoutes('empresas', Empresa);
registerCrudRoutes('usuarios', Usuario);
registerCrudRoutes('pacientes', Paciente);
registerCrudRoutes('prescricoes', Prescricao);
registerCrudRoutes('agendamentos', Agendamento);
registerCrudRoutes('registro-enfermagem', RegistroEnfermagem);
registerCrudRoutes('sessoes-fisio', SessaoFisio);
registerCrudRoutes('casa-repouso-leitos', CasaRepousoLeito);
registerCrudRoutes('pets', Pet);
registerCrudRoutes('estoque-itens', EstoqueItem);
registerCrudRoutes('estoque-movimentacoes', EstoqueMovimentacao);
registerCrudRoutes('financeiro-transacoes', FinanceiroTransacao);
registerCrudRoutes('catalogo-items', CatalogoItem);
registerCrudRoutes('pedidos', Pedido);
registerCrudRoutes('pedido-items', PedidoItem);
registerCrudRoutes('pagamentos', Pagamento);
registerCrudRoutes('nota-fiscal', NotaFiscal);
registerCrudRoutes('nota-fiscal-logs', NotaFiscalLog);
registerCrudRoutes('empresa-sequencias', EmpresaSequencia);

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
