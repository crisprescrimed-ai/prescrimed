#!/usr/bin/env node
import 'dotenv/config';
import bcrypt from 'bcryptjs';
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
} from '../models/index.js';

const resetRequested = process.argv.includes('--reset');
const baseDate = new Date('2026-07-30T12:00:00.000Z');
const daysFromBase = (days) => new Date(baseDate.getTime() + days * 86400000);

const rolePermissions = {
  superadmin: ['dashboard', 'agenda', 'cronograma', 'prescricoes', 'pacientes', 'estoque', 'evolucao', 'financeiro', 'comercial', 'usuarios', 'configuracoes'],
  admin: ['dashboard', 'agenda', 'cronograma', 'prescricoes', 'pacientes', 'estoque', 'evolucao', 'financeiro', 'comercial', 'usuarios', 'configuracoes'],
  medico: ['dashboard', 'agenda', 'prescricoes', 'pacientes', 'evolucao'],
  nutricionista: ['dashboard', 'agenda', 'prescricoes', 'pacientes'],
  enfermeiro: ['dashboard', 'agenda', 'pacientes', 'evolucao'],
  tecnico_enfermagem: ['agenda', 'pacientes', 'evolucao'],
  fisioterapeuta: ['dashboard', 'agenda', 'pacientes', 'evolucao'],
  assistente_social: ['dashboard', 'agenda', 'pacientes'],
  auxiliar_administrativo: ['dashboard', 'agenda', 'pacientes', 'financeiro'],
  atendente: ['agenda', 'pacientes'],
};

const modelsToClear = [
  NotaFiscalLog,
  NotaFiscal,
  Pagamento,
  PedidoItem,
  Pedido,
  EstoqueMovimentacao,
  FinanceiroTransacao,
  RegistroEnfermagem,
  Agendamento,
  Prescricao,
  SessaoFisio,
  Pet,
  EstoqueItem,
  CasaRepousoLeito,
  CatalogoItem,
  Paciente,
  Usuario,
  EmpresaSequencia,
  Empresa,
];

const truncateAll = async () => {
  for (const model of modelsToClear) {
    try {
      await model.truncate({ cascade: true, restartIdentity: true });
    } catch {
      await model.destroy({ where: {}, truncate: true });
    }
  }
};

const expectedCounts = {
  empresas: 1,
  usuarios: 10,
  pacientes: 5,
  prescricoes: 5,
  agendamentos: 6,
  registrosEnfermagem: 5,
  sessoesFisio: 4,
  leitos: 6,
  pets: 2,
  estoque: 4,
  movimentacoes: 4,
  financeiro: 4,
  catalogo: 3,
  pedidos: 2,
  pedidoItens: 3,
  pagamentos: 2,
  notas: 1,
  notaLogs: 2,
  sequencias: 3,
};

