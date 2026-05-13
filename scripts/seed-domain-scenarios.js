import { Op } from 'sequelize';
import { sequelize, Empresa, Usuario, Paciente, Prescricao, EstoqueItem, EstoqueMovimentacao, RegistroEnfermagem, FinanceiroTransacao } from '../models/index.js';

async function ensureEstoqueItem(empresaId, data) {
  let item = await EstoqueItem.findOne({ where: { empresaId, nome: data.nome } });
  if (!item) {
    item = await EstoqueItem.create({ empresaId, ativo: true, ...data });
    console.log(`   ✅ Item criado: ${data.nome}`);
  }
  return item;
}

async function movimentarEstoque({ empresaId, item, tipo, quantidade, valorUnitario, motivo, usuarioId }) {
  const qAnterior = Number(item.quantidade || 0);
  const qNova = tipo === 'entrada' ? qAnterior + quantidade : tipo === 'saida' ? qAnterior - quantidade : quantidade;
  await item.update({ quantidade: qNova });
  await EstoqueMovimentacao.create({
    empresaId,
    estoqueItemId: item.id,
    usuarioId: usuarioId || null,
    tipo,
    quantidade,
    quantidadeAnterior: qAnterior,
    quantidadeNova: qNova,
    valorUnitario: valorUnitario ?? null,
    valorTotal: valorUnitario ? (quantidade * valorUnitario) : null,
    motivo: motivo || null,
    observacoes: 'Seed de cenário real',
    dataMovimentacao: new Date()
  });
  console.log(`   🔄 Movimentação ${tipo}: ${quantidade} ${item.unidade} de ${item.nome}`);
}

async function seedEmpresa(empresa) {
  console.log(`\n🏢 Cenários para: ${empresa.nome}`);
  const admin = await Usuario.findOne({ where: { empresaId: empresa.id, role: { [Op.in]: ['admin','fisioterapeuta','enfermeiro','atendente'] } }, order: [['createdAt','ASC']] });
  const paciente = await Paciente.findOne({ where: { empresaId: empresa.id }, order: [['createdAt','ASC']] });
  if (!admin || !paciente) {
    console.log('   ⚠️ Empresa sem admin ou paciente — pulando.');
    return;
  }

  // Prescrição
  const prescExists = await Prescricao.findOne({ where: { empresaId: empresa.id, pacienteId: paciente.id } });
  if (!prescExists) {
    await Prescricao.create({
      empresaId: empresa.id,
      pacienteId: paciente.id,
      nutricionistaId: admin.id,
      tipo: 'mista',
      descricao: 'Plano inicial de cuidados e medicação',
      observacoes: 'Reavaliar em 7 dias',
      itens: [
        { tipo: 'medicamento', nome: 'Paracetamol 750mg', posologia: '1 comprimido de 8/8h', duracaoDias: 5 },
        { tipo: 'dieta', nome: 'Dieta branda', observacao: 'Fracionar em 5x ao dia' }
      ],
      status: 'ativa'
    });
    console.log('   ✅ Prescrição criada');
  } else {
    console.log('   ℹ️ Prescrição já existe (pelo menos uma)');
  }

  // Estoque: itens e movimentações
  const item1 = await ensureEstoqueItem(empresa.id, { nome: 'Paracetamol 750mg', tipo: 'medicamento', categoria: 'Analgésicos', unidade: 'un', quantidade: 0, valorUnitario: 1.65, localizacao: 'Armário A' });
  const item2 = await ensureEstoqueItem(empresa.id, { nome: 'Luvas descartáveis M', tipo: 'material', categoria: 'EPIs', unidade: 'cx', quantidade: 0, valorUnitario: 12.50, localizacao: 'Depósito 1' });
  // Entradas
  await movimentarEstoque({ empresaId: empresa.id, item: item1, tipo: 'entrada', quantidade: 100, valorUnitario: 1.65, motivo: 'Compra inicial', usuarioId: admin.id });
  await movimentarEstoque({ empresaId: empresa.id, item: item2, tipo: 'entrada', quantidade: 10, valorUnitario: 12.50, motivo: 'Compra inicial', usuarioId: admin.id });
  // Saídas
  await movimentarEstoque({ empresaId: empresa.id, item: item1, tipo: 'saida', quantidade: 5, valorUnitario: 1.65, motivo: `Dispensação p/ ${paciente.nome}`, usuarioId: admin.id });

  // Evolução (Registro de Enfermagem)
  const evolucao = await RegistroEnfermagem.create({
    empresaId: empresa.id,
    pacienteId: paciente.id,
    usuarioId: admin.id,
    tipo: 'evolucao',
    titulo: 'Evolução de Enfermagem',
    descricao: 'Paciente apresenta quadro estável, sem queixas álgicas no período. Deambulou com auxílio. Alimentação aceita.',
    sinaisVitais: JSON.stringify({ PA: '120x80', FC: 78, FR: 16, Temp: 36.6, SatO2: 98 }),
    riscoQueda: 'medio',
    riscoLesao: 'baixo',
    estadoGeral: 'bom',
    alerta: false,
    prioridade: 'baixa',
    observacoes: 'Orientado sobre medicação e higiene das mãos',
    anexos: JSON.stringify([])
  });
  console.log('   ✅ Evolução registrada');

  // Financeiro: receita e despesa
  const hoje = new Date();
  const venc = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()+7);
  await FinanceiroTransacao.create({
    empresaId: empresa.id,
    pacienteId: paciente.id,
    usuarioId: admin.id,
    tipo: 'receita',
    categoria: 'Mensalidade',
    descricao: `Mensalidade - ${paciente.nome}`,
    valor: 2500.00,
    dataVencimento: venc,
    dataPagamento: null,
    status: 'pendente',
    formaPagamento: 'boleto',
    observacoes: 'Emitir boleto automático',
    recorrente: true,
    periodoRecorrencia: 'mensal'
  });
  await FinanceiroTransacao.create({
    empresaId: empresa.id,
    pacienteId: null,
    usuarioId: admin.id,
    tipo: 'despesa',
    categoria: 'Insumos',
    descricao: 'Compra de EPIs (luvas, máscaras)',
    valor: 350.00,
    dataVencimento: hoje,
    dataPagamento: hoje,
    status: 'pago',
    formaPagamento: 'cartao',
    observacoes: 'NF-e armazenada',
    recorrente: false,
    periodoRecorrencia: null
  });
  console.log('   ✅ Financeiro: receita + despesa criadas');
}

async function main() {
  try {
    console.log('📡 Conectando...');
    await sequelize.authenticate();
    console.log('✅ Conectado. Executando cenários reais...');
    const empresas = await Empresa.findAll();
    if (!empresas.length) {
      console.log('⚠️ Nenhuma empresa encontrada. Rode primeiro scripts/seed-multi-company.js');
      process.exit(0);
    }
    for (const emp of empresas) {
      await seedEmpresa(emp);
    }
    console.log('\n🎉 Cenários concluídos.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha nos cenários:', err);
    process.exit(1);
  }
}

main();