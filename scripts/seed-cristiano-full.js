/**
 * Seed completo para empresa "Canto do Sossego" - cristiano@prescrimed.com.br
 * Popula todos os módulos: pacientes, agendamentos, prescrições, estoque,
 * financeiro, enfermagem, fisioterapia, comercial, evolução
 */

import dotenv from 'dotenv';
dotenv.config();

import { sequelize, Usuario, Empresa, Paciente, Prescricao, Agendamento,
  EstoqueItem, EstoqueMovimentacao, FinanceiroTransacao, RegistroEnfermagem,
  SessaoFisio, CatalogoItem, Pedido, PedidoItem, Pagamento } from '../models/index.js';
import bcrypt from 'bcryptjs';

const EMPRESA_ID = '49814b2d-dea8-49d4-9b0b-0178b06020bb';
const USUARIO_ID = '8d937f8b-bbc2-4f70-ae1e-c5a527ddc0a4';

const log = (msg, ok = true) => console.log(ok ? `  ✅ ${msg}` : `  ❌ ${msg}`);

async function clearExisting() {
  console.log('\n🗑️  Limpando dados antigos da empresa...');
  await RegistroEnfermagem.destroy({ where: { empresaId: EMPRESA_ID } });
  await SessaoFisio.destroy({ where: { empresaId: EMPRESA_ID } });
  await EstoqueMovimentacao.destroy({ where: { empresaId: EMPRESA_ID } });
  await EstoqueItem.destroy({ where: { empresaId: EMPRESA_ID } });
  await FinanceiroTransacao.destroy({ where: { empresaId: EMPRESA_ID } });
  await Agendamento.destroy({ where: { empresaId: EMPRESA_ID } });
  await Prescricao.destroy({ where: { empresaId: EMPRESA_ID } });
  // Itens comerciais
  try {
    await PedidoItem.destroy({ where: {} }); // limpa vinculados
    await Pagamento.destroy({ where: { empresaId: EMPRESA_ID } });
    await Pedido.destroy({ where: { empresaId: EMPRESA_ID } });
    await CatalogoItem.destroy({ where: { empresaId: EMPRESA_ID } });
  } catch (_) { /* pode não ter dados */ }
  await Paciente.destroy({ where: { empresaId: EMPRESA_ID } });
  log('Dados antigos removidos');
}

async function fixUsuarioPermissoes() {
  console.log('\n👤 Atualizando permissões do usuário Cristiano...');
  const permissoes = [
    'dashboard','pacientes','agendamentos','prescricoes','estoque',
    'financeiro','enfermagem','fisioterapia','comercial','usuarios',
    'configuracoes','relatorios','evolucao'
  ];
  await Usuario.update({ permissoes }, { where: { id: USUARIO_ID } });
  log('Permissões atualizadas: todos os módulos');
}

async function seedPacientes() {
  console.log('\n👥 Criando pacientes...');
  const pacientesData = [
    { nome: 'Ana Beatriz Costa', cpf: '111.222.333-01', dataNascimento: '1942-03-15', email: 'ana.costa@email.com', telefone: '71999001001', endereco: 'Rua das Flores, 12, Salvador-BA', observacoes: 'Hipertensa, uso de AVC. Paciente calma e colaborativa.' },
    { nome: 'José Maria Andrade', cpf: '111.222.333-02', dataNascimento: '1938-07-22', email: 'jose.andrade@email.com', telefone: '71999001002', endereco: 'Av. Oceânica, 45, Salvador-BA', observacoes: 'Diabetes tipo 2, dificuldade de locomoção.' },
    { nome: 'Maria da Conceição Ferreira', cpf: '111.222.333-03', dataNascimento: '1950-11-08', email: 'mconceicao@email.com', telefone: '71999001003', endereco: 'Rua Conselheiro Saraiva, 78, Salvador-BA', observacoes: 'Alzheimer em estágio inicial. Necessita supervisão.' },
    { nome: 'Francisco Souza Lima', cpf: '111.222.333-04', dataNascimento: '1945-05-30', email: 'francisco.lima@email.com', telefone: '71999001004', endereco: 'Travessa do Sol, 23, Salvador-BA', observacoes: 'Fratura de fêmur recuperada. Em reabilitação fisioterápica.' },
    { nome: 'Antônia Rocha Santos', cpf: '111.222.333-05', dataNascimento: '1955-09-14', email: 'antonia.santos@email.com', telefone: '71999001005', endereco: 'Rua Paraíba, 55, Salvador-BA', observacoes: 'Artrite reumatoide. Sessões de fisioterapia 3x por semana.' },
    { nome: 'Raimundo Pereira Neto', cpf: '111.222.333-06', dataNascimento: '1940-01-19', email: 'raimundo.neto@email.com', telefone: '71999001006', endereco: 'Alameda das Mangueiras, 90, Salvador-BA', observacoes: 'DPOC. Fisioterapia respiratória.' },
    { nome: 'Benedita Alves Morais', cpf: '111.222.333-07', dataNascimento: '1948-06-25', email: 'benedita.morais@email.com', telefone: '71999001007', endereco: 'Rua dos Ingleses, 33, Salvador-BA', observacoes: 'Pós-AVC. Hemiplegía lateral direita.' },
    { nome: 'Manoel Tavares Coelho', cpf: '111.222.333-08', dataNascimento: '1935-12-03', email: 'manoel.coelho@email.com', telefone: '71999001008', endereco: 'Rua do Carmo, 17, Salvador-BA', observacoes: 'Insuficiência cardíaca compensada.' },
  ];

  const pacientes = [];
  for (const p of pacientesData) {
    const paciente = await Paciente.create({ ...p, empresaId: EMPRESA_ID });
    pacientes.push(paciente);
    log(`Paciente: ${p.nome}`);
  }
  return pacientes;
}

async function seedEstoque() {
  console.log('\n📦 Criando estoque (medicamentos e alimentos)...');
  const hoje = new Date();
  const venc6m = new Date(hoje); venc6m.setMonth(venc6m.getMonth() + 6);
  const venc1m = new Date(hoje); venc1m.setMonth(venc1m.getMonth() + 1);
  const venc2a = new Date(hoje); venc2a.setFullYear(venc2a.getFullYear() + 2);

  const medicamentos = [
    { nome: 'Losartana Potássica 50mg', tipo: 'medicamento', categoria: 'anti-hipertensivo', unidade: 'comprimido', quantidade: 120, quantidadeMinima: 30, valorUnitario: 0.45, lote: 'LOT2026A', validade: venc6m },
    { nome: 'Metformina 850mg', tipo: 'medicamento', categoria: 'antidiabético', unidade: 'comprimido', quantidade: 90, quantidadeMinima: 20, valorUnitario: 0.35, lote: 'LOT2026B', validade: venc6m },
    { nome: 'AAS 100mg', tipo: 'medicamento', categoria: 'antiagregante plaquetário', unidade: 'comprimido', quantidade: 200, quantidadeMinima: 50, valorUnitario: 0.12, lote: 'LOT2026C', validade: venc2a },
    { nome: 'Omeprazol 20mg', tipo: 'medicamento', categoria: 'protetor gástrico', unidade: 'cápsula', quantidade: 60, quantidadeMinima: 15, valorUnitario: 0.28, lote: 'LOT2026D', validade: venc6m },
    { nome: 'Dipirona Sódica 500mg', tipo: 'medicamento', categoria: 'analgésico/antitérmico', unidade: 'comprimido', quantidade: 8, quantidadeMinima: 20, valorUnitario: 0.18, lote: 'LOT2026E', validade: venc1m },
    { nome: 'Hidroclorotiazida 25mg', tipo: 'medicamento', categoria: 'diurético', unidade: 'comprimido', quantidade: 75, quantidadeMinima: 20, valorUnitario: 0.22, lote: 'LOT2026F', validade: venc6m },
    { nome: 'Bromazepam 3mg', tipo: 'medicamento', categoria: 'ansiolítico', unidade: 'comprimido', quantidade: 30, quantidadeMinima: 10, valorUnitario: 0.90, lote: 'LOT2026G', validade: venc6m },
    { nome: 'Complexo B Injetável', tipo: 'medicamento', categoria: 'vitamina', unidade: 'ampola', quantidade: 12, quantidadeMinima: 5, valorUnitario: 3.50, lote: 'LOT2026H', validade: venc1m },
  ];

  const alimentos = [
    { nome: 'Ensure Original Baunilha 200ml', tipo: 'alimento', categoria: 'suplemento nutricional', unidade: 'lata', quantidade: 48, quantidadeMinima: 10, valorUnitario: 14.90, lote: 'ALI2026A', validade: venc6m },
    { nome: 'Glucerna Chocolate 200ml', tipo: 'alimento', categoria: 'suplemento para diabéticos', unidade: 'lata', quantidade: 36, quantidadeMinima: 8, valorUnitario: 16.50, lote: 'ALI2026B', validade: venc6m },
    { nome: 'Fibregum (Goma Guar) 500g', tipo: 'alimento', categoria: 'fibra dietética', unidade: 'pote', quantidade: 5, quantidadeMinima: 2, valorUnitario: 42.00, lote: 'ALI2026C', validade: venc2a },
    { nome: 'Maltodextrina 1kg', tipo: 'alimento', categoria: 'suplemento energético', unidade: 'pacote', quantidade: 3, quantidadeMinima: 1, valorUnitario: 28.00, lote: 'ALI2026D', validade: venc2a },
  ];

  const itens = [];
  for (const m of [...medicamentos, ...alimentos]) {
    const item = await EstoqueItem.create({ ...m, empresaId: EMPRESA_ID, descricao: `${m.nome} - ${m.categoria}`, localizacao: 'Farmácia Interna', ativo: true });
    itens.push(item);
    log(`Estoque: ${m.nome} (${m.quantidade} ${m.unidade})`);
  }
  return itens;
}

async function seedEstoqueMovimentacoes(itens) {
  console.log('\n🔄 Criando movimentações de estoque...');
  const movs = [];
  const agora = new Date();
  for (let i = 0; i < Math.min(6, itens.length); i++) {
    const item = itens[i];
    const data = new Date(agora);
    data.setDate(data.getDate() - (i * 3));
    const mov = await EstoqueMovimentacao.create({
      empresaId: EMPRESA_ID,
      estoqueItemId: item.id,
      tipo: 'entrada',
      quantidade: 50,
      motivo: 'Reposição de estoque',
      usuarioId: USUARIO_ID,
      dataMovimentacao: data,
    });
    movs.push(mov);
    log(`Movimentação entrada: ${item.nome}`);
  }
  return movs;
}

async function seedAgendamentos(pacientes) {
  console.log('\n📅 Criando agendamentos...');
  const agendamentos = [];
  const tipos = ['fisioterapia', 'consulta', 'fisioterapia', 'avaliacao', 'fisioterapia', 'retorno', 'fisioterapia', 'consulta'];
  const statuses = ['agendado', 'agendado', 'realizado', 'agendado', 'cancelado', 'realizado', 'agendado', 'realizado'];

  for (let i = 0; i < pacientes.length; i++) {
    const dataHora = new Date();
    if (i < 3) { dataHora.setDate(dataHora.getDate() + (i + 1)); }
    else { dataHora.setDate(dataHora.getDate() - (i - 2)); }
    dataHora.setHours(9 + i, 0, 0, 0);

    const ag = await Agendamento.create({
      empresaId: EMPRESA_ID,
      pacienteId: pacientes[i].id,
      usuarioId: USUARIO_ID,
      titulo: `Sessão de ${tipos[i % tipos.length]} - ${pacientes[i].nome}`,
      tipo: tipos[i % tipos.length],
      dataHora,
      duracao: 60,
      status: statuses[i % statuses.length],
      observacoes: `Sessão de ${tipos[i % tipos.length]} - paciente colaborativo.`,
    });
    agendamentos.push(ag);
    log(`Agendamento: ${pacientes[i].nome} - ${tipos[i % tipos.length]} (${statuses[i % statuses.length]})`);
  }
  return agendamentos;
}

