import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize, Empresa, Usuario } from '../models/index.js';

function requiredEnv(name, fallback = '') {
  const value = (process.env[name] || fallback).trim();
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function ensureSchema() {
  await sequelize.authenticate();
  await sequelize.sync();
}

async function seedHostgatorBootstrap() {
  const empresaNome = requiredEnv('HOSTGATOR_EMPRESA_NOME', 'Prescrimed');
  const empresaTipo = requiredEnv('HOSTGATOR_EMPRESA_TIPO', 'casa-repouso');
  const empresaCnpj = onlyDigits(requiredEnv('HOSTGATOR_EMPRESA_CNPJ', '00000000000191'));
  const empresaEmail = requiredEnv('HOSTGATOR_EMPRESA_EMAIL', 'contato@prescrimed.com.br');
  const adminNome = requiredEnv('HOSTGATOR_ADMIN_NOME', 'Administrador Prescrimed');
  const adminEmail = requiredEnv('HOSTGATOR_ADMIN_EMAIL', 'prescrimed@prescrimed.com.br');
  const adminPassword = requiredEnv('HOSTGATOR_ADMIN_PASSWORD');

  if (!['casa-repouso', 'fisioterapia', 'petshop'].includes(empresaTipo)) {
    throw new Error('HOSTGATOR_EMPRESA_TIPO deve ser casa-repouso, fisioterapia ou petshop');
  }

  console.log('🚀 Iniciando bootstrap HostGator...');
  await ensureSchema();

  const [empresa, empresaCreated] = await Empresa.findOrCreate({
    where: { email: empresaEmail },
    defaults: {
      nome: empresaNome,
      tipoSistema: empresaTipo,
      cnpj: empresaCnpj,
      email: empresaEmail,
      telefone: '(11) 4000-0000',
      endereco: 'Hospedado na HostGator',
      plano: 'profissional',
      ativo: true,
      emTeste: false,
    },
  });

  await empresa.update({
    nome: empresaNome,
    tipoSistema: empresaTipo,
    cnpj: empresaCnpj,
    email: empresaEmail,
    ativo: true,
  });

  const senhaHash = await bcrypt.hash(adminPassword, 10);
  const [admin, adminCreated] = await Usuario.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      nome: adminNome,
      email: adminEmail,
      senha: senhaHash,
      role: 'admin',
      empresaId: empresa.id,
      ativo: true,
      permissoes: [],
      contato: '(11) 99999-9999',
    },
  });

  await admin.update({
    nome: adminNome,
    senha: senhaHash,
    role: 'admin',
    empresaId: empresa.id,
    ativo: true,
  });

  console.log(empresaCreated ? '✅ Empresa criada' : '✅ Empresa atualizada');
  console.log(adminCreated ? '✅ Admin criado' : '✅ Admin atualizado');
  console.log(`🏢 Empresa: ${empresa.nome} (${empresa.tipoSistema})`);
  console.log(`👤 Login: ${admin.email}`);
  console.log('🔐 Senha: definida via HOSTGATOR_ADMIN_PASSWORD');
}

seedHostgatorBootstrap()
  .catch((error) => {
    console.error('❌ Falha no bootstrap HostGator:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // ignora erro ao encerrar conexão
    }
  });