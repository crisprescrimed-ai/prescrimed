import { Paciente, Usuario, Empresa, Agendamento } from '../models/index.js';
import sequelize from '../config/database.js';

async function seedTestData() {
  try {
    await sequelize.authenticate();
    // Busca o superadmin
    const superadmin = await Usuario.findOne({ where: { email: 'admin@admin.com' } });
    if (!superadmin) throw new Error('Superadmin não encontrado.');

    // Cria empresa de teste se não existir
    let empresa = await Empresa.findOne({ where: { nome: 'Empresa Teste' } });
    if (!empresa) {
      empresa = await Empresa.create({ nome: 'Empresa Teste', cnpj: '12345678000199', tipoSistema: 'casa-repouso', ativo: true });
    }

    // Atualiza superadmin para pertencer à empresa
    await superadmin.update({ empresaId: empresa.id });

    // Cria paciente de teste
    let paciente = await Paciente.findOne({ where: { nome: 'Paciente Teste', empresaId: empresa.id } });
    if (!paciente) {
      paciente = await Paciente.create({
        nome: 'Paciente Teste',
        cpf: '12345678900',
        dataNascimento: '1950-01-01',
        empresaId: empresa.id
      });
    }

    // Cria agendamento de teste
    let agendamento = await Agendamento.findOne({ where: { pacienteId: paciente.id, empresaId: empresa.id } });
    if (!agendamento) {
      agendamento = await Agendamento.create({
        pacienteId: paciente.id,
        empresaId: empresa.id,
        usuarioId: superadmin.id,
        titulo: 'Consulta Inicial',
        descricao: 'Primeira consulta do paciente.',
        dataHora: new Date(),
        duracao: 60,
        tipo: 'consulta',
        status: 'agendado',
        observacoes: 'Agendamento de teste.'
      });
    }

    console.log('✅ Dados de teste criados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error.message);
    process.exit(1);
  }
}

seedTestData();