async function seedPrescricoes(pacientes) {
  console.log('\n💊 Criando prescrições...');
  const prescricoes = [];

  const prescData = [
    { descricao: 'Losartana 50mg - 1x ao dia (manhã)\nHidroclorotiazida 25mg - 1x ao dia (manhã)', itens: [{ nome: 'Losartana 50mg', posologia: '1x ao dia' }] },
    { descricao: 'Metformina 850mg - 2x ao dia com refeições\nAAS 100mg - 1x ao dia após almoço', itens: [{ nome: 'Metformina 850mg', posologia: '2x ao dia' }] },
    { descricao: 'Omeprazol 20mg - 1x ao dia em jejum\nBromazepam 3mg - 1x à noite se necessário', itens: [{ nome: 'Omeprazol 20mg', posologia: '1x ao dia' }] },
    { descricao: 'Complexo B Injetável - 2x por semana (IM)\nDipirona 500mg - SOS até 3x ao dia', itens: [] },
    { descricao: 'AAS 100mg - 1x ao dia após almoço\nAtenolol 50mg - 1x ao dia manhã', itens: [] },
  ];

  for (let i = 0; i < Math.min(5, pacientes.length); i++) {
    const p = await Prescricao.create({
      empresaId: EMPRESA_ID,
      pacienteId: pacientes[i].id,
      nutricionistaId: USUARIO_ID,
      tipo: 'medicamentosa',
      descricao: prescData[i].descricao,
      status: i < 4 ? 'ativa' : 'finalizada',
      itens: prescData[i].itens,
      observacoes: 'Monitorar efeitos adversos. Retorno em 30 dias.',
    });
    prescricoes.push(p);
    log(`Prescrição: ${pacientes[i].nome}`);
  }
  return prescricoes;
}

async function seedFinanceiro(pacientes) {
  console.log('\n💰 Criando movimentações financeiras...');
  const transacoes = [];
  const hoje = new Date();

  const receitasData = [
    { descricao: 'Mensalidade Paciente - Ana Beatriz Costa', valor: 3500.00, categoria: 'mensalidade', pacienteIdx: 0 },
    { descricao: 'Mensalidade Paciente - José Maria Andrade', valor: 3500.00, categoria: 'mensalidade', pacienteIdx: 1 },
    { descricao: 'Sessões de Fisioterapia Avulsas - Francisco Lima', valor: 450.00, categoria: 'fisioterapia', pacienteIdx: 3 },
    { descricao: 'Taxa de Avaliação Inicial - Antônia Santos', valor: 200.00, categoria: 'avaliacao', pacienteIdx: 4 },
    { descricao: 'Mensalidade Paciente - Benedita Morais', valor: 3800.00, categoria: 'mensalidade', pacienteIdx: 6 },
  ];

  const despesasData = [
    { descricao: 'Compra de Medicamentos - Farmácia Distribuidora', valor: 1250.00, categoria: 'medicamentos' },
    { descricao: 'Água e Esgoto - Embasa', valor: 380.00, categoria: 'utilidades' },
    { descricao: 'Energia Elétrica - Coelba', valor: 620.00, categoria: 'utilidades' },
    { descricao: 'Salário Fisioterapeuta', valor: 3200.00, categoria: 'folha-pagamento' },
    { descricao: 'Compra de Suplementos Nutricionais', valor: 890.00, categoria: 'alimentacao' },
  ];

  for (let i = 0; i < receitasData.length; i++) {
    const d = receitasData[i];
    const venc = new Date(hoje); venc.setDate(hoje.getDate() - i * 5);
    const t = await FinanceiroTransacao.create({
      empresaId: EMPRESA_ID,
      pacienteId: pacientes[d.pacienteIdx]?.id || null,
      usuarioId: USUARIO_ID,
      tipo: 'receita',
      categoria: d.categoria,
      descricao: d.descricao,
      valor: d.valor,
      dataVencimento: venc,
      dataPagamento: i < 3 ? venc : null,
      status: i < 3 ? 'pago' : 'pendente',
      formaPagamento: 'transferencia',
      observacoes: '',
    });
    transacoes.push(t);
    log(`Receita: ${d.descricao} - R$ ${d.valor}`);
  }

  for (let i = 0; i < despesasData.length; i++) {
    const d = despesasData[i];
    const venc = new Date(hoje); venc.setDate(hoje.getDate() - i * 4);
    const t = await FinanceiroTransacao.create({
      empresaId: EMPRESA_ID,
      pacienteId: null,
      usuarioId: USUARIO_ID,
      tipo: 'despesa',
      categoria: d.categoria,
      descricao: d.descricao,
      valor: d.valor,
      dataVencimento: venc,
      dataPagamento: i < 3 ? venc : null,
      status: i < 3 ? 'pago' : 'pendente',
      formaPagamento: 'boleto',
      observacoes: '',
    });
    transacoes.push(t);
    log(`Despesa: ${d.descricao} - R$ ${d.valor}`);
  }

  return transacoes;
}