const verifyCount = async (label, model, expected) => {
  const actual = await model.count();
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, encontrado ${actual}`);
  }
};

async function seedValidationData() {
  if (!resetRequested) {
    throw new Error('Use --reset para confirmar a substituicao dos dados de validacao.');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('O seed de validacao nao pode ser executado em producao.');
  }

  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  await truncateAll();

  const empresa = await Empresa.create({
    nome: 'Clinica Horizonte - Ambiente de Validacao',
    tipoSistema: 'casa-repouso',
    cnpj: '12.345.678/0001-99',
    email: 'contato@horizonte.teste',
    telefone: '(11) 4000-1200',
    endereco: 'Avenida das Artes, 1200 - Sao Paulo/SP',
    plano: 'profissional',
    ativo: true,
  });

  const passwordHash = await bcrypt.hash('Teste@2026', 10);
  const users = await Usuario.bulkCreate([
    { nome: 'Sofia Martins', email: 'superadmin@validacao.local', role: 'superadmin', contato: '(11) 90000-0001' },
    { nome: 'Rafael Lima', email: 'admin@validacao.local', role: 'admin', contato: '(11) 90000-0002' },
    { nome: 'Dra. Beatriz Moraes', email: 'medico@validacao.local', role: 'medico', especialidade: 'Geriatria', crm: '123456', crmUf: 'SP' },
    { nome: 'Nicolas Duarte', email: 'nutricionista@validacao.local', role: 'nutricionista', especialidade: 'Nutricao Clinica', crm: 'CRN-3 99887', crmUf: 'SP' },
    { nome: 'Carolina Nunes', email: 'enfermeiro@validacao.local', role: 'enfermeiro', especialidade: 'Enfermagem', crm: 'COREN-SP 123456', crmUf: 'SP' },
    { nome: 'Pedro Freitas', email: 'tecnico@validacao.local', role: 'tecnico_enfermagem', especialidade: 'Tecnico de Enfermagem' },
    { nome: 'Marina Azevedo', email: 'fisioterapeuta@validacao.local', role: 'fisioterapeuta', especialidade: 'Fisioterapia Motora', crm: 'CREFITO-3 77889', crmUf: 'SP' },
    { nome: 'Luciana Reis', email: 'social@validacao.local', role: 'assistente_social', especialidade: 'Servico Social' },
    { nome: 'Diego Sampaio', email: 'auxiliar@validacao.local', role: 'auxiliar_administrativo', especialidade: 'Administracao' },
    { nome: 'Camila Rocha', email: 'atendente@validacao.local', role: 'atendente', especialidade: 'Atendimento' },
  ].map((user) => ({
    ...user,
    senha: passwordHash,
    permissoes: rolePermissions[user.role],
    empresaId: user.role === 'superadmin' ? null : empresa.id,
    ativo: true,
  })), { returning: true });

  const byRole = Object.fromEntries(users.map((user) => [user.role, user]));

  const patients = await Paciente.bulkCreate([
    {
      nome: 'Maria Aparecida Silva',
      cpf: '11111111111',
      dataNascimento: '1942-04-18',
      telefone: '(11) 95555-1001',
      email: 'maria.aparecida@paciente.teste',
      endereco: 'Rua das Palmeiras, 45 - Sao Paulo/SP',
      observacoes: 'Cenario completo. Mulher cis, 84 anos, hipertensao e diabetes controladas. Convenio particular. Documentacao completa. Contato de emergencia: Helena Silva.',
    },
    {
      nome: 'Jose Carlos Pereira',
      cpf: '22222222222',
      dataNascimento: '1949-11-03',
      telefone: '(11) 95555-1002',
      email: null,
      endereco: 'Travessa do Sol, 88 - Guarulhos/SP',
      observacoes: 'Cenario parcial. Homem cis, 76 anos, pos-operatorio de quadril. Atendimento por convenio. Sem email e com comprovante de residencia pendente.',
    },
    {
      nome: 'Ana Luiza Costa',
      cpf: '33333333333',
      dataNascimento: '1958-07-25',
      telefone: '(11) 95555-1003',
      email: 'ana.luiza@paciente.teste',
      endereco: 'Alameda Ipira, 190 - Sao Paulo/SP',
      observacoes: 'Cenario clinico complexo. Mulher trans, 68 anos, reabilitacao pos-AVC, disfagia leve e alto risco de queda. Atendimento domiciliar. Anexos de avaliacao registrados na evolucao.',
    },
    {
      nome: 'Rafael Oliveira Santos',
      cpf: '44444444444',
      dataNascimento: '1984-02-12',
      telefone: '(11) 95555-1004',
      email: 'rafael.oliveira@paciente.teste',
      endereco: 'Rua do Lago, 501 - Osasco/SP',
      observacoes: 'Cenario adulto. Pessoa nao binaria, 42 anos, lombalgia cronica e retorno ao trabalho. Atendimento particular por sessao. Historico medico sem alergias conhecidas.',
    },
    {
      nome: 'Carlos Eduardo Almeida',
      cpf: '55555555555',
      dataNascimento: '1934-09-09',
      telefone: null,
      email: null,
      endereco: 'Instituicao Horizonte, Quarto 12 - Sao Paulo/SP',
      observacoes: 'Cenario de dados incompletos. Homem cis, 91 anos, cuidados paliativos, mobilidade reduzida. Sem telefone ou email proprio. Documentacao de responsavel pendente.',
    },
  ].map((patient) => ({ ...patient, empresaId: empresa.id, status: 'ativo' })), { returning: true });

  const [maria, jose, ana, rafael, carlos] = patients;
  const prescriptions = await Prescricao.bulkCreate([
    { pacienteId: maria.id, nutricionistaId: byRole.nutricionista.id, tipo: 'medicamentosa', descricao: 'Plano de medicacao e dieta hipossodica.', observacoes: 'Reavaliar glicemia em 30 dias.', itens: [{ nome: 'Losartana', dose: '50 mg', frequencia: '12/12h' }, { nome: 'Dieta hipossodica', frequencia: 'diaria' }], status: 'ativa' },
    { pacienteId: jose.id, nutricionistaId: byRole.medico.id, tipo: 'pos-operatorio', descricao: 'Analgesia e mobilidade assistida.', observacoes: 'Revisar em 7 dias.', itens: [{ nome: 'Dipirona', dose: '500 mg', frequencia: '6/6h se dor' }], status: 'ativa' },
    { pacienteId: ana.id, nutricionistaId: byRole.medico.id, tipo: 'reabilitacao', descricao: 'Plano de reabilitacao neurologica e consistencia pastosa.', observacoes: 'Alerta para disfagia.', itens: [{ nome: 'Fonoaudiologia', frequencia: '3x semana' }, { nome: 'Hidratacao espessada', frequencia: 'diaria' }], status: 'ativa' },
    { pacienteId: rafael.id, nutricionistaId: byRole.medico.id, tipo: 'fisioterapia', descricao: 'Fortalecimento de core e ergonomia.', observacoes: 'Sem restricoes cardiovasculares.', itens: [{ nome: 'Exercicio terapeutico', frequencia: '2x semana' }], status: 'em_revisao' },
    { pacienteId: carlos.id, nutricionistaId: byRole.medico.id, tipo: 'paliativa', descricao: 'Conforto, controle de dor e cuidado compartilhado.', observacoes: 'Plano discutido com responsavel.', itens: [{ nome: 'Escala de dor', frequencia: 'a cada turno' }], status: 'ativa' },
  ].map((prescription) => ({ ...prescription, empresaId: empresa.id })), { returning: true });

  await Agendamento.bulkCreate([
    { pacienteId: maria.id, usuarioId: byRole.medico.id, titulo: 'Consulta geriatrica de rotina', descricao: 'Acompanhamento de hipertensao e diabetes.', dataHora: daysFromBase(2), duracao: 40, tipo: 'consulta', status: 'agendado', local: 'Sala 1', participante: maria.nome, observacoes: 'Trazer exames.' },
    { pacienteId: jose.id, usuarioId: byRole.fisioterapeuta.id, titulo: 'Sessao pos-operatoria', descricao: 'Treino de marcha assistida.', dataHora: daysFromBase(1), duracao: 50, tipo: 'fisioterapia', status: 'confirmado', local: 'Sala de reabilitacao', participante: jose.nome },
    { pacienteId: ana.id, usuarioId: byRole.enfermeiro.id, titulo: 'Avaliacao de risco de queda', descricao: 'Revisar plano de seguranca.', dataHora: daysFromBase(3), duracao: 30, tipo: 'enfermagem', status: 'agendado', local: 'Quarto 08', participante: ana.nome },
    { pacienteId: rafael.id, usuarioId: byRole.fisioterapeuta.id, titulo: 'Retorno funcional', descricao: 'Reavaliar lombalgia.', dataHora: daysFromBase(-2), duracao: 45, tipo: 'fisioterapia', status: 'concluido', local: 'Clinica anexa', participante: rafael.nome },
    { pacienteId: carlos.id, usuarioId: byRole.medico.id, titulo: 'Reuniao de cuidado paliativo', descricao: 'Alinhar plano com responsavel.', dataHora: daysFromBase(4), duracao: 60, tipo: 'consulta', status: 'agendado', local: 'Quarto 12', participante: carlos.nome },
    { pacienteId: jose.id, usuarioId: byRole.atendente.id, titulo: 'Retorno cancelado', descricao: 'Cenario de cancelamento.', dataHora: daysFromBase(6), duracao: 30, tipo: 'administrativo', status: 'cancelado', local: 'Recepcao', participante: jose.nome, observacoes: 'Cancelado pelo responsavel.' },
  ].map((appointment) => ({ ...appointment, empresaId: empresa.id })), { returning: true });

  await RegistroEnfermagem.bulkCreate([
    { pacienteId: maria.id, usuarioId: byRole.enfermeiro.id, tipo: 'sinais_vitais', titulo: 'Afericao sem intercorrencias', descricao: 'Pressao e glicemia dentro da meta.', sinaisVitais: { pa: '128/76', fc: 70, fr: 16, temperatura: 36.4, glicemia: 112 }, riscoQueda: 'baixo', riscoLesao: 'baixo', estadoGeral: 'bom', alerta: false, prioridade: 'baixa', anexos: [] },
    { pacienteId: jose.id, usuarioId: byRole.tecnico_enfermagem.id, tipo: 'evolucao', titulo: 'Dor controlada', descricao: 'Deambulacao com andador e supervisao.', sinaisVitais: { pa: '132/80', fc: 76 }, riscoQueda: 'medio', riscoLesao: 'baixo', estadoGeral: 'regular', alerta: false, prioridade: 'media', observacoes: 'Solicitar avaliacao fisioterapica.', anexos: [] },
    { pacienteId: ana.id, usuarioId: byRole.enfermeiro.id, tipo: 'alerta', titulo: 'Risco de aspiracao', descricao: 'Tosse apos ingestao de liquido sem espessante.', sinaisVitais: { pa: '118/74', fc: 82, satO2: 96 }, riscoQueda: 'alto', riscoLesao: 'medio', estadoGeral: 'atencao', alerta: true, prioridade: 'alta', observacoes: 'Manter cabeçeira elevada e consistencia prescrita.', anexos: [{ nome: 'avaliacao-degluticao.pdf', tipo: 'application/pdf', origem: 'seed' }] },
    { pacienteId: rafael.id, usuarioId: byRole.fisioterapeuta.id, tipo: 'evolucao_funcional', titulo: 'Ganho de mobilidade', descricao: 'Reducao de dor referida apos exercicios.', sinaisVitais: { escalaDor: 3 }, riscoQueda: 'baixo', riscoLesao: 'baixo', estadoGeral: 'bom', alerta: false, prioridade: 'baixa', anexos: [{ nome: 'escala-funcional.jpg', tipo: 'image/jpeg', origem: 'seed' }] },
    { pacienteId: carlos.id, usuarioId: byRole.enfermeiro.id, tipo: 'cuidados_paliativos', titulo: 'Conforto preservado', descricao: 'Familia orientada e sem sinais de dor intensa.', sinaisVitais: { escalaDor: 1, satO2: 93 }, riscoQueda: 'alto', riscoLesao: 'alto', estadoGeral: 'fragil', alerta: true, prioridade: 'alta', observacoes: 'Reavaliar conforto a cada turno.', anexos: [] },
  ].map((record) => ({ ...record, empresaId: empresa.id })), { returning: true });

  await SessaoFisio.bulkCreate([
    { pacienteId: jose.id, protocolo: 'Treino de marcha e transferencia', dataHora: daysFromBase(1), duracao: 50, observacoes: 'Usar andador.' },
    { pacienteId: ana.id, protocolo: 'Mobilidade assistida pos-AVC', dataHora: daysFromBase(3), duracao: 45, observacoes: 'Monitorar fadiga.' },
    { pacienteId: rafael.id, protocolo: 'Estabilizacao lombar', dataHora: daysFromBase(-2), duracao: 45, observacoes: 'Evolucao favoravel.' },
    { pacienteId: rafael.id, protocolo: 'Retorno ao trabalho', dataHora: daysFromBase(5), duracao: 45, observacoes: 'Plano domiciliar entregue.' },
  ].map((session) => ({ ...session, empresaId: empresa.id })), { returning: true });

  await CasaRepousoLeito.bulkCreate([
    { numero: 'A-01', status: 'ocupado', observacoes: `Ocupado por ${maria.nome}` },
    { numero: 'A-02', status: 'ocupado', observacoes: `Ocupado por ${jose.nome}` },
    { numero: 'B-08', status: 'ocupado', observacoes: `Ocupado por ${ana.nome}` },
    { numero: 'B-12', status: 'ocupado', observacoes: `Ocupado por ${carlos.nome}` },
    { numero: 'C-01', status: 'disponivel', observacoes: 'Pronto para admissao.' },
    { numero: 'C-02', status: 'manutencao', observacoes: 'Troca preventiva de colchao.' },
  ].map((bed) => ({ ...bed, empresaId: empresa.id })), { returning: true });

  await Pet.bulkCreate([
    { empresaId: empresa.id, nome: 'Luna', especie: 'cao', raca: 'SRD', tutorNome: 'Projeto Terapia Assistida', observacoes: 'Animal de apoio em atividades supervisionadas.' },
    { empresaId: empresa.id, nome: 'Mimo', especie: 'gato', raca: 'Siamês', tutorNome: 'Projeto Terapia Assistida', observacoes: 'Visitas apenas em areas autorizadas.' },
  ]);

  const stock = await EstoqueItem.bulkCreate([
    { nome: 'Dipirona 500 mg', descricao: 'Comprimido para analgesia.', tipo: 'medicamento', categoria: 'analgesico', unidade: 'caixa', quantidade: 120, quantidadeMinima: 30, valorUnitario: 12.5, localizacao: 'Armario A', lote: 'DIP-2607', validade: daysFromBase(180), ativo: true },
    { nome: 'Luvas nitrilicas M', descricao: 'EPI descartavel.', tipo: 'material', categoria: 'epi', unidade: 'caixa', quantidade: 8, quantidadeMinima: 12, valorUnitario: 38.9, localizacao: 'Almoxarifado', lote: 'LUV-2606', validade: daysFromBase(365), ativo: true },
    { nome: 'Espessante alimentar', descricao: 'Uso para disfagia.', tipo: 'suplemento', categoria: 'nutricao', unidade: 'lata', quantidade: 24, quantidadeMinima: 6, valorUnitario: 29.9, localizacao: 'Armario B', lote: 'ESP-2605', validade: daysFromBase(90), ativo: true },
    { nome: 'Curativo hidrocoloide', descricao: 'Cobertura avancada.', tipo: 'material', categoria: 'curativo', unidade: 'unidade', quantidade: 3, quantidadeMinima: 5, valorUnitario: 18.4, localizacao: 'Armario C', lote: 'CUR-2604', validade: daysFromBase(-10), ativo: false },
  ].map((item) => ({ ...item, empresaId: empresa.id })), { returning: true });

  await EstoqueMovimentacao.bulkCreate([
    { estoqueItemId: stock[0].id, usuarioId: byRole.admin.id, tipo: 'entrada', quantidade: 30, quantidadeAnterior: 90, quantidadeNova: 120, valorUnitario: 12.5, valorTotal: 375, motivo: 'Reposicao mensal', dataMovimentacao: daysFromBase(-5) },
    { estoqueItemId: stock[1].id, usuarioId: byRole.enfermeiro.id, tipo: 'saida', quantidade: 4, quantidadeAnterior: 12, quantidadeNova: 8, valorUnitario: 38.9, valorTotal: 155.6, motivo: 'Uso assistencial', dataMovimentacao: daysFromBase(-2) },
    { estoqueItemId: stock[2].id, usuarioId: byRole.nutricionista.id, tipo: 'saida', quantidade: 2, quantidadeAnterior: 26, quantidadeNova: 24, valorUnitario: 29.9, valorTotal: 59.8, motivo: 'Plano para disfagia', dataMovimentacao: daysFromBase(-1) },
    { estoqueItemId: stock[3].id, usuarioId: byRole.admin.id, tipo: 'ajuste', quantidade: -2, quantidadeAnterior: 5, quantidadeNova: 3, valorUnitario: 18.4, valorTotal: -36.8, motivo: 'Validade expirada', dataMovimentacao: daysFromBase(0), observacoes: 'Cenario de estoque inativo.' },
  ].map((movement) => ({ ...movement, empresaId: empresa.id })), { returning: true });

  await FinanceiroTransacao.bulkCreate([
    { pacienteId: maria.id, usuarioId: byRole.admin.id, tipo: 'receita', categoria: 'mensalidade', descricao: 'Mensalidade de Maria - julho', valor: 6800, dataVencimento: daysFromBase(-5), dataPagamento: daysFromBase(-4), status: 'pago', formaPagamento: 'pix', recorrente: true, periodoRecorrencia: 'mensal' },
    { pacienteId: jose.id, usuarioId: byRole.admin.id, tipo: 'receita', categoria: 'convenio', descricao: 'Repasse de convenio - Jose', valor: 3200, dataVencimento: daysFromBase(5), status: 'pendente', formaPagamento: 'boleto', recorrente: false },
    { usuarioId: byRole.admin.id, tipo: 'despesa', categoria: 'fornecedores', descricao: 'Compra de EPIs', valor: 985.4, dataVencimento: daysFromBase(2), status: 'pendente', formaPagamento: 'transferencia', recorrente: false },
    { usuarioId: byRole.admin.id, tipo: 'despesa', categoria: 'manutencao', descricao: 'Manutencao do leito C-02', valor: 460, dataVencimento: daysFromBase(-3), dataPagamento: daysFromBase(-3), status: 'pago', formaPagamento: 'cartao', recorrente: false },
  ].map((transaction) => ({ ...transaction, empresaId: empresa.id })), { returning: true });

  const catalog = await CatalogoItem.bulkCreate([
    { tipo: 'produto', nome: 'Kit de curativo avancado', descricao: 'Insumos para cuidado de lesao.', categoria: 'clinica', sku: 'KIT-CUR-001', preco: 89.5, estoqueAtual: 7, estoqueMinimo: 4, unidade: 'kit', ativo: true },
    { tipo: 'servico', nome: 'Sessao de fisioterapia domiciliar', descricao: 'Atendimento funcional individual.', categoria: 'fisioterapia', sku: 'FISIO-DOM-001', preco: 220, estoqueAtual: 0, estoqueMinimo: 0, unidade: 'sessao', ativo: true },
    { tipo: 'produto', nome: 'Suplemento nutricional', descricao: 'Suporte calórico proteico.', categoria: 'nutricao', sku: 'SUP-NUT-001', preco: 149.9, estoqueAtual: 2, estoqueMinimo: 5, unidade: 'lata', ativo: true },
  ].map((item) => ({ ...item, empresaId: empresa.id })), { returning: true });

  const orders = await Pedido.bulkCreate([
    { pacienteId: rafael.id, clienteNome: rafael.nome, origem: 'balcao', status: 'faturado', pagamentoStatus: 'pago', subtotal: 220, desconto: 0, total: 220, observacoes: 'Servico concluido.' },
    { pacienteId: ana.id, clienteNome: 'Responsavel por Ana Luiza', origem: 'online', status: 'aberto', pagamentoStatus: 'pendente', subtotal: 239.4, desconto: 20, total: 219.4, observacoes: 'Aguardando confirmacao de pagamento.' },
  ].map((order) => ({ ...order, empresaId: empresa.id })), { returning: true });

  await PedidoItem.bulkCreate([
    { pedidoId: orders[0].id, catalogoItemId: catalog[1].id, tipo: 'servico', descricao: catalog[1].nome, quantidade: 1, valorUnitario: 220, total: 220 },
    { pedidoId: orders[1].id, catalogoItemId: catalog[0].id, tipo: 'produto', descricao: catalog[0].nome, quantidade: 1, valorUnitario: 89.5, total: 89.5 },
    { pedidoId: orders[1].id, catalogoItemId: catalog[2].id, tipo: 'produto', descricao: catalog[2].nome, quantidade: 1, valorUnitario: 149.9, total: 149.9 },
  ]);

  await Pagamento.bulkCreate([
    { empresaId: empresa.id, pedidoId: orders[0].id, metodo: 'pix', gateway: 'sandbox', status: 'aprovado', valor: 220, pagoEm: daysFromBase(0) },
    { empresaId: empresa.id, pedidoId: orders[1].id, metodo: 'cartao', gateway: 'sandbox', status: 'pendente', valor: 219.4 },
  ]);

  const invoice = await NotaFiscal.create({
    empresaId: empresa.id,
    pedidoId: orders[0].id,
    tipoDocumento: 'nfs-e',
    status: 'simulada',
    numero: 'SIM-2026-0001',
    serie: '1',
    chaveAcesso: 'SIM202600000001VALIDACAO',
    provedor: 'sandbox-interno',
    ambiente: 'homologacao',
    payload: { pedidoId: orders[0].id, total: 220, scenario: 'seed-validation' },
    resposta: { status: 'accepted', simulated: true },
    emitidaEm: daysFromBase(0),
  });

  await NotaFiscalLog.bulkCreate([
    { empresaId: empresa.id, notaFiscalId: invoice.id, nivel: 'info', mensagem: 'Nota criada pelo seed de validacao.', detalhes: { scenario: 'success' } },
    { empresaId: empresa.id, notaFiscalId: invoice.id, nivel: 'warning', mensagem: 'Webhook externo nao e chamado no ambiente de seed.', detalhes: { scenario: 'external-api-simulated' } },
  ]);

  await EmpresaSequencia.bulkCreate([
    { tipoSistema: 'casa-repouso', ultimoNumero: 120 },
    { tipoSistema: 'fisioterapia', ultimoNumero: 45 },
    { tipoSistema: 'petshop', ultimoNumero: 12 },
  ]);

  await Promise.all([
    verifyCount('empresas', Empresa, expectedCounts.empresas),
    verifyCount('usuarios', Usuario, expectedCounts.usuarios),
    verifyCount('pacientes', Paciente, expectedCounts.pacientes),
    verifyCount('prescricoes', Prescricao, expectedCounts.prescricoes),
    verifyCount('agendamentos', Agendamento, expectedCounts.agendamentos),
    verifyCount('registros', RegistroEnfermagem, expectedCounts.registrosEnfermagem),
    verifyCount('sessoes', SessaoFisio, expectedCounts.sessoesFisio),
    verifyCount('leitos', CasaRepousoLeito, expectedCounts.leitos),
    verifyCount('pets', Pet, expectedCounts.pets),
    verifyCount('estoque', EstoqueItem, expectedCounts.estoque),
    verifyCount('movimentacoes', EstoqueMovimentacao, expectedCounts.movimentacoes),
    verifyCount('financeiro', FinanceiroTransacao, expectedCounts.financeiro),
    verifyCount('catalogo', CatalogoItem, expectedCounts.catalogo),
    verifyCount('pedidos', Pedido, expectedCounts.pedidos),
    verifyCount('pedido itens', PedidoItem, expectedCounts.pedidoItens),
    verifyCount('pagamentos', Pagamento, expectedCounts.pagamentos),
    verifyCount('notas', NotaFiscal, expectedCounts.notas),
    verifyCount('nota logs', NotaFiscalLog, expectedCounts.notaLogs),
    verifyCount('sequencias', EmpresaSequencia, expectedCounts.sequencias),
  ]);

  console.log('Seed de validacao concluido.');
  console.log('Login de todos os perfis: <role>@validacao.local / Teste@2026');
  console.log('Superadmin: superadmin@validacao.local / Teste@2026');
  console.log('Cinco pacientes e todos os domínios foram criados com dados ficticios.');
}

seedValidationData()
  .catch((error) => {
    console.error(`Seed de validacao falhou: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });