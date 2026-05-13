/* Smoke test: login, ensure paciente, create agendamento, list agendamentos */
const BASE = 'http://localhost:8000';

async function main() {
  try {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'adminfisio@prescrimed.com', senha: '123456' })
    });
    if (!loginRes.ok) throw new Error(`Login falhou: ${loginRes.status}`);
    const login = await loginRes.json();
    const token = login.token;
    const empresaId = login.user?.empresaId;
    console.log('✅ Login OK. empresaId:', empresaId);

    // Lista pacientes
    let pacientesRes = await fetch(`${BASE}/api/pacientes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!pacientesRes.ok) throw new Error(`Listar pacientes falhou: ${pacientesRes.status}`);
    let pacientes = await pacientesRes.json();

    let pacienteId;
    if (Array.isArray(pacientes) && pacientes.length > 0) {
      pacienteId = pacientes[0].id;
      console.log('👤 Usando paciente existente:', pacientes[0].nome, pacienteId);
    } else {
      // cria paciente de teste
      const novoPac = {
        nome: 'Paciente Teste',
        cpf: '00000000000',
        dataNascimento: '1950-01-01',
        email: 'paciente.teste@example.com',
        telefone: '000000000',
        observacoes: 'Criado pelo smoke test'
      };
      const createPacRes = await fetch(`${BASE}/api/pacientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(novoPac)
      });
      if (!createPacRes.ok) throw new Error(`Criar paciente falhou: ${createPacRes.status}`);
      const createdPac = await createPacRes.json();
      pacienteId = createdPac.id;
      console.log('✅ Paciente criado:', createdPac.nome, pacienteId);
    }

    // cria agendamento de teste
    const in2h = new Date(Date.now() + 2*60*60*1000).toISOString();
    const novoAg = {
      pacienteId,
      titulo: 'Consulta de teste',
      descricao: 'Smoke test',
      dataHora: in2h,
      duracao: 30,
      tipo: 'Consulta',
      status: 'agendado',
      observacoes: 'Gerado automaticamente',
      local: 'Sala 1',
      participante: 'Dr. Teste'
    };
    const createAgRes = await fetch(`${BASE}/api/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(novoAg)
    });
    if (!createAgRes.ok) throw new Error(`Criar agendamento falhou: ${createAgRes.status}`);
    const createdAg = await createAgRes.json();
    console.log('✅ Agendamento criado para:', createdAg?.paciente?.nome || pacienteId, 'às', createdAg?.dataHora);

    // lista agendamentos
    const listAgRes = await fetch(`${BASE}/api/agendamentos`, { headers: { Authorization: `Bearer ${token}` } });
    if (!listAgRes.ok) throw new Error(`Listar agendamentos falhou: ${listAgRes.status}`);
    const ags = await listAgRes.json();
    console.log('📅 Total de agendamentos:', Array.isArray(ags) ? ags.length : 0);
    if (Array.isArray(ags)) {
      const ultimo = ags[ags.length - 1];
      console.log('↪️ Último:', ultimo?.titulo, 'paciente:', ultimo?.paciente?.nome, 'data:', ultimo?.dataHora);
    }

    console.log('\n🎉 Smoke test concluído com sucesso.');
  } catch (err) {
    console.error('❌ Smoke test falhou:', err.message);
    process.exit(1);
  }
}

main();
