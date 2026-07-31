import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || null;

// Permite forçar uso de SQLite local mesmo se DATABASE_URL estiver presente.
const forceSqlite = (process.env.FORCE_SQLITE || 'false').toLowerCase() === 'true';

const useSsl = (process.env.PGSSLMODE || '').toLowerCase() === 'require';
const dialectOptions = useSsl
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
  : {};

let sequelize;
if (databaseUrl && !forceSqlite) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions,
    logging: false,
  });
} else {
  const storage = process.env.SQLITE_STORAGE || 'tmp/dev.sqlite';
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
  });
}

const buildAttrs = (attrs) => ({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ...attrs,
});

const Empresa = sequelize.define('Empresa', buildAttrs({
  nome: { type: DataTypes.STRING },
  tipoSistema: { type: DataTypes.STRING },
  cnpj: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  telefone: { type: DataTypes.STRING },
  endereco: { type: DataTypes.STRING },
  plano: { type: DataTypes.STRING },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}), { tableName: 'empresas' });

const Usuario = sequelize.define('Usuario', buildAttrs({
  nome: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  senha: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING },
  permissoes: { type: DataTypes.JSON, defaultValue: [] },
  contato: { type: DataTypes.STRING },
  empresaId: { type: DataTypes.UUID, allowNull: true },
  especialidade: { type: DataTypes.STRING },
  crm: { type: DataTypes.STRING },
  crmUf: { type: DataTypes.STRING },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}), { tableName: 'usuarios' });

const Paciente = sequelize.define('Paciente', buildAttrs({
  nome: { type: DataTypes.STRING },
  cpf: { type: DataTypes.STRING },
  dataNascimento: { type: DataTypes.DATE },
  telefone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  endereco: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'ativo' },
  empresaId: { type: DataTypes.UUID },
  observacoes: { type: DataTypes.TEXT },
}), { tableName: 'pacientes' });

const Prescricao = sequelize.define('Prescricao', buildAttrs({
  pacienteId: { type: DataTypes.UUID },
  nutricionistaId: { type: DataTypes.UUID },
  empresaId: { type: DataTypes.UUID },
  tipo: { type: DataTypes.STRING },
  descricao: { type: DataTypes.TEXT },
  observacoes: { type: DataTypes.TEXT },
  itens: { type: DataTypes.JSON },
  status: { type: DataTypes.STRING },
}), { tableName: 'prescricoes' });

const Agendamento = sequelize.define('Agendamento', buildAttrs({
  pacienteId: { type: DataTypes.UUID },
  empresaId: { type: DataTypes.UUID },
  usuarioId: { type: DataTypes.UUID },
  titulo: { type: DataTypes.STRING },
  descricao: { type: DataTypes.TEXT },
  dataHora: { type: DataTypes.DATE },
  duracao: { type: DataTypes.INTEGER },
  tipo: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING },
  local: { type: DataTypes.STRING },
  participante: { type: DataTypes.STRING },
  observacoes: { type: DataTypes.TEXT },
}), { tableName: 'agendamentos' });

const RegistroEnfermagem = sequelize.define('RegistroEnfermagem', buildAttrs({
  pacienteId: { type: DataTypes.UUID },
  usuarioId: { type: DataTypes.UUID },
  empresaId: { type: DataTypes.UUID },
  tipo: { type: DataTypes.STRING },
  titulo: { type: DataTypes.STRING },
  descricao: { type: DataTypes.TEXT },
  sinaisVitais: { type: DataTypes.JSON },
  riscoQueda: { type: DataTypes.STRING },
  riscoLesao: { type: DataTypes.STRING },
  estadoGeral: { type: DataTypes.STRING },
  alerta: { type: DataTypes.BOOLEAN, defaultValue: false },
  prioridade: { type: DataTypes.STRING },
  observacoes: { type: DataTypes.TEXT },
  anexos: { type: DataTypes.JSON },
}), { tableName: 'registro_enfermagem' });

const SessaoFisio = sequelize.define('SessaoFisio', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  pacienteId: { type: DataTypes.UUID },
  protocolo: { type: DataTypes.STRING },
  dataHora: { type: DataTypes.DATE },
  duracao: { type: DataTypes.INTEGER },
  observacoes: { type: DataTypes.TEXT },
}), { tableName: 'sessoes_fisio' });

const CasaRepousoLeito = sequelize.define('CasaRepousoLeito', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  numero: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING },
  observacoes: { type: DataTypes.TEXT },
}), { tableName: 'casa_repouso_leitos' });

const Pet = sequelize.define('Pet', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  nome: { type: DataTypes.STRING },
  especie: { type: DataTypes.STRING },
  raca: { type: DataTypes.STRING },
  tutorNome: { type: DataTypes.STRING },
  observacoes: { type: DataTypes.TEXT },
}), { tableName: 'pets' });

const EstoqueItem = sequelize.define('EstoqueItem', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  nome: { type: DataTypes.STRING },
  descricao: { type: DataTypes.TEXT },
  tipo: { type: DataTypes.STRING },
  categoria: { type: DataTypes.STRING },
  unidade: { type: DataTypes.STRING },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 0 },
  quantidadeMinima: { type: DataTypes.INTEGER, defaultValue: 0 },
  valorUnitario: { type: DataTypes.DECIMAL },
  localizacao: { type: DataTypes.STRING },
  lote: { type: DataTypes.STRING },
  validade: { type: DataTypes.DATE },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}), { tableName: 'estoque_itens' });

