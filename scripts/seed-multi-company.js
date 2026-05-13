import bcrypt from 'bcryptjs';
import { sequelize, Empresa, Usuario, Paciente, Pet, Agendamento } from '../models/index.js';

const companies = [
  {
    nome: 'Casa de Repouso Vida Plena',
    tipoSistema: 'casa-repouso',
    cnpj: '12.345.678/0001-01',
    email: 'contato@vidaplena.com',
    telefone: '(71) 98765-4321',
    admin: { nome: 'Maria Silva', email: 'admin@vidaplena.com', senha: 'Admin@2026', cpf: '11122233344' },
    usuarios: [
      { nome: 'João Enfermeiro', email: 'joao.enf@vidaplena.com', role: 'enfermeiro', cpf: '22233344455' },
      { nome: 'Ana Técnica', email: 'ana.tec@vidaplena.com', role: 'tecnico_enfermagem', cpf: '33344455566' },
      { nome: 'Carlos Administrativo', email: 'carlos.adm@vidaplena.com', role: 'auxiliar_administrativo', cpf: '44455566677' }
    ],
    pacientes: [
      { nome: 'José Santos', cpf: '55566677788', dataNascimento: '1950-03-15', telefone: '(71) 99111-2222' },
      { nome: 'Rita Oliveira', cpf: '66677788899', dataNascimento: '1948-07-22', telefone: '(71) 99222-3333' },
      { nome: 'Pedro Costa', cpf: '77788899900', dataNascimento: '1952-11-10', telefone: '(71) 99333-4444' }
    ]
  },
  {
    nome: 'Clínica Movimento',
    tipoSistema: 'fisioterapia',
    cnpj: '23.456.789/0001-02',
    email: 'contato@movimento.com',
    telefone: '(71) 98876-5432',
    admin: { nome: 'Dr. Roberto Lima', email: 'admin@movimento.com', senha: 'Fisio@2026', cpf: '88899900011' },
    usuarios: [
      { nome: 'Dra. Paula', email: 'paula@movimento.com', role: 'fisioterapeuta', cpf: '99900011122' },
      { nome: 'Fernanda Atendente', email: 'fernanda@movimento.com', role: 'atendente', cpf: '11122233344' }
    ],
    pacientes: [
      { nome: 'Marcos Alves', cpf: '22233344455', dataNascimento: '1980-05-20', telefone: '(71) 99444-5555' },
      { nome: 'Sandra Pereira', cpf: '33344455566', dataNascimento: '1975-09-14', telefone: '(71) 99555-6666' },
      { nome: 'Rafael Souza', cpf: '44455566677', dataNascimento: '1990-12-03', telefone: '(71) 99666-7777' }
    ]
  },
  {
    nome: 'Petshop Amigo Fiel',
    tipoSistema: 'petshop',
    cnpj: '34.567.890/0001-03',
    email: 'contato@amigofiel.com',
    telefone: '(71) 98987-6543',
    admin: { nome: 'Dra. Juliana', email: 'admin@amigofiel.com', senha: 'Pet@2026', cpf: '55566677788' },
    usuarios: [
      { nome: 'Dr. André', email: 'andre@amigofiel.com', role: 'atendente', cpf: '66677788899', especialidade: 'veterinario' },
      { nome: 'Camila', email: 'camila@amigofiel.com', role: 'auxiliar_administrativo', cpf: '77788899900', especialidade: 'tosador' }
    ],
    pets: [
      { nome: 'Rex', especie: 'Cachorro', raca: 'Labrador', tutorNome: 'Carlos Mendes' },
      { nome: 'Mimi', especie: 'Gato', raca: 'Siamês', tutorNome: 'Beatriz Rocha' },
      { nome: 'Thor', especie: 'Cachorro', raca: 'Pastor Alemão', tutorNome: 'Eduardo Dias' }
    ]
  }
];

