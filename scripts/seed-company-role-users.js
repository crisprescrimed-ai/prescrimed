import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize, Empresa, Usuario } from '../models/index.js';

function slugifyNome(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureRoleUserForEmpresa(empresa, role, defaults = {}) {
  const slug = slugifyNome(empresa.nome) || empresa.id.slice(0, 8);
  const desiredEmail = defaults.email || `${role.replace(/_+/g,'-')}.${slug}@prescrimed.com`;

  // Se foi passado um email explícito (ou já calculamos um), preferir garantir por email.
  // Isso permite criar um usuário "admin.<slug>@..." mesmo quando já existe outro admin legado.
  const existsByEmail = await Usuario.findOne({ where: { email: desiredEmail } });
  if (existsByEmail) {
    console.log(`   ℹ️ Usuário já existe (email) para role '${role}' em ${empresa.nome}: ${existsByEmail.email}`);
    return existsByEmail;
  }

  // Fallback: compatibilidade com seed antigo (um usuário por role por empresa)
  // Para alguns casos (ex: admin), queremos garantir um email previsível mesmo existindo outro usuário com a mesma role.
  if (!defaults.preferEmailOnly) {
    const exists = await Usuario.findOne({ where: { empresaId: empresa.id, role } });
    if (exists) {
      console.log(`   ℹ️ Usuário já existe para role '${role}' em ${empresa.nome}: ${exists.email}`);
      return exists;
    }
  }

  const senhaHash = await bcrypt.hash('teste123', 10);
  const email = desiredEmail;

  const payload = {
    nome: defaults.nome || `${role.replace(/(^|_)([a-z])/g, (_,p,c)=> (p? ' ' : '') + c.toUpperCase())} ${empresa.nome}`,
    email,
    senha: senhaHash,
    role,
    empresaId: empresa.id,
    ativo: true,
    especialidade: defaults.especialidade || null,
    contato: defaults.contato || null,
    permissoes: defaults.permissoes || [
      'pacientes:read','pacientes:write',
      'prescricoes:read','prescricoes:write',
      'enfermagem:read','enfermagem:write',
      'agendamentos:read','agendamentos:write'
    ]
  };

  const user = await Usuario.create(payload);
  console.log(`   ✅ Criado usuário ${role} → ${user.email}`);
  return user;
}

async function run() {
  try {
    console.log('📡 Conectando ao banco...');
    await sequelize.authenticate();
    console.log('✅ Conectado. Buscando empresas...');

    const empresas = await Empresa.findAll();
    if (!empresas || empresas.length === 0) {
      console.log('⚠️ Nenhuma empresa encontrada. Execute um seed de empresas primeiro.');
      process.exit(0);
      return;
    }

    for (const empresa of empresas) {
      console.log(`\n🏢 Empresa: ${empresa.nome} (${empresa.id})`);

      const slug = slugifyNome(empresa.nome) || empresa.id.slice(0, 8);
      await ensureRoleUserForEmpresa(empresa, 'admin', {
        nome: `Administrador ${empresa.nome}`,
        especialidade: 'Administração',
        preferEmailOnly: true,
        permissoes: [
          'pacientes:read','pacientes:write',
          'prescricoes:read','prescricoes:write',
          'enfermagem:read','enfermagem:write',
          'agendamentos:read','agendamentos:write',
          'estoque:read','estoque:write',
          'financeiro:read','financeiro:write',
          'usuarios:read','usuarios:write'
        ]
      });
      await ensureRoleUserForEmpresa(empresa, 'nutricionista', {
        nome: `Nutricionista ${empresa.nome}`,
        especialidade: 'Nutrição Clínica'
      });
      await ensureRoleUserForEmpresa(empresa, 'medico', {
        nome: `Médico ${empresa.nome}`,
        especialidade: 'Clínico Geral',
        contato: '(11) 99999-9999'
      });
      await ensureRoleUserForEmpresa(empresa, 'assistente_social', {
        nome: `Assistente Social ${empresa.nome}`,
        especialidade: 'Serviço Social'
      });
      await ensureRoleUserForEmpresa(empresa, 'tecnico_enfermagem', {
        nome: `Téc. Enfermagem ${empresa.nome}`,
        especialidade: 'Técnico de Enfermagem'
      });
      await ensureRoleUserForEmpresa(empresa, 'auxiliar_administrativo', {
        nome: `Auxiliar Administrativo ${empresa.nome}`,
        especialidade: 'Administração',
        permissoes: [
          'pacientes:read',
          'agendamentos:read','agendamentos:write',
          'estoque:read','estoque:write'
        ]
      });

      // Perfil “Estoque” (separado por email), sem criar role nova no banco.
      // Mantém role=auxiliar_administrativo, mas com permissões focadas em estoque.
      await ensureRoleUserForEmpresa(empresa, 'auxiliar_administrativo', {
        email: `estoque.${slug}@prescrimed.com`,
        nome: `Estoque ${empresa.nome}`,
        especialidade: 'Estoque',
        preferEmailOnly: true,
        permissoes: [
          'estoque:read','estoque:write'
        ]
      });
    }

    console.log('\n🎉 Usuários por empresa garantidos (admin, nutricionista, médico, assistente social, técnico de enfermagem, auxiliar administrativo).');
    console.log('📦 Perfil extra: estoque.<slugEmpresa>@prescrimed.com (role auxiliar_administrativo).');
    console.log('🔐 Senha padrão: teste123');
    console.log('📧 Emails gerados no padrão: <role>.<slugEmpresa>@prescrimed.com');
  } catch (err) {
    console.error('❌ Erro ao criar usuários:', err?.message || err);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch {}
  }
}

run();
