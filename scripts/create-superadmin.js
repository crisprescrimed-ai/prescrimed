import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { sequelize, Usuario } from '../models/index.js';

dotenv.config();

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

async function createOrUpdateSuperadmin() {
  const email = requireEnv('SUPERADMIN_EMAIL');
  const password = requireEnv('SUPERADMIN_PASSWORD');
  const nome = (process.env.SUPERADMIN_NOME || 'Super Admin').trim();

  console.log('👤 Criando/atualizando Super Admin...');

  await sequelize.authenticate();

  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') {
    console.warn(`⚠️ Dialeto atual do banco: ${dialect}. Para persistir no Railway, configure DATABASE_URL (Postgres).`);
  }

  // Em produção, NÃO altere automaticamente o schema aqui.
  // Se precisar criar/atualizar tabelas no primeiro deploy, use FORCE_SYNC=true no boot do backend.
  const allowAlter = process.env.NODE_ENV !== 'production' && process.env.FORCE_SYNC === 'true';
  if (allowAlter) {
    await sequelize.sync({ force: false, alter: true });
  }

  const senhaHash = await bcrypt.hash(password, 10);

  const [usuario, created] = await Usuario.findOrCreate({
    where: { email },
    defaults: {
      nome,
      email,
      senha: senhaHash,
      role: 'superadmin',
      empresaId: null,
      ativo: true,
      permissoes: [],
    },
  });

  // Garante que ficou superadmin e com senha atualizada (idempotente)
  await usuario.update({
    nome,
    senha: senhaHash,
    role: 'superadmin',
    empresaId: null,
    ativo: true,
  });

  console.log(created ? '✅ Super Admin criado' : '✅ Super Admin atualizado');
  console.log(`Email: ${email}`);
  console.log('Senha: (definida via SUPERADMIN_PASSWORD)');
}

createOrUpdateSuperadmin()
  .catch((error) => {
    console.error('❌ Falha ao criar/atualizar Super Admin:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
  });
