#!/usr/bin/env node
/**
 * Script de migração para converter tabelas de INTEGER para UUID
 * 
 * ATENÇÃO: Este script é DESTRUTIVO e apagará dados das tabelas:
 * - FinanceiroTransacoes
 * - EstoqueItens
 * - EstoqueMovimentacoes
 * 
 * Execute apenas em ambientes de desenvolvimento/staging ou se tiver backup!
 */

import sequelize from '../config/database.js';
import { FinanceiroTransacao, EstoqueItem, EstoqueMovimentacao } from '../models/index.js';

async function migrate() {
  console.log('🔄 Iniciando migração UUID...\n');

  try {
    // Conecta ao banco
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    const queryInterface = sequelize.getQueryInterface();
    const dialect = sequelize.getDialect();

    console.log(`📊 Dialect: ${dialect}\n`);

    if (dialect === 'postgres') {
      console.log('🗑️  Removendo tabelas antigas (Postgres)...');
      
      // Remove as tabelas na ordem correta (dependências primeiro)
      await queryInterface.dropTable('EstoqueMovimentacoes', { cascade: true, force: true });
      console.log('  ✓ EstoqueMovimentacoes removida');
      
      await queryInterface.dropTable('FinanceiroTransacoes', { cascade: true, force: true });
      console.log('  ✓ FinanceiroTransacoes removida');
      
      await queryInterface.dropTable('EstoqueItens', { cascade: true, force: true });
      console.log('  ✓ EstoqueItens removida');

      console.log('\n♻️  Recriando tabelas com UUID...');
      
      // Recria as tabelas com o novo schema
      await sequelize.sync({ force: false });
      console.log('  ✓ Tabelas recriadas com UUID');

    } else if (dialect === 'sqlite') {
      console.log('🗑️  Removendo e recriando banco SQLite...');
      
      // Em SQLite, é mais fácil recriar tudo
      await sequelize.sync({ force: true });
      console.log('  ✓ Banco SQLite recriado');
    } else {
      throw new Error(`Dialect ${dialect} não suportado para migração`);
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n⚠️  IMPORTANTE: As tabelas foram recriadas e todos os dados anteriores foram perdidos.');
    console.log('Se você tinha dados importantes, restaure-os do backup agora.\n');

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Solicita confirmação antes de executar
const args = process.argv.slice(2);
const confirmed = args.includes('--confirm') || args.includes('-y');

if (!confirmed) {
  console.error('⚠️  ATENÇÃO: Este script apagará dados das tabelas FinanceiroTransacoes, EstoqueItens e EstoqueMovimentacoes!');
  console.error('\nPara executar, use: node scripts/migrate-uuid.js --confirm');
  process.exit(1);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