async function seedEnfermagem(pacientes) {
  console.log('\n🏥 Criando registros de enfermagem...');
  const registros = [];
  const tipos = ['evolucao', 'sinais_vitais', 'administracao_medicamento', 'evolucao', 'sinais_vitais'];

  for (let i = 0; i < Math.min(5, pacientes.length); i++) {
    const p = pacientes[i];
    const data = new Date();
    data.setDate(data.getDate() - i);

    const r = await RegistroEnfermagem.create({
      empresaId: EMPRESA_ID,
      pacienteId: p.id,
      usuarioId: USUARIO_ID,
      tipo: tipos[i % tipos.length],
      titulo: `Registro de ${tipos[i % tipos.length].replace('_', ' ')} - ${p.nome}`,
      descricao: `Paciente apresenta bom estado geral. ${i === 0 ? 'PAD: 130/80 mmHg, FC: 72bpm, Temp: 36.5°C.' : 'Medicação administrada conforme prescrição.'}`,
      sinaisVitais: JSON.stringify({ pa: '130/80', fc: 72 + i, fr: 16, temp: 36.5, sat: 97 }),
      estadoGeral: i < 4 ? 'bom' : 'regular',
      prioridade: i === 2 ? 'media' : 'baixa',
      alerta: i === 2,
      observacoes: i === 2 ? 'Monitorar pressão nas próximas horas.' : null,
      createdAt: data,
      updatedAt: data,
    });
    registros.push(r);
    log(`Enfermagem: ${p.nome} - ${tipos[i % tipos.length]}`);
  }
  return registros;
}

async function seedFisioterapia(pacientes) {
  console.log('\n🦽 Criando sessões de fisioterapia...');
  const sessoes = [];
  const protocolos = [
    'Protocolo Neurológico - Hemiplégia',
    'Protocolo Respiratório - DPOC',
    'Protocolo Ortopédico - Reabilitação Pós-fratura',
    'Protocolo Reumatológico - Artrite',
    'Protocolo de Equilíbrio e Marcha',
    'Alongamento Global e Mobilidade',
  ];

  for (let i = 0; i < pacientes.length; i++) {
    const data = new Date();
    data.setDate(data.getDate() - Math.floor(i / 2));
    data.setHours(8 + (i % 4) * 2, 0, 0, 0);

    const s = await SessaoFisio.create({
      empresaId: EMPRESA_ID,
      pacienteId: pacientes[i].id,
      protocolo: protocolos[i % protocolos.length],
      dataHora: data,
      duracao: 60,
      observacoes: `Sessão realizada com sucesso. Paciente colaborativo. ${i === 3 ? 'Exercícios de força membros inferiores realizados.' : 'Boa resposta ao tratamento.'}`,
    });
    sessoes.push(s);
    log(`Fisioterapia: ${pacientes[i].nome} - ${protocolos[i % protocolos.length]}`);
  }
  return sessoes;
}