const EstoqueMovimentacao = sequelize.define('EstoqueMovimentacao', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  estoqueItemId: { type: DataTypes.UUID },
  usuarioId: { type: DataTypes.UUID },
  tipo: { type: DataTypes.STRING },
  quantidade: { type: DataTypes.INTEGER },
  quantidadeAnterior: { type: DataTypes.INTEGER },
  quantidadeNova: { type: DataTypes.INTEGER },
  valorUnitario: { type: DataTypes.DECIMAL },
  valorTotal: { type: DataTypes.DECIMAL },
  motivo: { type: DataTypes.STRING },
  observacoes: { type: DataTypes.TEXT },
  dataMovimentacao: { type: DataTypes.DATE },
}), { tableName: 'estoque_movimentacoes' });

const FinanceiroTransacao = sequelize.define('FinanceiroTransacao', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  pacienteId: { type: DataTypes.UUID },
  usuarioId: { type: DataTypes.UUID },
  tipo: { type: DataTypes.STRING },
  categoria: { type: DataTypes.STRING },
  descricao: { type: DataTypes.TEXT },
  valor: { type: DataTypes.DECIMAL },
  dataVencimento: { type: DataTypes.DATE },
  dataPagamento: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING },
  formaPagamento: { type: DataTypes.STRING },
  recorrente: { type: DataTypes.BOOLEAN, defaultValue: false },
  periodoRecorrencia: { type: DataTypes.STRING },
  observacoes: { type: DataTypes.TEXT },
}), { tableName: 'financeiro_transacoes' });

const CatalogoItem = sequelize.define('CatalogoItem', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  tipo: { type: DataTypes.STRING },
  nome: { type: DataTypes.STRING },
  descricao: { type: DataTypes.TEXT },
  categoria: { type: DataTypes.STRING },
  sku: { type: DataTypes.STRING },
  preco: { type: DataTypes.DECIMAL },
  estoqueAtual: { type: DataTypes.INTEGER, defaultValue: 0 },
  estoqueMinimo: { type: DataTypes.INTEGER, defaultValue: 0 },
  unidade: { type: DataTypes.STRING },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}), { tableName: 'catalogo_items' });

const Pedido = sequelize.define('Pedido', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  pacienteId: { type: DataTypes.UUID },
  clienteNome: { type: DataTypes.STRING },
  origem: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING },
  pagamentoStatus: { type: DataTypes.STRING },
  subtotal: { type: DataTypes.DECIMAL },
  desconto: { type: DataTypes.DECIMAL },
  total: { type: DataTypes.DECIMAL },
  observacoes: { type: DataTypes.TEXT },
}), { tableName: 'pedidos' });

const PedidoItem = sequelize.define('PedidoItem', buildAttrs({
  pedidoId: { type: DataTypes.UUID },
  catalogoItemId: { type: DataTypes.UUID },
  tipo: { type: DataTypes.STRING },
  descricao: { type: DataTypes.STRING },
  quantidade: { type: DataTypes.INTEGER },
  valorUnitario: { type: DataTypes.DECIMAL },
  total: { type: DataTypes.DECIMAL },
}), { tableName: 'pedido_items' });

const Pagamento = sequelize.define('Pagamento', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  pedidoId: { type: DataTypes.UUID },
  metodo: { type: DataTypes.STRING },
  gateway: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING },
  valor: { type: DataTypes.DECIMAL },
  pagoEm: { type: DataTypes.DATE },
}), { tableName: 'pagamentos' });

const NotaFiscal = sequelize.define('NotaFiscal', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  pedidoId: { type: DataTypes.UUID },
  tipoDocumento: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING },
  numero: { type: DataTypes.STRING },
  serie: { type: DataTypes.STRING },
  chaveAcesso: { type: DataTypes.STRING },
  provedor: { type: DataTypes.STRING },
  ambiente: { type: DataTypes.STRING },
  payload: { type: DataTypes.JSON },
  resposta: { type: DataTypes.JSON },
  emitidaEm: { type: DataTypes.DATE },
}), { tableName: 'nota_fiscal' });

const NotaFiscalLog = sequelize.define('NotaFiscalLog', buildAttrs({
  empresaId: { type: DataTypes.UUID },
  notaFiscalId: { type: DataTypes.UUID },
  nivel: { type: DataTypes.STRING },
  mensagem: { type: DataTypes.TEXT },
  detalhes: { type: DataTypes.JSON },
}), { tableName: 'nota_fiscal_logs' });

const EmpresaSequencia = sequelize.define('EmpresaSequencia', buildAttrs({
  tipoSistema: { type: DataTypes.STRING, unique: true },
  ultimoNumero: { type: DataTypes.INTEGER, defaultValue: 0 },
}), { tableName: 'empresa_sequencias' });

export {
  sequelize,
  Empresa,
  Usuario,
  Paciente,
  Prescricao,
  Agendamento,
  RegistroEnfermagem,
  SessaoFisio,
  EstoqueItem,
  EstoqueMovimentacao,
  FinanceiroTransacao,
  CasaRepousoLeito,
  Pet,
  CatalogoItem,
  Pedido,
  PedidoItem,
  Pagamento,
  NotaFiscal,
  NotaFiscalLog,
  EmpresaSequencia,
};
