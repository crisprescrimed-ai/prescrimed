import { sequelize } from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para criar/sincronizar todas as tabelas do banco de dados
 * Uso: node scripts/create-tables.js
 */

async function createTables() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso');

    console.log('📊 Criando/atualizando tabelas...');
    
    // Usar alter: true para atualizar estrutura existente
    // Usar force: true para recriar todas as tabelas (CUIDADO: apaga dados!)
    const forceRecreate = process.env.FORCE_RECREATE === 'true';
    
    if (forceRecreate) {
      console.warn('⚠️  AVISO: FORCE_RECREATE=true - Todas as tabelas serão APAGADAS e RECRIADAS!');
      console.warn('⚠️  Todos os dados serão PERDIDOS!');
      console.log('⏳ Aguardando 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const dialect = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : '';
    const canAlterSafely = dialect !== 'sqlite';

    await sequelize.sync({
      force: forceRecreate,
      // Em SQLite, alter costuma precisar recriar tabelas e pode falhar com FK.
      // Para atualizar schema no SQLite, prefira FORCE_RECREATE=true em ambiente local.
      alter: !forceRecreate && canAlterSafely,
    });

    console.log('✅ Tabelas criadas/sincronizadas com sucesso!');
    console.log('\n📋 Tabelas criadas:');
    console.log('  - empresas');
    console.log('  - usuarios');
    console.log('  - pacientes');
    console.log('  - prescricoes');
    console.log('  - agendamentos');
    console.log('  - casa_repouso_leitos');
    console.log('  - pets');
    console.log('  - sessoes_fisio');
    console.log('  - estoque_itens');
    console.log('  - estoque_movimentacoes');
    console.log('  - financeiro_transacoes');

    console.log('\n🔍 Verificando tabelas...');
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n✅ Tabelas encontradas no banco:');
    results.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    console.log('\n🎉 Processo concluído com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro ao criar tabelas:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('does not exist')) {
      console.error('\n💡 Dica: Verifique se DATABASE_URL está configurada corretamente');
      console.error('   Valor atual: ', process.env.DATABASE_URL ? 'Configurada' : 'NÃO CONFIGURADA');
    }
    
    process.exit(1);
  }
}

// Executar script
createTables();
