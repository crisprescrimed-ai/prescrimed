/**
 * Script para Limpar e Reconstruir Banco de Dados
 * Remove todos os dados antigos e cria dados reais para o sistema
 */

import { sequelize, Usuario, Empresa, Paciente, Prescricao, Agendamento } from '../models/index.js';
import bcrypt from 'bcryptjs';

async function rebuildDatabase() {
  try {
    console.log('🔄 Iniciando rebuild do banco de dados...\n');

    // Conecta ao banco
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados\n');

    // DROP e RECREATE de todas as tabelas
    console.log('🗑️  Dropando todas as tabelas...');
    await sequelize.drop();
    console.log('✅ Tabelas removidas\n');

    // Recria todas as tabelas
    console.log('📦 Recriando estrutura do banco...');
    await sequelize.sync({ force: true });
    console.log('✅ Estrutura criada\n');

    // Criar Empresa Principal
    console.log('🏢 Criando empresa...');
    const empresa = await Empresa.create({
      nome: 'Prescrimed - Gestão em Saúde',
      cnpj: '12.345.678/0001-90',
      telefone: '(11) 98765-4321',
      email: 'contato@prescrimed.com.br',
      endereco: 'Av. Paulista, 1000 - São Paulo, SP',
      ativo: true,
      configuracoes: {
        modulosAtivos: ['prescricao', 'agendamento', 'estoque', 'financeiro', 'enfermagem', 'fisioterapia'],
        corPrimaria: '#3b82f6',
        logoUrl: null
      }
    });
    console.log(`✅ Empresa criada: ${empresa.nome}\n`);

    // Criar Usuários
    console.log('👥 Criando usuários...');
    const usuarios = [];

    // SuperAdmin
    const superAdmin = await Usuario.create({
      nome: 'Administrador do Sistema',
      email: 'admin@prescrimed.com',
      senha: await bcrypt.hash('Admin@2026', 10),
      role: 'superadmin',
      empresaId: empresa.id,
      ativo: true,
      permissoes: {
        todos_modulos: true,
        gerenciar_usuarios: true,
        gerenciar_empresas: true,
        visualizar_relatorios: true
      }
    });
    usuarios.push(superAdmin);
    console.log(`  ✓ SuperAdmin: ${superAdmin.email}`);

    // Médico/Nutricionista
    const nutricionista = await Usuario.create({
      nome: 'Dr. Jean Soares',
      email: 'jean.soares@prescrimed.com',
      senha: await bcrypt.hash('Jean@2026', 10),
      role: 'nutricionista',
      empresaId: empresa.id,
      ativo: true,
      crm: 'CRN 12345',
      permissoes: {
        prescricoes: true,
        agendamentos: true,
        pacientes: true,
        visualizar_relatorios: true
      }
    });
    usuarios.push(nutricionista);
    console.log(`  ✓ Nutricionista: ${nutricionista.email}`);

    // Enfermeiro
    const enfermeiro = await Usuario.create({
      nome: 'Ana Paula Silva',
      email: 'ana.silva@prescrimed.com',
      senha: await bcrypt.hash('Enfermeiro@2026', 10),
      role: 'enfermeiro',
      empresaId: empresa.id,
      ativo: true,
      coren: 'COREN 54321',
      permissoes: {
        enfermagem: true,
        prescricoes_visualizar: true,
        agendamentos: true,
        pacientes: true
      }
    });
    usuarios.push(enfermeiro);
    console.log(`  ✓ Enfermeiro: ${enfermeiro.email}`);

    // Fisioterapeuta
    const fisio = await Usuario.create({
      nome: 'Carlos Eduardo Santos',
      email: 'carlos.santos@prescrimed.com',
      senha: await bcrypt.hash('Fisio@2026', 10),
      role: 'fisioterapeuta',
      empresaId: empresa.id,
      ativo: true,
      crefito: 'CREFITO 98765',
      permissoes: {
        fisioterapia: true,
        agendamentos: true,
        pacientes: true
      }
    });
    usuarios.push(fisio);
    console.log(`  ✓ Fisioterapeuta: ${fisio.email}`);

    // Atendente
    const atendente = await Usuario.create({
      nome: 'Maria Oliveira',
      email: 'maria.oliveira@prescrimed.com',
      senha: await bcrypt.hash('Atendente@2026', 10),
      role: 'atendente',
      empresaId: empresa.id,
      ativo: true,
      permissoes: {
        agendamentos: true,
        pacientes: true,
        financeiro_visualizar: true
      }
    });
    usuarios.push(atendente);
    console.log(`  ✓ Atendente: ${atendente.email}\n`);

    // Criar Pacientes Reais
    console.log('🏥 Criando pacientes...');
    const pacientes = [];

    const paciente1 = await Paciente.create({
      nome: 'João da Silva Santos',
      cpf: '123.456.789-00',
      dataNascimento: new Date('1985-03-15'),
      telefone: '(11) 98765-1111',
      email: 'joao.silva@email.com',
      endereco: 'Rua das Flores, 123 - São Paulo, SP',
      empresaId: empresa.id,
      observacoes: 'Paciente com hipertensão controlada',
      ativo: true
    });
    pacientes.push(paciente1);

    const paciente2 = await Paciente.create({
      nome: 'Maria Aparecida Costa',
      cpf: '987.654.321-00',
      dataNascimento: new Date('1990-07-22'),
      telefone: '(11) 98765-2222',
      email: 'maria.costa@email.com',
      endereco: 'Av. Independência, 456 - São Paulo, SP',
      empresaId: empresa.id,
      observacoes: 'Paciente com diabetes tipo 2',
      ativo: true
    });
    pacientes.push(paciente2);

    const paciente3 = await Paciente.create({
      nome: 'Pedro Henrique Oliveira',
      cpf: '456.789.123-00',
      dataNascimento: new Date('2000-11-05'),
      telefone: '(11) 98765-3333',
      email: 'pedro.oliveira@email.com',
      endereco: 'Rua São João, 789 - São Paulo, SP',
      empresaId: empresa.id,
      observacoes: 'Paciente jovem, sem comorbidades',
      ativo: true
    });
    pacientes.push(paciente3);

    const paciente4 = await Paciente.create({
      nome: 'Ana Beatriz Ferreira',
      cpf: '321.654.987-00',
      dataNascimento: new Date('1978-02-14'),
      telefone: '(11) 98765-4444',
      email: 'ana.ferreira@email.com',
      endereco: 'Rua Consolação, 1011 - São Paulo, SP',
      empresaId: empresa.id,
      observacoes: 'Paciente com histórico de obesidade',
      ativo: true
    });
    pacientes.push(paciente4);

    const paciente5 = await Paciente.create({
      nome: 'Roberto Carlos Almeida',
      cpf: '789.123.456-00',
      dataNascimento: new Date('1965-09-30'),
      telefone: '(11) 98765-5555',
      email: 'roberto.almeida@email.com',
      endereco: 'Av. Paulista, 2000 - São Paulo, SP',
      empresaId: empresa.id,
      observacoes: 'Paciente idoso com acompanhamento nutricional',
      ativo: true
    });
    pacientes.push(paciente5);

    console.log(`✅ ${pacientes.length} pacientes criados\n`);

    // Criar Agendamentos
    console.log('📅 Criando agendamentos...');
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const proxSemana = new Date(hoje);
    proxSemana.setDate(proxSemana.getDate() + 7);

    await Agendamento.create({
      pacienteId: paciente1.id,
      usuarioId: nutricionista.id,
      empresaId: empresa.id,
      dataHora: new Date(hoje.setHours(14, 0, 0, 0)),
      tipo: 'consulta',
      status: 'confirmado',
      observacoes: 'Consulta de retorno - avaliação nutricional'
    });

    await Agendamento.create({
      pacienteId: paciente2.id,
      usuarioId: fisio.id,
      empresaId: empresa.id,
      dataHora: new Date(amanha.setHours(10, 30, 0, 0)),
      tipo: 'fisioterapia',
      status: 'agendado',
      observacoes: 'Sessão de fisioterapia - reabilitação'
    });

    await Agendamento.create({
      pacienteId: paciente3.id,
      usuarioId: nutricionista.id,
      empresaId: empresa.id,
      dataHora: new Date(proxSemana.setHours(16, 0, 0, 0)),
      tipo: 'consulta',
      status: 'agendado',
      observacoes: 'Primeira consulta - avaliação completa'
    });

    console.log('✅ Agendamentos criados\n');

    // Criar Prescrições
    console.log('📋 Criando prescrições...');
    
    await Prescricao.create({
      pacienteId: paciente1.id,
      usuarioId: nutricionista.id,
      empresaId: empresa.id,
      tipo: 'nutricional',
      conteudo: {
        diagnostico: 'Hipertensão arterial controlada',
        orientacoes: [
          'Dieta hipossódica',
          'Reduzir consumo de gorduras saturadas',
          'Aumentar ingestão de frutas e vegetais',
          'Hidratação adequada - 2L água/dia'
        ],
        medicamentos: [],
        retorno: '30 dias'
      },
      observacoes: 'Paciente aderindo bem ao tratamento',
      ativo: true
    });

    await Prescricao.create({
      pacienteId: paciente2.id,
      usuarioId: nutricionista.id,
      empresaId: empresa.id,
      tipo: 'nutricional',
      conteudo: {
        diagnostico: 'Diabetes tipo 2',
        orientacoes: [
          'Controle de carboidratos',
          'Fracionar refeições em 5-6 vezes ao dia',
          'Preferir carboidratos complexos',
          'Evitar açúcares simples'
        ],
        medicamentos: [],
        retorno: '15 dias'
      },
      observacoes: 'Monitorar glicemia',
      ativo: true
    });

    console.log('✅ Prescrições criadas\n');

    // Resumo
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║          ✅ BANCO DE DADOS RECONSTRUÍDO           ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║ 🏢 Empresa: ${empresa.nome.padEnd(32)} ║`);
    console.log(`║ 👥 Usuários: ${usuarios.length} criados${' '.repeat(26)} ║`);
    console.log(`║ 🏥 Pacientes: ${pacientes.length} criados${' '.repeat(25)} ║`);
    console.log(`║ 📅 Agendamentos: 3 criados${' '.repeat(19)} ║`);
    console.log(`║ 📋 Prescrições: 2 criadas${' '.repeat(20)} ║`);
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║              CREDENCIAIS DE ACESSO                 ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║ SuperAdmin:                                        ║');
    console.log('║   Email: admin@prescrimed.com                      ║');
    console.log('║   Senha: Admin@2026                                ║');
    console.log('║                                                    ║');
    console.log('║ Nutricionista:                                     ║');
    console.log('║   Email: jean.soares@prescrimed.com                ║');
    console.log('║   Senha: Jean@2026                                 ║');
    console.log('║                                                    ║');
    console.log('║ Enfermeiro:                                        ║');
    console.log('║   Email: ana.silva@prescrimed.com                  ║');
    console.log('║   Senha: Enfermeiro@2026                           ║');
    console.log('║                                                    ║');
    console.log('║ Fisioterapeuta:                                    ║');
    console.log('║   Email: carlos.santos@prescrimed.com              ║');
    console.log('║   Senha: Fisio@2026                                ║');
    console.log('║                                                    ║');
    console.log('║ Atendente:                                         ║');
    console.log('║   Email: maria.oliveira@prescrimed.com             ║');
    console.log('║   Senha: Atendente@2026                            ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Erro ao reconstruir banco:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Conexão com banco encerrada');
  }
}

// Executar rebuild
rebuildDatabase()
  .then(() => {
    console.log('\n✅ Rebuild concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha no rebuild:', error);
    process.exit(1);
  });
