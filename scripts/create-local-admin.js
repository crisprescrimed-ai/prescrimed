// Script para criar usuário ADMIN localmente (não é superadmin)
import sequelize from '../config/database.js';
import Usuario from '../models/Usuario.js';
import Empresa from '../models/Empresa.js';
import bcrypt from 'bcryptjs';

const createLocalAdmin = async () => {
  try {
    console.log('🔧 Criando usuário administrador local...\n');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@prescrimed.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminNome = process.env.ADMIN_NOME || 'Administrador';
    const resetPassword = String(process.env.RESET_PASSWORD || '').toLowerCase() === 'true';

    // Conectar ao banco
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados\n');

    // Sincronizar modelos
    await sequelize.sync();
    console.log('✅ Modelos sincronizados\n');

    // Criar empresa padrão
    let empresa = await Empresa.findOne({ where: { nome: 'Prescrimed' } });
    
    if (!empresa) {
      empresa = await Empresa.create({
        nome: 'Prescrimed',
        tipoSistema: 'casa-repouso',
        cnpj: '00000000000000',
        telefone: '(00) 0000-0000',
        email: 'contato@prescrimed.com',
        endereco: 'Endereço padrão',
        plano: 'basico',
        ativo: true
      });
      console.log('✅ Empresa criada:', empresa.nome);
    } else {
      console.log('ℹ️  Empresa já existe:', empresa.nome);
    }

    // Verificar se admin já existe
    let admin = await Usuario.findOne({ where: { email: adminEmail } });

    if (admin) {
      console.log('\n⚠️  Usuário admin já existe!');
      console.log('📧 Email:', admin.email);
      console.log('👤 Nome:', admin.nome);

      if (resetPassword) {
        const senhaHash = await bcrypt.hash(adminPassword, 10);
        await admin.update({ senha: senhaHash, ativo: true, role: 'admin', empresaId: admin.empresaId || empresa.id });
        console.log('✅ Senha redefinida com sucesso (RESET_PASSWORD=true).\n');
      } else {
        console.log('🔑 Para redefinir a senha, rode com RESET_PASSWORD=true.\n');
      }
    } else {
      // Criar usuário admin
      const senhaHash = await bcrypt.hash(adminPassword, 10);
      
      admin = await Usuario.create({
        nome: adminNome,
        email: adminEmail,
        senha: senhaHash,
        role: 'admin',
        ativo: true,
        empresaId: empresa.id
      });

      console.log('\n✅ Usuário administrador criado com sucesso!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email: ', adminEmail);
      console.log('🔒 Senha: ', adminPassword);
      console.log('👤 Nome:  ', adminNome);
      console.log('🏢 Empresa:', empresa.nome);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('🚀 Acesse o sistema em: http://localhost:8000\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
};

createLocalAdmin();
