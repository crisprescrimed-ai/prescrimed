import { sequelize } from '../models/index.js';

async function run() {
  const dialect = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : 'unknown';
  console.log(`🔧 Ajustando coluna 'tipo' em agendamentos (dialeto: ${dialect})...`);
  try {
    if (dialect === 'mysql') {
      await sequelize.query("ALTER TABLE `agendamentos` MODIFY COLUMN `tipo` VARCHAR(50) NULL");
    } else if (dialect === 'postgres') {
      await sequelize.query("ALTER TABLE \"agendamentos\" ALTER COLUMN \"tipo\" TYPE VARCHAR(50)");
    } else if (dialect === 'sqlite') {
      // SQLite não suporta ALTER COLUMN facilmente; recriação seria necessária.
      // Como DataTypes.STRING padrão já comporta textos, normalmente não é necessário.
      console.log('ℹ️ SQLite: nenhuma ação necessária.');
    } else {
      console.warn('⚠️ Dialeto não reconhecido; nenhuma alteração aplicada.');
    }
    console.log('✅ Coluna tipo ajustada com sucesso.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Falha ao ajustar coluna tipo:', e?.message || e);
    process.exit(1);
  }
}

run();
