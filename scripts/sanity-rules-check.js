/* Sanity check for new business rules
 - Residents cannot be deleted (405)
 - Residents can be inactivated only by Admin (200)
 - Evolutions history immutable: PUT 405
 - Evolutions deletion only superadmin: admin should get 403
*/

const BASE = process.env.API_URL || 'http://localhost:8000/api';

async function request(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, json };
}

async function login(email) {
  // Try common passwords used in test scripts
  for (const senha of ['admin123', 'teste123']) {
    const r = await request('POST', '/auth/login', { email, senha });
    if (r.ok && r.json?.token) return r.json.token;
  }
  throw new Error(`Login failed for ${email}`);
}

function randomCpf() {
  const n = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
  return n;
}

(async () => {
  const report = { steps: [] };
  try {
    // 1) Login as admin
    const adminToken = await login('admin@prescrimed.com');
    report.steps.push('admin_login_ok');

    // 2) Create a resident
    const pacientePayload = {
      nome: `Teste Sanity ${Date.now()}`,
      cpf: randomCpf(),
      dataNascimento: '1970-01-01',
      telefone: '(11) 90000-0000',
      email: `sanity${Date.now()}@test.com`,
      endereco: 'Rua Sanity, 123',
    };
    const pc = await request('POST', '/pacientes', pacientePayload, adminToken);
    if (!pc.ok || !pc.json?.id) throw new Error(`create paciente failed: ${pc.status}`);
    const pacienteId = pc.json.id;
    report.steps.push('paciente_create_ok');

    // 3) Try delete resident (should be 405)
    const delPc = await request('DELETE', `/pacientes/${pacienteId}`, null, adminToken);
    report.deletePaciente = delPc.status;

    // 4) Inactivate resident as admin (should be 200)
    const inat = await request('PUT', `/pacientes/${pacienteId}/inativar`, {}, adminToken);
    report.inativarPaciente = inat.status;

    // 5) Create evolution record
    const evolPayload = {
      pacienteId,
      tipo: 'evolucao',
      titulo: 'Sanity Evolução',
      descricao: 'Registro para sanity test',
    };
    const ev = await request('POST', '/enfermagem', evolPayload, adminToken);
    if (!ev.ok || !ev.json?.id) throw new Error(`create evolucao failed: ${ev.status}`);
    const evolId = ev.json.id;
    report.steps.push('evolucao_create_ok');

    // 6) Try update evolution (should be 405)
    const evPut = await request('PUT', `/enfermagem/${evolId}`, { titulo: 'X' }, adminToken);
    report.evolucaoPut = evPut.status;

    // 7) Try delete evolution as admin (should be 403)
    const evDel = await request('DELETE', `/enfermagem/${evolId}`, null, adminToken);
    report.evolucaoDeleteAdmin = evDel.status;

    // Verdicts
    const okDeletePaciente = report.deletePaciente === 405;
    const okInativar = report.inativarPaciente === 200;
    const okEvolPut = report.evolucaoPut === 405;
    const okEvolDelAdmin = report.evolucaoDeleteAdmin === 403;

    const allOk = okDeletePaciente && okInativar && okEvolPut && okEvolDelAdmin;

    console.log('SANITY_RULES_RESULT', JSON.stringify({
      ok: allOk,
      details: report,
      checks: {
        residentDelete405: okDeletePaciente,
        residentInactivate200: okInativar,
        evolutionPut405: okEvolPut,
        evolutionDelete403ForAdmin: okEvolDelAdmin,
      }
    }, null, 2));

    process.exit(allOk ? 0 : 2);
  } catch (e) {
    console.error('SANITY_RULES_ERROR', e?.message || e);
    console.log('SANITY_RULES_RESULT', JSON.stringify({ ok: false, error: String(e) }));
    process.exit(2);
  }
})();
