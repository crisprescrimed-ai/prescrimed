import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { sequelize, Usuario, Empresa } from '../models/index.js';

dotenv.config();

async function createAdminFisio() {
  try {
    await sequelize.authenticate();
    // Cria empresa de teste se não existir
    let empresa = await Empresa.findOne({ where: { nome: 'Empresa Fisio' } });
    if (!empresa) {
      empresa = await Empresa.create({ nome: 'Empresa Fisio', cnpj: '12345678000299', tipoSistema: 'fisioterapia', ativo: true });
    }

    // Cria usuário adminfisio@prescrimed.com
    const senhaHash = await bcrypt.hash('123456', 10);
    let usuario = await Usuario.findOne({ where: { email: 'adminfisio@prescrimed.com' } });
    if (!usuario) {
      usuario = await Usuario.create({
        nome: 'Admin Fisio',
        email: 'adminfisio@prescrimed.com',
        senha: senhaHash,
        role: 'admin',
        empresaId: empresa.id,
        ativo: true,
        permissoes: [],
      });
      console.log('✅ Usuário adminfisio@prescrimed.com criado com sucesso!');
    } else {
      await usuario.update({ senha: senhaHash, empresaId: empresa.id, ativo: true });
      console.log('ℹ️ Usuário já existia, senha e empresa atualizadas.');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar admin fisio:', error.message);
    process.exit(1);
  }
}

createAdminFisio();
