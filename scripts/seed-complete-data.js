/**
 * Seed completo (PostgreSQL)
 * - Compatível com o schema atual dos models (Sequelize)
 * - Multi-tenant: preenche empresaId em praticamente tudo
 * - Gera credenciais alinhadas com scripts de teste
 *
 * Uso:
 *   node scripts/seed-complete-data.js
 */
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
} from '../models/index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isoDateDaysFromNow(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function safeTruncate(model) {
  try {
    await model.truncate({ cascade: true, restartIdentity: true });
  } catch {
    await model.truncate();
  }
}

async function seedCompleteData() {
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    console.error('❌ PostgreSQL não configurado. Defina DATABASE_URL ou PGHOST/PGUSER/PGPASSWORD/PGDATABASE no .env.');
    process.exitCode = 1;
    return;
  }

  console.log('🚀 Iniciando seed completo (PostgreSQL)...');

  // Conectar e garantir schema
  await sequelize.authenticate();
  if (process.env.NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true });
  } else {
    await sequelize.sync();
  }

  console.log('🧹 Limpando banco de dados (truncate)...');
  // Ordem: dependentes primeiro
  await safeTruncate(NotaFiscalLog);
  await safeTruncate(NotaFiscal);
  await safeTruncate(Pagamento);
  await safeTruncate(PedidoItem);
  await safeTruncate(Pedido);
  await safeTruncate(EstoqueMovimentacao);
  await safeTruncate(FinanceiroTransacao);
  await safeTruncate(RegistroEnfermagem);
  await safeTruncate(Agendamento);
  await safeTruncate(Prescricao);
  await safeTruncate(SessaoFisio);
  await safeTruncate(Pet);
  await safeTruncate(EstoqueItem);
  await safeTruncate(CasaRepousoLeito);
  await safeTruncate(CatalogoItem);
  await safeTruncate(Paciente);
  await safeTruncate(Usuario);
  await safeTruncate(Empresa);
  console.log('✅ Banco limpo');

  console.log('🏢 Criando empresa...');
  const empresa = await Empresa.create({
    nome: 'Casa de Repouso Vida Plena',
    tipoSistema: 'casa-repouso',
    cnpj: '12345678000199',
    email: 'contato@vidaplena.com.br',
    telefone: '(11) 3456-7890',
    endereco: 'Rua das Palmeiras, 1000 - São Paulo/SP',
    plano: 'profissional',
    ativo: true,
  });

  console.log('👥 Criando usuários...');
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  const senhaPadrao = await bcrypt.hash('teste123', 10);
  const senhaSuper = await bcrypt.hash('super123', 10);

  const [superadmin, admin, nutricionista, enfermeiro, fisioterapeuta, atendente] = await Usuario.bulkCreate(
    [
      {
        nome: 'Super Admin',
        email: 'superadmin@prescrimed.com',
        senha: senhaSuper,
        role: 'superadmin',
        contato: '(11) 88888-8888',
        empresaId: null,
        ativo: true,
      },
      {
        nome: 'Administrador Sistema',
        email: 'admin@prescrimed.com',
        senha: senhaAdmin,
        role: 'admin',
        contato: '(11) 99999-9999',
        empresaId: empresa.id,
        ativo: true,
      },
      {
        nome: 'Nutri. João Silva',
        email: 'joao.nutri@prescrimed.com',
        senha: senhaPadrao,
        role: 'nutricionista',
        especialidade: 'Nutrição Clínica',
        crm: '123456',
        crmUf: 'SP',
        contato: '(11) 90000-0001',
        empresaId: empresa.id,
        ativo: true,
      },
      {
        nome: 'Enf. Ana Costa',
        email: 'ana.enf@prescrimed.com',
        senha: senhaPadrao,
        role: 'enfermeiro',
        especialidade: 'Enfermagem',
        contato: '(11) 90000-0002',
        empresaId: empresa.id,
        ativo: true,
      },
      {
        nome: 'Ft. Julia Oliveira',
        email: 'julia.fisio@prescrimed.com',
        senha: senhaPadrao,
        role: 'fisioterapeuta',
        especialidade: 'Fisioterapia Motora',
        contato: '(11) 90000-0003',
        empresaId: empresa.id,
        ativo: true,
      },
      {
        nome: 'Atendente Roberto Lima',
        email: 'roberto.atend@prescrimed.com',
        senha: senhaPadrao,
        role: 'atendente',
        contato: '(11) 90000-0004',
        empresaId: empresa.id,
        ativo: true,
      },
    ],
    { returning: true }
  );

  console.log('🧑‍🦳 Criando pacientes...');
  const pacientesPayload = Array.from({ length: 10 }).map((_, i) => {
    const cpf = onlyDigits(`0000000000${i + 1}`).slice(-11);
    return {
      nome: `Paciente ${String(i + 1).padStart(2, '0')}`,
      cpf,
      dataNascimento: `19${70 + (i % 20)}-0${(i % 9) + 1}-15`,
      telefone: `(11) 3${450 + i}-7${800 + i}`,
      email: `paciente${i + 1}@email.com`,
      endereco: 'São Paulo/SP',
      empresaId: empresa.id,
      observacoes: i % 3 === 0 ? 'Paciente com acompanhamento contínuo.' : null,
    };
  });
  const pacientes = await Paciente.bulkCreate(pacientesPayload, { returning: true });

  console.log('💊 Criando prescrições...');
  const prescricoesPayload = pacientes.slice(0, 3).map((p, idx) => ({
    pacienteId: p.id,
    nutricionistaId: nutricionista.id,
    empresaId: empresa.id,
    tipo: idx === 2 ? 'mista' : 'nutricional',
    descricao: `Plano alimentar para ${p.nome}`,
    observacoes: 'Reavaliar em 7 dias.',
    itens: [
      { item: 'Hidratação', recomendacao: '2L/dia' },
      { item: 'Proteína', recomendacao: 'Ajustar conforme avaliação' },
    ],
    status: 'ativa',
  }));
  await Prescricao.bulkCreate(prescricoesPayload);

  console.log('📅 Criando agendamentos...');
  const agendamentosPayload = pacientes.slice(0, 5).map((p, idx) => ({
    pacienteId: p.id,
    empresaId: empresa.id,
    usuarioId: atendente.id,
    titulo: `Consulta de rotina - ${p.nome}`,
    descricao: 'Avaliação e atualização de prontuário.',
    dataHora: isoDateDaysFromNow(idx + 1),
    duracao: 60,
    tipo: 'Consulta',
    status: 'agendado',
    local: 'Unidade SP',
    participante: p.nome,
    observacoes: idx % 2 === 0 ? 'Trazer exames recentes.' : null,
  }));
  await Agendamento.bulkCreate(agendamentosPayload);

  console.log('🏥 Criando registros de enfermagem...');
  const registrosPayload = pacientes.slice(0, 5).map((p, idx) => ({
    pacienteId: p.id,
    usuarioId: enfermeiro.id,
    empresaId: empresa.id,
    tipo: idx % 2 === 0 ? 'sinais_vitais' : 'evolucao',
    titulo: idx % 2 === 0 ? 'Sinais vitais aferidos' : 'Evolução diária',
    descricao:
      idx % 2 === 0
        ? 'Aferição de sinais vitais sem intercorrências.'
        : 'Paciente estável, mantendo plano de cuidados.',
    sinaisVitais:
      idx % 2 === 0
        ? JSON.stringify({ PA: '120/80', FC: 72, FR: 16, Temp: 36.6, SatO2: 98, Glicemia: 98 })
        : null,
    riscoQueda: idx % 3 === 0 ? 'medio' : 'baixo',
    riscoLesao: idx % 4 === 0 ? 'medio' : 'baixo',
    estadoGeral: 'bom',
    alerta: false,
    prioridade: 'baixa',
    observacoes: idx % 3 === 0 ? 'Manter hidratação.' : null,
    anexos: null,
  }));
  await RegistroEnfermagem.bulkCreate(registrosPayload);

  console.log('🧘 Criando sessões de fisioterapia...');
  const sessoesPayload = pacientes.slice(0, 5).map((p, idx) => ({
    empresaId: empresa.id,
    pacienteId: p.id,
    protocolo: idx % 2 === 0 ? 'Alongamento e mobilidade' : 'Fortalecimento leve',
    dataHora: isoDateDaysFromNow(idx + 1),
    duracao: 45,
    observacoes: 'Sessão padrão. Ajustar conforme evolução.',
  }));
  await SessaoFisio.bulkCreate(sessoesPayload);

  console.log('🛏️ Criando leitos (casa de repouso)...');
  const leitosPayload = Array.from({ length: 10 }).map((_, i) => ({
    empresaId: empresa.id,
    numero: `L-${String(i + 1).padStart(2, '0')}`,
    status: i % 7 === 0 ? 'manutencao' : i % 3 === 0 ? 'ocupado' : 'disponivel',
    observacoes: i % 7 === 0 ? 'Manutenção preventiva.' : null,
  }));
  await CasaRepousoLeito.bulkCreate(leitosPayload);

  console.log('🐶 Criando pets (módulo petshop)...');
  const petsPayload = [
    { nome: 'Thor', especie: 'Cão', raca: 'Labrador', tutorNome: 'Marcos', observacoes: null },
    { nome: 'Mia', especie: 'Gato', raca: 'SRD', tutorNome: 'Juliana', observacoes: 'Vacina anual em dia.' },
    { nome: 'Nina', especie: 'Cão', raca: 'Poodle', tutorNome: 'Carla', observacoes: null },
    { nome: 'Bob', especie: 'Cão', raca: 'Vira-lata', tutorNome: 'Renato', observacoes: null },
    { nome: 'Luna', especie: 'Gato', raca: 'Siamês', tutorNome: 'Paula', observacoes: null },
  ].map((p) => ({ ...p, empresaId: empresa.id }));
  await Pet.bulkCreate(petsPayload);

  console.log('📦 Criando itens de estoque...');
  const itensEstoque = await EstoqueItem.bulkCreate(
    [
      {
        empresaId: empresa.id,
        nome: 'Dipirona 500mg',
        descricao: 'Comprimidos',
        tipo: 'medicamento',
        categoria: 'analgésico',
        unidade: 'cx',
        quantidade: 120,
        quantidadeMinima: 30,
        valorUnitario: 12.5,
        localizacao: 'Armário A',
        lote: 'DIP-2026-01',
        validade: isoDateDaysFromNow(180),
        ativo: true,
      },
      {
        empresaId: empresa.id,
        nome: 'Luvas descartáveis',
        descricao: 'Tamanho M',
        tipo: 'material',
        categoria: 'epi',
        unidade: 'pct',
        quantidade: 80,
        quantidadeMinima: 20,
        valorUnitario: 18.9,
        localizacao: 'Almoxarifado',
        lote: 'LUV-2026-02',
        validade: isoDateDaysFromNow(365),
        ativo: true,
      },
      {
        empresaId: empresa.id,
        nome: 'Suplemento Nutricional',
        descricao: 'Uso oral',
        tipo: 'alimento',
        categoria: 'suplemento',
        unidade: 'un',
        quantidade: 40,
        quantidadeMinima: 10,
        valorUnitario: 9.9,
        localizacao: 'Armário B',
        lote: 'SUP-2026-03',
        validade: isoDateDaysFromNow(120),
        ativo: true,
      },
    ],
    { returning: true }
  );

  console.log('🔁 Criando movimentações de estoque...');
  const movsPayload = itensEstoque.slice(0, 2).map((item, idx) => ({
    empresaId: empresa.id,
    estoqueItemId: item.id,
    usuarioId: admin.id,
    tipo: idx % 2 === 0 ? 'entrada' : 'saida',
    quantidade: idx % 2 === 0 ? 10 : 5,
    quantidadeAnterior: item.quantidade,
    quantidadeNova: idx % 2 === 0 ? Number(item.quantidade) + 10 : Number(item.quantidade) - 5,
    valorUnitario: item.valorUnitario,
    valorTotal: idx % 2 === 0 ? 10 * Number(item.valorUnitario) : 5 * Number(item.valorUnitario),
    motivo: idx % 2 === 0 ? 'Reposição' : 'Uso interno',
    observacoes: null,
    dataMovimentacao: new Date(),
  }));
  await EstoqueMovimentacao.bulkCreate(movsPayload);

  console.log('💰 Criando transações financeiras...');
  await FinanceiroTransacao.bulkCreate([
    {
      empresaId: empresa.id,
      pacienteId: pacientes[0].id,
      usuarioId: admin.id,
      tipo: 'receita',
      categoria: 'mensalidade',
      descricao: 'Mensalidade - Janeiro',
      valor: 1800.0,
      dataVencimento: isoDateDaysFromNow(7),
      dataPagamento: null,
      status: 'pendente',
      formaPagamento: 'pix',
      recorrente: true,
      periodoRecorrencia: 'mensal',
      observacoes: null,
    },
    {
      empresaId: empresa.id,
      pacienteId: null,
      usuarioId: admin.id,
      tipo: 'despesa',
      categoria: 'fornecedores',
      descricao: 'Compra de materiais',
      valor: 650.35,
      dataVencimento: isoDateDaysFromNow(3),
      dataPagamento: isoDateDaysFromNow(2),
      status: 'pago',
      formaPagamento: 'boleto',
      recorrente: false,
      periodoRecorrencia: null,
      observacoes: 'NF emitida',
    },
  ]);

  console.log('🛒 Criando catálogo comercial...');
  const catalogo = await CatalogoItem.bulkCreate([
    {
      empresaId: empresa.id,
      tipo: 'produto',
      nome: 'Suplemento Premium Pet 1kg',
      descricao: 'Linha petshop com foco em recuperação nutricional.',
      categoria: 'petshop',
      sku: 'PET-SUP-001',
      preco: 149.90,
      estoqueAtual: 18,
      estoqueMinimo: 5,
      unidade: 'un',
      ativo: true,
    },
    {
      empresaId: empresa.id,
      tipo: 'servico',
      nome: 'Sessão de fisioterapia domiciliar',
      descricao: 'Atendimento personalizado com protocolo funcional.',
      categoria: 'fisioterapia',
      sku: 'FISIO-DOM-001',
      preco: 220.00,
      estoqueAtual: 0,
      estoqueMinimo: 0,
      unidade: 'sessão',
      ativo: true,
    },
    {
      empresaId: empresa.id,
      tipo: 'produto',
      nome: 'Kit curativo avançado',
      descricao: 'Insumos para atendimento e evolução clínica.',
      categoria: 'clinica',
      sku: 'CLIN-KIT-001',
      preco: 89.50,
      estoqueAtual: 7,
      estoqueMinimo: 4,
      unidade: 'kit',
      ativo: true,
    }
  ], { returning: true });

  console.log('🧾 Criando pedidos, pagamentos e notas fiscais simuladas...');
  const pedidoPago = await Pedido.create({
    empresaId: empresa.id,
    pacienteId: pacientes[0].id,
    clienteNome: pacientes[0].nome,
    origem: 'balcao',
    status: 'faturado',
    pagamentoStatus: 'pago',
    subtotal: 220,
    desconto: 0,
    total: 220,
    observacoes: 'Pedido seed com baixa financeira e nota simulada.'
  });

  const pedidoPendente = await Pedido.create({
    empresaId: empresa.id,
    pacienteId: pacientes[1].id,
    clienteNome: pacientes[1].nome,
    origem: 'online',
    status: 'aberto',
    pagamentoStatus: 'pendente',
    subtotal: 149.90,
    desconto: 0,
    total: 149.90,
    observacoes: 'Pedido seed aguardando webhook de pagamento.'
  });

  await PedidoItem.bulkCreate([
    {
      pedidoId: pedidoPago.id,
      catalogoItemId: catalogo[1].id,
      tipo: 'servico',
      descricao: catalogo[1].nome,
      quantidade: 1,
      valorUnitario: 220,
      total: 220,
    },
    {
      pedidoId: pedidoPendente.id,
      catalogoItemId: catalogo[0].id,
      tipo: 'produto',
      descricao: catalogo[0].nome,
      quantidade: 1,
      valorUnitario: 149.90,
      total: 149.90,
    }
  ]);

  await Pagamento.bulkCreate([
    {
      empresaId: empresa.id,
      pedidoId: pedidoPago.id,
      metodo: 'pix',
      gateway: 'manual',
      status: 'aprovado',
      valor: 220,
      pagoEm: new Date(),
    },
    {
      empresaId: empresa.id,
      pedidoId: pedidoPendente.id,
      metodo: 'cartao',
      gateway: 'checkout',
      status: 'pendente',
      valor: 149.90,
    }
  ]);

  const nota = await NotaFiscal.create({
    empresaId: empresa.id,
    pedidoId: pedidoPago.id,
    tipoDocumento: 'nfs-e',
    status: 'simulada',
    numero: `SIM-${String(Date.now()).slice(-6)}`,
    serie: '1',
    chaveAcesso: `SIM${pedidoPago.id.replace(/-/g, '').slice(0, 24)}`,
    provedor: 'simulacao-interna',
    ambiente: 'homologacao',
    payload: { pedidoId: pedidoPago.id, total: 220 },
    resposta: { mode: 'simulation' },
    emitidaEm: new Date(),
  });

  await NotaFiscalLog.create({
    empresaId: empresa.id,
    notaFiscalId: nota.id,
    nivel: 'warning',
    mensagem: 'Nota fiscal criada em modo simulado pelo seed completo.',
    detalhes: { pedidoId: pedidoPago.id }
  });

  await FinanceiroTransacao.create({
    empresaId: empresa.id,
    pacienteId: pacientes[0].id,
    usuarioId: admin.id,
    tipo: 'receita',
    categoria: 'vendas',
    descricao: `Pedido ${pedidoPago.id.slice(0, 8)} - ${pacientes[0].nome}`,
    valor: 220,
    dataVencimento: new Date(),
    dataPagamento: new Date(),
    status: 'pago',
    formaPagamento: 'pix',
    observacoes: 'Receita gerada pelo fluxo comercial/fiscal seed.'
  });

  await sleep(200);

  console.log('\n✅ Seed completo finalizado.');
  console.log('🔐 Credenciais (login):');
  console.log('  admin@prescrimed.com / admin123');
  console.log('  superadmin@prescrimed.com / super123');
  console.log('  joao.nutri@prescrimed.com / teste123');
  console.log('  ana.enf@prescrimed.com / teste123');
  console.log('  julia.fisio@prescrimed.com / teste123');
  console.log('  roberto.atend@prescrimed.com / teste123');
  console.log('🧾 Fluxo comercial seedado: catálogo, 2 pedidos, 2 pagamentos e 1 nota fiscal simulada.');
}

seedCompleteData()
  .then(async () => {
    try {
      await sequelize.close();
    } catch {}
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Seed falhou:', error?.message || error);
    try {
      await sequelize.close();
    } catch {}
    process.exit(1);
  });