async function seedComercial() {
  console.log('\n🛒 Criando catálogo e pedidos comerciais...');
  const catalogoData = [
    { nome: 'Sessão de Fisioterapia Individual', tipo: 'servico', categoria: 'Fisioterapia', preco: 150.00, estoqueAtual: 0, estoqueMinimo: 0, unidade: 'sessão', descricao: 'Sessão individual de fisioterapia com duração de 60 minutos.', ativo: true },
    { nome: 'Pacote 10 Sessões de Fisioterapia', tipo: 'servico', categoria: 'Fisioterapia', preco: 1200.00, estoqueAtual: 0, estoqueMinimo: 0, unidade: 'pacote', descricao: 'Pacote mensal de fisioterapia com 10 sessões.', ativo: true },
    { nome: 'Avaliação Fisioterapêutica', tipo: 'servico', categoria: 'Avaliação', preco: 200.00, estoqueAtual: 0, estoqueMinimo: 0, unidade: 'avaliação', descricao: 'Avaliação completa fisioterapêutica com relatório.', ativo: true },
    { nome: 'Ensure Original 200ml', tipo: 'produto', categoria: 'Suplementos', preco: 22.90, estoqueAtual: 48, estoqueMinimo: 10, unidade: 'lata', descricao: 'Suplemento nutricional completo para adultos.', ativo: true },
    { nome: 'Glucerna Chocolate 200ml', tipo: 'produto', categoria: 'Suplementos', preco: 25.90, estoqueAtual: 36, estoqueMinimo: 8, unidade: 'lata', descricao: 'Suplemento nutricional para diabéticos.', ativo: true },
  ];

  const itens = [];
  for (const c of catalogoData) {
    const item = await CatalogoItem.create({ ...c, empresaId: EMPRESA_ID });
    itens.push(item);
    log(`Catálogo: ${c.nome} - R$ ${c.preco}`);
  }

  // Criar alguns pedidos
  const pedidosData = [
    { clienteNome: 'Ana Beatriz Costa', catalogoIdx: 0, qtd: 1, status: 'pago', pedPagStatus: 'pago', pagStatus: 'aprovado' },
    { clienteNome: 'Francisco Lima', catalogoIdx: 1, qtd: 1, status: 'pago', pedPagStatus: 'pago', pagStatus: 'aprovado' },
    { clienteNome: 'Antônia Santos', catalogoIdx: 2, qtd: 1, status: 'aberto', pedPagStatus: 'pendente', pagStatus: 'pendente' },
  ];

  for (const pd of pedidosData) {
    const catItem = itens[pd.catalogoIdx];
    const total = catItem.preco * pd.qtd;
    const pedido = await Pedido.create({
      empresaId: EMPRESA_ID,
      clienteNome: pd.clienteNome,
      origem: 'balcao',
      status: pd.status,
      pagamentoStatus: pd.pedPagStatus,
      subtotal: total,
      desconto: 0,
      total,
    });

    await PedidoItem.create({
      pedidoId: pedido.id,
      catalogoItemId: catItem.id,
      tipo: catItem.tipo,
      descricao: catItem.nome,
      quantidade: pd.qtd,
      valorUnitario: catItem.preco,
      total,
      metadados: {},
    });

    if (pd.pagStatus === 'aprovado') {
      await Pagamento.create({
        empresaId: EMPRESA_ID,
        pedidoId: pedido.id,
        valor: total,
        metodo: 'pix',
        status: 'aprovado',
        gateway: 'manual',
      });
    }
    log(`Pedido: ${pd.clienteNome} - ${catItem.nome} - R$ ${total}`);
  }

  return itens;
}

async function main() {
  console.log('🚀 Iniciando seed completo do Prescrimed - Canto do Sossego');
  console.log(`   Empresa: ${EMPRESA_ID}`);
  console.log(`   Usuário: cristiano@prescrimed.com.br`);

  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida');

    await clearExisting();
    await fixUsuarioPermissoes();

    const pacientes = await seedPacientes();
    const estoqueItens = await seedEstoque();
    await seedEstoqueMovimentacoes(estoqueItens);
    await seedAgendamentos(pacientes);
    await seedPrescricoes(pacientes);
    await seedFinanceiro(pacientes);
    await seedEnfermagem(pacientes);
    await seedFisioterapia(pacientes);
    await seedComercial();

    console.log('\n🎉 Seed completo finalizado com sucesso!');
    console.log('   Login: cristiano@prescrimed.com.br / 123456');
    console.log('   URL: http://localhost:5173');
    console.log('   Empresa: Canto do Sossego (Fisioterapia)');
    console.log('   Dados criados:');
    console.log(`   - ${pacientes.length} pacientes`);
    console.log(`   - ${estoqueItens.length} itens de estoque`);
    console.log('   - Agendamentos, prescrições, financeiro, enfermagem, fisioterapia, comercial');

  } catch (error) {
    console.error('\n❌ Erro no seed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();
