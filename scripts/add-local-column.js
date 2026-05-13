import sequelize from '../config/database.js';

async function addLocalColumn() {
  try {
    console.log('🔧 Verificando coluna "local" em "agendamentos"...');

    // Detecta o dialeto em uso
    const dialect = sequelize.getDialect();

    if (dialect === 'mysql') {
      // Função util para checar/adicionar coluna no MySQL
      const ensureColumn = async (columnName, definitionSql, after) => {
        const [rows] = await sequelize.query(`
          SELECT COUNT(*) AS cnt
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'agendamentos'
            AND COLUMN_NAME = '${columnName}'
        `);
        const exists = Array.isArray(rows) ? (rows[0]?.cnt > 0) : false;
        if (exists) {
          console.log(`✅ Coluna ${columnName} já existe (MySQL).`);
        } else {
          console.log(`➕ Adicionando coluna ${columnName} (MySQL)...`);
          const afterClause = after ? ` AFTER ${after}` : '';
          await sequelize.query(`ALTER TABLE agendamentos ADD COLUMN ${definitionSql}${afterClause}`);
          console.log(`✅ Coluna ${columnName} adicionada (MySQL).`);
        }
      };

      await ensureColumn('local', 'local VARCHAR(255) NULL', 'status');
      await ensureColumn('participante', 'participante VARCHAR(255) NULL', 'local');
    } else if (dialect === 'postgres') {
      // Verifica e adiciona colunas no PostgreSQL
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agendamentos' AND column_name = 'local'
          ) THEN
            ALTER TABLE public.agendamentos ADD COLUMN local VARCHAR(255);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'agendamentos' AND column_name = 'participante'
          ) THEN
            ALTER TABLE public.agendamentos ADD COLUMN participante VARCHAR(255);
          END IF;
        END$$;
      `);
      console.log('✅ Colunas local/participante verificadas/adicionadas (PostgreSQL).');
    } else if (dialect === 'sqlite') {
      // Para SQLite, o ALTER TABLE ADD COLUMN é simples e idempotente se coluna não existir
      console.log('ℹ️ SQLite detectado. Tentando adicionar coluna (ignorar se já existir)...');
      try {
        await sequelize.query(`ALTER TABLE agendamentos ADD COLUMN local TEXT`);
        await sequelize.query(`ALTER TABLE agendamentos ADD COLUMN participante TEXT`);
        console.log('✅ Colunas local/participante adicionadas (SQLite).');
      } catch (e) {
        console.log('ℹ️ Possivelmente coluna já existia no SQLite. Mensagem:', e.message);
      }
    } else {
      console.log(`⚠️ Dialeto não tratado explicitamente: ${dialect}. Nenhuma ação realizada.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao ajustar coluna local:', error);
    process.exit(1);
  }
}

addLocalColumn();
