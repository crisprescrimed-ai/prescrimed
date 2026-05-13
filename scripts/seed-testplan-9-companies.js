/**
 * Seed do Plano de Testes (9 empresas)
 *
 * IMPORTANTE (privacidade): este seed usa dados sintéticos (nomes/endereços fictícios)
 * com CPF/CNPJ válidos (dígitos verificadores corretos), mas não pertencentes a pessoas reais.
 *
 * Objetivo:
 * - Criar 9 empresas (3 casa-repouso, 3 petshop, 3 fisioterapia)
 * - Criar usuários por empresa (roles conforme regras do sistema)
 * - Criar 5 pacientes por empresa
 * - Criar 5 registros de evolução + 5 agendamentos + 5 prescrições por paciente
 */

import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import {
  sequelize,
  Empresa,
  Usuario,
  Paciente,
  RegistroEnfermagem,
  Agendamento,
  Prescricao,
  EmpresaSequencia,
} from '../models/index.js';
import { isValidCPF, isValidCNPJ } from '../utils/brDocuments.js';

const PASSWORD_DEFAULT = process.env.SEED_TEST_PASSWORD || 'Teste@2026';
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const FORCE_PURGE = String(process.env.FORCE_PURGE || '').toLowerCase() === 'true';

const PREFIX = 'TP 2026-01-27';

