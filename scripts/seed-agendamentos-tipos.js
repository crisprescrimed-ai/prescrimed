import { sequelize, Empresa, Paciente, Usuario, Agendamento } from '../models/index.js';

async function main() {
  try {
    console.log('🔎 Carregando contexto para seed de agendamentos...');
    await sequelize.authenticate();

    const empresa = await Empresa.findOne();
    if (!empresa) throw new Error('Nenhuma empresa encontrada');

    const usuario = await Usuario.findOne({ where: { empresaId: empresa.id } });
    if (!usuario) throw new Error('Nenhum usuário encontrado para a empresa');

    const paciente = await Paciente.findOne({ where: { empresaId: empresa.id } });
    if (!paciente) throw new Error('Nenhum paciente encontrado para a empresa');

    console.log(`🏢 Empresa: ${empresa.nome}`);
    console.log(`👤 Usuário: ${usuario.nome}`);
    console.log(`🧑 Paciente: ${paciente.nome}`);

    const tipos = ['Compromisso','Reunião','Consulta','Exame','Outro'];
    const now = new Date();

    for (let i = 0; i < tipos.length; i++) {
      const dt = new Date(now.getTime() + (i+1) * 60 * 60 * 1000);
      const item = await Agendamento.create({
        pacienteId: paciente.id,
        empresaId: empresa.id,
        usuarioId: usuario.id,
        titulo: `Teste ${tipos[i]}`,
        descricao: 'Gerado pelo seed automático',
        dataHora: dt,
        duracao: 30,
        tipo: tipos[i],
        status: 'agendado',
        observacoes: 'Seed de validação de tipos',
        local: `Sala ${i+1}`,
        participante: paciente.nome
      });
      console.log(`✅ Criado: ${item.titulo} (${item.tipo}) em ${dt.toISOString()}`);
    }

    console.log('🎉 Seed de agendamentos por tipo concluído.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha no seed de agendamentos:', err?.message || err);
    process.exit(1);
  }
}

main();
