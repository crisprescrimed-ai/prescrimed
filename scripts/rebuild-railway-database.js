/**
 * Script para reconstruir banco de dados PostgreSQL no Railway
 * 
 * Este script:
 * 1. Conecta no PostgreSQL usando URL interna (sem SSL)
 * 2. Dropa todas as tabelas existentes
 * 3. Recria todas as tabelas via Sequelize sync
 * 4. Insere dados iniciais (superadmin, empresa demo)
 */

import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function rebuildDatabase() {
  try {
    log('\n╔═══════════════════════════════════════════════════════╗', colors.cyan);
    log('║  🔨 REBUILD DATABASE - RAILWAY POSTGRESQL           ║', colors.cyan);
    log('╚═══════════════════════════════════════════════════════╝\n', colors.cyan);

    // Usa a URL do ambiente ou a URL pública com SSL
    let DATABASE_URL;
    let dialectOptions = {};
    
    if (process.env.DATABASE_URL) {
      DATABASE_URL = process.env.DATABASE_URL;
      // Se for URL pública (.rlwy.net), usa SSL
      if (DATABASE_URL.includes('rlwy.net') || DATABASE_URL.includes('railway.app')) {
        dialectOptions = {
          ssl: {
            rejectUnauthorized: false
          }
        };
        log('🔐 SSL habilitado para conexão externa', colors.yellow);
      } else {
        log('🔓 SSL desabilitado para conexão interna', colors.yellow);
      }
    } else {
      // Fallback para variáveis individuais
      const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
      DATABASE_URL = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
      log('📝 Usando variáveis PGHOST/PGUSER/PGPASSWORD/PGDATABASE', colors.yellow);
    }
    
    log(`📡 Conectando ao PostgreSQL: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`, colors.blue);
    
    const sequelize = new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      logging: (msg) => log(`  ${msg}`, colors.reset),
      dialectOptions
    });

    // Testa conexão
    await sequelize.authenticate();
    log('✅ Conexão estabelecida com sucesso!', colors.green);

    // 1. Dropa todas as tabelas
    log('\n🗑️  Dropando todas as tabelas existentes...', colors.yellow);
    await sequelize.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    log('✅ Tabelas dropadas com sucesso!', colors.green);

    // 2. Dropa todos os ENUMs
    log('🗑️  Dropando todos os tipos ENUM...', colors.yellow);
    await sequelize.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    log('✅ ENUMs dropados com sucesso!', colors.green);

    // 3. Importa modelos e recria tabelas
    log('\n📦 Importando modelos Sequelize...', colors.blue);
    const { Usuario, Empresa, Paciente } = await import('../models/index.js');
    
    log('🔨 Criando tabelas via Sequelize sync...', colors.blue);
    await sequelize.sync({ force: true });
    log('✅ Tabelas criadas com sucesso!', colors.green);

    // 4. Cria empresa demo
    log('\n🏢 Criando empresa demo...', colors.blue);
    const empresa = await Empresa.create({
      nome: 'Prescrimed Demo',
      cnpj: '00.000.000/0001-00',
      telefone: '(11) 99999-9999',
      email: 'contato@prescrimed.com.br',
      endereco: 'Rua Demo, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000-000',
      ativo: true
    });
    log(`✅ Empresa criada: ${empresa.nome} (ID: ${empresa.id})`, colors.green);

    // 5. Cria superadmin
    log('👤 Criando superadmin...', colors.blue);
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await Usuario.create({
      nome: 'Administrador',
      email: 'admin@prescrimed.com.br',
      senha: hashedPassword,
      role: 'superadmin',
      empresaId: empresa.id,
      ativo: true,
      permissoes: JSON.stringify({
        usuarios: { criar: true, editar: true, excluir: true, visualizar: true },
        pacientes: { criar: true, editar: true, excluir: true, visualizar: true },
        prescricoes: { criar: true, editar: true, excluir: true, visualizar: true },
        agendamentos: { criar: true, editar: true, excluir: true, visualizar: true },
        estoque: { criar: true, editar: true, excluir: true, visualizar: true },
        financeiro: { criar: true, editar: true, excluir: true, visualizar: true },
        empresas: { criar: true, editar: true, excluir: true, visualizar: true }
      })
    });
    log(`✅ Superadmin criado: ${admin.email}`, colors.green);

    // 6. Cria paciente demo
    log('🧑 Criando paciente demo...', colors.blue);
    const paciente = await Paciente.create({
      nome: 'Jean Soares',
      cpf: '000.000.000-00',
      dataNascimento: new Date('1980-01-01'),
      telefone: '(11) 98888-8888',
      email: 'jean@demo.com',
      endereco: 'Rua Demo Paciente, 456',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '02000-000',
      empresaId: empresa.id,
      ativo: true
    });
    log(`✅ Paciente criado: ${paciente.nome} (ID: ${paciente.id})`, colors.green);

    await sequelize.close();

    log('\n╔═══════════════════════════════════════════════════════╗', colors.green);
    log('║  ✅ DATABASE REBUILD CONCLUÍDO COM SUCESSO!         ║', colors.green);
    log('╠═══════════════════════════════════════════════════════╣', colors.green);
    log('║  📊 Dados criados:                                    ║', colors.green);
    log('║  • Empresa: Prescrimed Demo                           ║', colors.green);
    log('║  • Superadmin: admin@prescrimed.com.br / admin123     ║', colors.green);
    log('║  • Paciente: Jean Soares                              ║', colors.green);
    log('╚═══════════════════════════════════════════════════════╝\n', colors.green);

  } catch (error) {
    log(`\n❌ Erro ao reconstruir banco de dados: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

rebuildDatabase();
