import { RegistroEnfermagem, Paciente, Usuario, Empresa } from '../models/index.js';
import sequelize from '../config/database.js';

async function seedEnfermagem() {
  try {

    await sequelize.authenticate();
    // Busca qualquer empresa existente
    const empresa = await Empresa.findOne();
    if (!empresa) throw new Error('Nenhuma empresa encontrada.');

    // Busca qualquer paciente vinculado à empresa
    let paciente = await Paciente.findOne({ where: { empresaId: empresa.id } });
    if (!paciente) {
      paciente = await Paciente.create({
        nome: 'Paciente Seed',
        cpf: '99999999999',
        dataNascimento: '1980-01-01',
        empresaId: empresa.id
      });
    }

    // Busca qualquer usuário vinculado à empresa
    let usuario = await Usuario.findOne({ where: { empresaId: empresa.id } });
    if (!usuario) {
      usuario = await Usuario.create({
        nome: 'Usuário Seed',
        email: 'seed@prescrimed.com',
        senha: 'seed123',
        papel: 'enfermeiro',
        empresaId: empresa.id
      });
    }

    // Cria registro de enfermagem de teste
    await RegistroEnfermagem.create({
      pacienteId: paciente.id,
      usuarioId: usuario.id,
      empresaId: empresa.id,
      tipo: 'evolucao',
      titulo: 'Evolução de Teste',
      descricao: 'Paciente evoluiu bem no plantão.',
      estadoGeral: 'bom',
      prioridade: 'baixa',
      alerta: false
    });

    console.log('✅ Registro de enfermagem de teste criado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar registro de enfermagem:', error.message);
    process.exit(1);
  }
}

seedEnfermagem();
