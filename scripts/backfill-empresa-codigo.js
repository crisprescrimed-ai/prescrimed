import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import Empresa from '../models/Empresa.js';
import EmpresaSequencia from '../models/EmpresaSequencia.js';

function formatEmpresaCodigo(tipoSistema, numero) {
  const prefix = tipoSistema === 'petshop' ? 'Pet' : (tipoSistema === 'fisioterapia' ? 'Fisio' : 'Casa');
  const padded = String(numero).padStart(2, '0');
  return `${prefix}_${padded}`;
}

async function ensureEmpresasHasCodigoColumns() {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable('empresas');
  if (!columns?.codigo || !columns?.codigoNumero) {
    const missing = [!columns?.codigo ? 'codigo' : null, !columns?.codigoNumero ? 'codigoNumero' : null]
      .filter(Boolean)
      .join(', ');
    throw new Error(
      `Tabela 'empresas' não possui colunas esperadas (${missing}). ` +
      `Faça deploy/atualize schema antes do backfill.`
    );
  }
}

async function allocateNextNumero(tipoSistema, transaction) {
  const dialect = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : undefined;
  if (dialect === 'postgres') {
    const [rows] = await sequelize.query(
      `INSERT INTO empresa_sequencias ("tipoSistema", "ultimoNumero")
       VALUES (:tipoSistema, 1)
       ON CONFLICT ("tipoSistema")
       DO UPDATE SET "ultimoNumero" = empresa_sequencias."ultimoNumero" + 1
       RETURNING "ultimoNumero";`,
      { replacements: { tipoSistema }, transaction }
    );
    const numero = Array.isArray(rows) ? rows?.[0]?.ultimoNumero : rows?.ultimoNumero;
    return Number(numero);
  }

  const [seq] = await EmpresaSequencia.findOrCreate({
    where: { tipoSistema },
    defaults: { ultimoNumero: 0 },
    transaction
  });

  await seq.reload({ transaction, lock: transaction?.LOCK?.UPDATE });
  seq.ultimoNumero = Number(seq.ultimoNumero || 0) + 1;
  await seq.save({ transaction });
  return Number(seq.ultimoNumero);
}

async function seedSequenciasFromExistingMax(transaction) {
  const dialect = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : undefined;

  const rows = await Empresa.findAll({
    attributes: [
      'tipoSistema',
      [sequelize.fn('MAX', sequelize.col('codigoNumero')), 'maxCodigoNumero']
    ],
    group: ['tipoSistema'],
    raw: true,
    transaction
  });

  for (const row of rows) {
    const tipoSistema = row.tipoSistema || 'casa-repouso';
    const maxCodigoNumero = Number(row.maxCodigoNumero || 0);
    if (!Number.isFinite(maxCodigoNumero) || maxCodigoNumero <= 0) continue;

    if (dialect === 'postgres') {
      await sequelize.query(
        `INSERT INTO empresa_sequencias ("tipoSistema", "ultimoNumero")
         VALUES (:tipoSistema, :ultimoNumero)
         ON CONFLICT ("tipoSistema")
         DO UPDATE SET "ultimoNumero" = GREATEST(empresa_sequencias."ultimoNumero", EXCLUDED."ultimoNumero");`,
        { replacements: { tipoSistema, ultimoNumero: maxCodigoNumero }, transaction }
      );
      continue;
    }

    const [seq] = await EmpresaSequencia.findOrCreate({
      where: { tipoSistema },
      defaults: { ultimoNumero: 0 },
      transaction
    });

    const current = Number(seq.ultimoNumero || 0);
    if (maxCodigoNumero > current) {
      seq.ultimoNumero = maxCodigoNumero;
      await seq.save({ transaction });
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  if (help) {
    return { help: true };
  }

  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';

  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limitEnv = process.env.LIMIT;
  const limitRaw = (limitArg ? limitArg.split('=')[1] : null) ?? limitEnv;
  const limit = limitRaw ? Number(limitRaw) : null;

  return {
    help: false,
    dryRun,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null
  };
}

async function main() {
  const { help, dryRun, limit } = parseArgs();
  if (help) {
    console.log('Backfill de empresas: gera codigo/codigoNumero para registros antigos.');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/backfill-empresa-codigo.js [--dry-run] [--limit=100]');
    console.log('');
    console.log('Env vars:');
    console.log('  DRY_RUN=true   # não grava, só mostra o que faria');
    console.log('  LIMIT=100      # limita quantas empresas serão preenchidas');
    process.exit(0);
  }

  console.log('[backfill] Conectando ao banco...');
  await sequelize.authenticate();

  // Garante que a tabela de sequências existe (não altera empresas).
  await EmpresaSequencia.sync();
  await ensureEmpresasHasCodigoColumns();

  const dialect = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : undefined;
  console.log(`[backfill] Dialect: ${dialect || 'unknown'}`);

  const whereMissing = {
    [Op.or]: [{ codigo: null }, { codigoNumero: null }]
  };

  const totalMissing = await Empresa.count({ where: whereMissing });
  console.log(`[backfill] Empresas sem codigo/codigoNumero: ${totalMissing}`);

  if (totalMissing === 0) {
    console.log('[backfill] Nada a fazer ✅');
    process.exit(0);
  }

  const toProcess = await Empresa.findAll({
    where: whereMissing,
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
    limit: limit ?? undefined
  });

  console.log(`[backfill] Selecionadas para processamento: ${toProcess.length}${limit ? ` (limit=${limit})` : ''}`);

  if (dryRun) {
    const preview = toProcess.slice(0, 10).map((e) => ({
      id: e.id,
      nome: e.nome,
      tipoSistema: e.tipoSistema,
      createdAt: e.createdAt
    }));
    console.log('[backfill] DRY_RUN=true — preview (até 10):');
    console.table(preview);
    process.exit(0);
  }

  console.log('[backfill] Iniciando transação...');
  const result = await sequelize.transaction(async (transaction) => {
    // Protege a sequência contra drift (se já existirem codigosNumero preenchidos).
    await seedSequenciasFromExistingMax(transaction);

    let updated = 0;
    for (const empresa of toProcess) {
      const tipoSistema = empresa.tipoSistema || 'casa-repouso';

      // Se por algum motivo já foi preenchido em paralelo, pula.
      if (empresa.codigo && empresa.codigoNumero) continue;

      const numero = await allocateNextNumero(tipoSistema, transaction);
      const codigo = formatEmpresaCodigo(tipoSistema, numero);

      empresa.codigoNumero = numero;
      empresa.codigo = codigo;
      await empresa.save({ transaction, fields: ['codigoNumero', 'codigo'] });
      updated += 1;
    }

    return { updated };
  });

  console.log(`[backfill] Concluído ✅ Atualizadas: ${result.updated}`);
}

main().catch((err) => {
  console.error('[backfill] Falhou ❌');
  console.error(err);
  process.exit(1);
});