async function up() {
  try {
    console.log('📡 Conectando ao banco...');
    await sequelize.authenticate();
    console.log('✅ Conectado. Iniciando seed...');

    for (const c of companies) {
      console.log(`\n🏢 Empresa: ${c.nome} (${c.tipoSistema})`);
      let empresa = await Empresa.findOne({ where: { nome: c.nome } });
      if (!empresa) {
        empresa = await Empresa.create({
          nome: c.nome,
          tipoSistema: c.tipoSistema,
          cnpj: c.cnpj,
          email: c.email,
          telefone: c.telefone,
          plano: 'basico',
          ativo: true
        });
        console.log('   ✅ Empresa criada');
      } else {
        console.log('   ℹ️ Empresa já existe');
      }

      const adminHash = await bcrypt.hash(c.admin.senha, 10);
      let admin = await Usuario.findOne({ where: { email: c.admin.email } });
      if (!admin) {
        admin = await Usuario.create({
          nome: c.admin.nome,
          email: c.admin.email,
          senha: adminHash,
          role: 'admin',
          cpf: c.admin.cpf,
          empresaId: empresa.id,
          ativo: true
        });
        console.log(`   ✅ Admin: ${c.admin.email}`);
      } else {
        await admin.update({ empresaId: empresa.id, senha: adminHash, ativo: true });
        console.log('   ℹ️ Admin atualizado');
      }

      for (const u of c.usuarios || []) {
        const hash = await bcrypt.hash('Senha@123', 10);
        let usr = await Usuario.findOne({ where: { email: u.email } });
        if (!usr) {
          usr = await Usuario.create({
            nome: u.nome,
            email: u.email,
            senha: hash,
            role: u.role,
            cpf: u.cpf,
            especialidade: u.especialidade || null,
            empresaId: empresa.id,
            ativo: true
          });
          console.log(`   ✅ Usuário criado: ${u.nome} (${u.role})`);
        } else {
          await usr.update({ empresaId: empresa.id, ativo: true });
          console.log(`   ℹ️ Usuário já existia: ${u.email}`);
        }
      }

      if (c.pacientes) {
        for (const p of c.pacientes) {
          let pac = await Paciente.findOne({ where: { cpf: p.cpf, empresaId: empresa.id } });
          if (!pac) {
            pac = await Paciente.create({
              nome: p.nome,
              cpf: p.cpf,
              dataNascimento: p.dataNascimento,
              telefone: p.telefone,
              empresaId: empresa.id
            });
            console.log(`   ✅ Paciente: ${p.nome}`);
          }
        }
      }

      if (c.pets) {
        for (const pet of c.pets) {
          let exist = await Pet.findOne({ where: { nome: pet.nome, empresaId: empresa.id } });
          if (!exist) {
            await Pet.create({
              nome: pet.nome,
              especie: pet.especie,
              raca: pet.raca,
              tutorNome: pet.tutorNome,
              empresaId: empresa.id
            });
            console.log(`   ✅ Pet: ${pet.nome}`);
          }
        }
      }

      // Criar 2 agendamentos de exemplo se não existirem
      const anyResp = await Usuario.findOne({ where: { empresaId: empresa.id, role: 'admin' } });
      const anyPac = await Paciente.findOne({ where: { empresaId: empresa.id } });
      if (anyResp && anyPac) {
        const base = Date.now();
        const slots = [new Date(base + 2*60*60*1000), new Date(base + 24*60*60*1000)];
        for (const dt of slots) {
          const exists = await Agendamento.findOne({ where: { empresaId: empresa.id, pacienteId: anyPac.id, dataHora: dt } });
          if (!exists) {
            await Agendamento.create({
              pacienteId: anyPac.id,
              empresaId: empresa.id,
              usuarioId: anyResp.id,
              titulo: 'Consulta de avaliação',
              descricao: 'Agendamento automático pelo seed',
              dataHora: dt,
              duracao: 30,
              tipo: c.tipoSistema === 'petshop' ? 'Atendimento Pet' : 'Consulta',
              status: 'agendado',
              local: 'Sala 1',
              participante: 'Equipe',
              observacoes: 'Gerado pelo seed'
            });
            console.log(`   ✅ Agendamento para ${anyPac.nome} em ${dt.toISOString()}`);
          }
        }
      }
    }

    console.log('\n🎉 Seed concluído.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed falhou:', err);
    process.exit(1);
  }
}

up();