async function ensureSchema() {
  const dialect = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : undefined;

  // Em PostgreSQL, ENUM não aceita novos valores automaticamente via sync.
  // Garantimos aqui para o seed não depender do servidor ter rodado antes.
  if (dialect === 'postgres') {
    try {
      const enumTypeName = 'enum_usuarios_role';
      const roleValues = [
        'superadmin',
        'admin',
        'nutricionista',
        'atendente',
        'enfermeiro',
        'tecnico_enfermagem',
        'fisioterapeuta',
        'assistente_social',
        'auxiliar_administrativo',
        'medico',
      ];

      for (const value of roleValues) {
        await sequelize.query(
          `DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumTypeName}') AND
               NOT EXISTS (
                 SELECT 1
                 FROM pg_type t
                 JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = '${enumTypeName}' AND e.enumlabel = '${value}'
               )
            THEN
              EXECUTE format('ALTER TYPE %I ADD VALUE %L', '${enumTypeName}', '${value}');
            END IF;
          END $$;`
        );
      }
    } catch (e) {
      console.warn('⚠️ Falha ao garantir ENUM usuarios.role (seed seguirá mesmo assim):', e?.message || e);
    }
  }

  // Garante colunas necessárias em empresas (e, por consequência, o índice do model)
  let needsAlter = false;
  try {
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable(Empresa.getTableName());

    const missingCodigoCols = !cols?.codigo || !cols?.codigoNumero;
    const missingTrialCols = !cols?.emTeste || !cols?.testeInicio || !cols?.testeFim || !cols?.testeDias;
    if (missingCodigoCols || missingTrialCols) needsAlter = true;
  } catch {
    needsAlter = true;
  }

  if (needsAlter) {
    console.log('🔧 Schema detectado como desatualizado - rodando sequelize.sync({ alter: true })...');
    await sequelize.sync({ alter: true });
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateValidCPF() {
  // Gera CPF sintético com DV válido
  while (true) {
    const base = Array.from({ length: 9 }, () => randInt(0, 9)).join('');
    if (/^(\d)\1+$/.test(base)) continue;

    const calc = (digits, factorStart) => {
      let sum = 0;
      for (let i = 0; i < digits.length; i++) {
        sum += Number(digits[i]) * (factorStart - i);
      }
      let d = 11 - (sum % 11);
      if (d >= 10) d = 0;
      return d;
    };

    const d1 = calc(base, 10);
    const d2 = calc(base + String(d1), 11);
    const cpf = base + String(d1) + String(d2);
    if (isValidCPF(cpf)) return cpf;
  }
}

function generateValidCNPJ() {
  // Gera CNPJ sintético com DV válido
  while (true) {
    const base = Array.from({ length: 12 }, () => randInt(0, 9)).join('');
    if (/^(\d)\1+$/.test(base)) continue;

    const calcDigit = (digits, weights) => {
      const sum = digits
        .split('')
        .reduce((acc, d, idx) => acc + Number(d) * weights[idx], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const d1 = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calcDigit(base + String(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const cnpj = base + String(d1) + String(d2);
    if (isValidCNPJ(cnpj)) return cnpj;
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makePersonName() {
  const first = ['Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sabrina', 'Tiago', 'Vanessa', 'William'];
  const last = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Gomes', 'Ribeiro', 'Carvalho', 'Lima', 'Araújo', 'Barbosa', 'Cardoso', 'Martins'];
  return `${pick(first)} ${pick(last)}`;
}

function makeEmail(slug, role) {
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9_\-]/g, '-');
  return `${role}.${safeSlug}@test.prescrimed.local`;
}

function makeCompanySlug(tipo, idx) {
  if (tipo === 'casa-repouso') return `casa_${pad2(idx)}`;
  if (tipo === 'petshop') return `pet_${pad2(idx)}`;
  return `fisio_${pad2(idx)}`;
}

function expectedCodigo(tipo, idx) {
  if (tipo === 'casa-repouso') return `Casa_${pad2(idx)}`;
  if (tipo === 'petshop') return `Pet_${pad2(idx)}`;
  return `Fisio_${pad2(idx)}`;
}

function buildCompanies() {
  const result = [];

  for (let i = 1; i <= 3; i++) {
    result.push({
      tipoSistema: 'casa-repouso',
      idx: i,
      nome: `${PREFIX} - Casa de Repouso ${pad2(i)} - Aurora`,
      email: `contato.casa_${pad2(i)}@test.prescrimed.local`,
      telefone: `(11) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
      endereco: `Rua das Flores, ${100 + i} - Centro - São Paulo/SP`,
      plano: 'basico',
    });
  }

  for (let i = 1; i <= 3; i++) {
    result.push({
      tipoSistema: 'petshop',
      idx: i,
      nome: `${PREFIX} - PetShop ${pad2(i)} - Amigo Fiel`,
      email: `contato.pet_${pad2(i)}@test.prescrimed.local`,
      telefone: `(11) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
      endereco: `Av. dos Animais, ${200 + i} - Vila Nova - São Paulo/SP`,
      plano: 'basico',
    });
  }

  for (let i = 1; i <= 3; i++) {
    result.push({
      tipoSistema: 'fisioterapia',
      idx: i,
      nome: `${PREFIX} - Fisioterapia ${pad2(i)} - Movimento`,
      email: `contato.fisio_${pad2(i)}@test.prescrimed.local`,
      telefone: `(11) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
      endereco: `Rua da Saúde, ${300 + i} - Jardim - São Paulo/SP`,
      plano: 'basico',
    });
  }

  return result;
}

function buildRolesByTipo(tipoSistema) {
  // Regras do sistema (routes/paciente.routes.js)
  const common = ['admin', 'enfermeiro', 'assistente_social', 'medico'];
  if (tipoSistema === 'fisioterapia') return [...common, 'fisioterapeuta'];
  // casa-repouso e petshop
  return common;
}

async function purgePrevious() {
  console.log('🧹 Limpando dados anteriores do Test Plan...');
  const empresas = await Empresa.findAll({ where: { nome: { [Op.like]: `${PREFIX}%` } }, attributes: ['id', 'nome', 'tipoSistema'] });
  if (empresas.length === 0) {
    console.log('ℹ️ Nada para limpar.');
    return;
  }

  if (DRY_RUN) {
    console.log(`DRY_RUN=true: encontradas ${empresas.length} empresas para remoção.`);
    return;
  }

  const empresaIds = empresas.map((e) => e.id);
  await sequelize.transaction(async (t) => {
    await RegistroEnfermagem.destroy({ where: { empresaId: empresaIds }, transaction: t });
    await Prescricao.destroy({ where: { empresaId: empresaIds }, transaction: t });
    await Agendamento.destroy({ where: { empresaId: empresaIds }, transaction: t });
    await Paciente.destroy({ where: { empresaId: empresaIds }, transaction: t });
    await Usuario.destroy({ where: { empresaId: empresaIds }, transaction: t });
    await Empresa.destroy({ where: { id: empresaIds }, transaction: t });
  });

  console.log(`✅ Removidas ${empresas.length} empresas antigas do Test Plan.`);
}

async function up() {
  try {
    console.log('📡 Conectando ao banco...');
    await sequelize.authenticate();
    console.log('✅ Conectado.');

    await ensureSchema();

    if (FORCE_PURGE) {
      await purgePrevious();
    }

    const companies = buildCompanies();

    const passwordHash = await bcrypt.hash(PASSWORD_DEFAULT, 10);

    for (const c of companies) {
      const slug = makeCompanySlug(c.tipoSistema, c.idx);
      const expected = expectedCodigo(c.tipoSistema, c.idx);

      console.log(`\n🏢 Seed Empresa: ${c.nome} (${c.tipoSistema})`);

      // Cria (ou reutiliza) empresa
      let empresa = await Empresa.findOne({ where: { nome: c.nome } });
      if (!empresa) {
        const cnpjDigits = generateValidCNPJ();
        if (!isValidCNPJ(cnpjDigits)) throw new Error('Falha ao gerar CNPJ válido');

        if (DRY_RUN) {
          console.log(`DRY_RUN=true: criaria empresa com CNPJ ${cnpjDigits} e slug ${slug}`);
          continue;
        }

        empresa = await Empresa.create({
          nome: c.nome,
          tipoSistema: c.tipoSistema,
          cnpj: cnpjDigits,
          email: c.email,
          telefone: c.telefone,
          endereco: c.endereco,
          plano: c.plano,
          ativo: true,
        });
        console.log(`   ✅ Empresa criada (codigo=${empresa.codigo || '-'})`);

        if (empresa.codigo && empresa.codigo !== expected) {
          console.warn(`   ⚠️ codigo gerado (${empresa.codigo}) != esperado (${expected}). Para Casa_01/Pet_01/Fisio_01, use banco limpo ou FORCE_PURGE=true.`);
        }
      } else {
        console.log(`   ℹ️ Empresa já existe (codigo=${empresa.codigo || '-'})`);
      }

      // Ajuste da sequência (ajuda a manter progressão) - best-effort
      try {
        if (!DRY_RUN) {
          const seqTipo = c.tipoSistema;
          const maxNumero = Math.max(empresa.codigoNumero || 0, c.idx);
          await EmpresaSequencia.upsert({ tipoSistema: seqTipo, ultimoNumero: maxNumero });
        }
      } catch (e) {
        console.warn('   ⚠️ Não foi possível ajustar EmpresaSequencia:', e?.message || e);
      }

      const roles = buildRolesByTipo(c.tipoSistema);
      const usersByRole = {};

      for (const role of roles) {
        const email = makeEmail(slug, role);
        let usr = await Usuario.findOne({ where: { email } });
        if (!usr) {
          const cpf = generateValidCPF();
          if (!isValidCPF(cpf)) throw new Error('Falha ao gerar CPF válido');

          if (DRY_RUN) {
            console.log(`DRY_RUN=true: criaria usuário ${role} ${email}`);
            continue;
          }

          usr = await Usuario.create({
            nome: `${makePersonName()} (${role})`,
            email,
            senha: passwordHash,
            role,
            cpf,
            contato: `(11) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
            empresaId: empresa.id,
            ativo: true,
            ...(role === 'medico' ? { crm: String(randInt(10000, 99999)), crmUf: 'SP', especialidade: 'Clínico Geral' } : {}),
            ...(role === 'fisioterapeuta' ? { especialidade: 'Fisioterapia Motora' } : {}),
          });
          console.log(`   ✅ Usuário criado: ${email} (${role})`);
        } else {
          if (!DRY_RUN) {
            await usr.update({ empresaId: empresa.id, ativo: true });
          }
          console.log(`   ℹ️ Usuário já existia: ${email} (${role})`);
        }
        usersByRole[role] = usr;
      }

      // Pacientes: 5 por empresa
      const pacientes = [];
      for (let i = 1; i <= 5; i++) {
        const cpf = generateValidCPF();
        const nome = `${makePersonName()} (Paciente ${i})`;

        let pac = await Paciente.findOne({ where: { empresaId: empresa.id, cpf } });
        if (!pac) {
          if (DRY_RUN) {
            console.log(`DRY_RUN=true: criaria paciente ${nome}`);
            continue;
          }
          pac = await Paciente.create({
            nome,
            cpf,
            dataNascimento: `${randInt(1940, 2010)}-${pad2(randInt(1, 12))}-${pad2(randInt(1, 28))}`,
            telefone: `(11) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
            email: `paciente.${slug}.${i}@test.prescrimed.local`,
            endereco: `Rua Teste, ${500 + i} - São Paulo/SP`,
            empresaId: empresa.id,
            ativo: true,
          });
          console.log(`   ✅ Paciente criado: ${pac.nome}`);
        }
        pacientes.push(pac);
      }

      // Geração de dados: 5x por paciente
      const responsavel = usersByRole.atendente || usersByRole.admin;
      const enfermeiro = usersByRole.enfermeiro || usersByRole.admin;
      const prescritor = usersByRole.medico || usersByRole.admin;

      if (!DRY_RUN) {
        for (const pac of pacientes) {
          for (let k = 1; k <= 5; k++) {
            const dt = new Date(Date.now() + (k * 60 + randInt(0, 30)) * 60 * 1000);

            // Agendamento
            await Agendamento.create({
              pacienteId: pac.id,
              empresaId: empresa.id,
              usuarioId: responsavel?.id || null,
              titulo: `Consulta ${k} - ${pac.nome}`,
              descricao: `Agendamento do plano de testes (${PREFIX})`,
              dataHora: dt,
              duracao: 30,
              tipo: c.tipoSistema === 'petshop' ? 'Atendimento Pet' : 'Consulta',
              status: 'agendado',
              local: 'Sala 1',
              participante: 'Equipe',
              observacoes: `Execução #${k}`,
            });

            // Evolução (RegistroEnfermagem)
            await RegistroEnfermagem.create({
              pacienteId: pac.id,
              usuarioId: enfermeiro.id,
              empresaId: empresa.id,
              tipo: 'evolucao',
              titulo: `Evolução ${k} - ${pac.nome}`,
              descricao: `Registro de evolução sintético para validação integral. Execução #${k}.`,
              sinaisVitais: JSON.stringify({
                pa: `${randInt(100, 140)}/${randInt(60, 95)}`,
                fc: randInt(60, 110),
                fr: randInt(12, 22),
                temp: (randInt(360, 385) / 10).toFixed(1),
                satO2: randInt(92, 100),
                glicemia: randInt(70, 180)
              }),
              riscoQueda: pick(['baixo', 'medio', 'alto']),
              riscoLesao: pick(['baixo', 'medio', 'alto']),
              estadoGeral: pick(['bom', 'regular', 'grave']),
              alerta: k === 5,
              prioridade: k === 5 ? 'alta' : 'baixa',
              observacoes: 'Gerado automaticamente pelo seed do plano de testes.',
              anexos: JSON.stringify([]),
            });

            // Prescrição
            await Prescricao.create({
              pacienteId: pac.id,
              empresaId: empresa.id,
              nutricionistaId: prescritor.id, // campo no modelo atual
              tipo: 'medicamentosa',
              descricao: `Prescrição ${k} para ${pac.nome}`,
              observacoes: 'Prescrição sintética para validação de API e persistência.',
              itens: [
                {
                  nome: 'Dipirona',
                  dosagem: '500mg',
                  frequencia: '8/8h',
                  duracao: '3 dias',
                  observacoes: 'Se dor ou febre',
                  controlado: false,
                }
              ],
              status: 'ativa',
            });
          }
        }
      }

      console.log('   ✅ Dados gerados: 5 agendamentos + 5 evoluções + 5 prescrições por paciente');
    }

    console.log('\n🎉 Seed do Plano de Testes concluído.');
    console.log(`🔐 Senha padrão dos usuários: ${PASSWORD_DEFAULT}`);
    console.log('💡 Dica: para limpar e recriar, rode com FORCE_PURGE=true.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed do Plano de Testes falhou:', err);
    process.exit(1);
  }
}

up();
