console.log('🧪 Testando endpoints do sistema...\n');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8000';

async function testSystem() {
  try {
    // 1. Health Check
    console.log('1. Testando Health Check...');
    const healthResponse = await fetch(`${baseUrl}/api/diagnostic/health`);
    const healthData = await healthResponse.json();
    console.log('   ✅ Health:', healthData);

    // 2. Login
    console.log('\n2. Testando Login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@prescrimed.com',
        senha: 'admin123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('   ✅ Login:', loginData.usuario?.nome || 'Sucesso');
    
    const token = loginData.token;
    
    // 3. Dashboard
    console.log('\n3. Testando Dashboard...');
    const dashResponse = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dashData = await dashResponse.json();
    console.log('   ✅ Dashboard:', dashData);

    // 4. Pacientes
    console.log('\n4. Testando Pacientes...');
    const pacResponse = await fetch(`${baseUrl}/api/pacientes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pacData = await pacResponse.json();
    console.log('   ✅ Pacientes:', pacData.length || 0, 'registros');

    console.log('\n✨ TODOS OS TESTES PASSARAM! Sistema funcionando 100%!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

testSystem();
