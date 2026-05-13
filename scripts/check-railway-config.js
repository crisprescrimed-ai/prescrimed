#!/usr/bin/env node
/**
 * Script de Diagnóstico de Configuração do Railway
 * 
 * Verifica se todas as variáveis de ambiente necessárias
 * estão configuradas corretamente para deploy no Railway.
 * 
 * Uso:
 *   node scripts/check-railway-config.js
 */

const requiredVars = [
  { key: 'DATABASE_URL', description: 'URL de conexão com PostgreSQL do Railway', critical: true },
  { key: 'JWT_SECRET', description: 'Secret para tokens JWT (mínimo 32 caracteres)', critical: true },
  { key: 'JWT_REFRESH_SECRET', description: 'Secret para refresh tokens', critical: false },
  { key: 'NODE_ENV', description: 'Ambiente de execução (production recomendado)', critical: false },
];

const optionalVars = [
  { key: 'FRONTEND_URL', description: 'URL do frontend para CORS' },
  { key: 'CORS_ORIGIN', description: 'Origem CORS adicional' },
  { key: 'PORT', description: 'Porta do servidor (Railway/Nixpacks define automaticamente; evite configurar manualmente)' },
  { key: 'FORCE_SYNC', description: 'Sincronizar schema no boot (apenas primeiro deploy)' },
  { key: 'SEED_MINIMAL', description: 'Criar dados demo no boot (apenas primeiro deploy)' },
];

console.log('🔍 Verificando configuração do Railway...\n');

let hasErrors = false;
let hasWarnings = false;

// Verificar variáveis obrigatórias
console.log('📋 Variáveis Obrigatórias:');
for (const v of requiredVars) {
  const value = process.env[v.key];
  const status = value ? '✅' : (v.critical ? '❌' : '⚠️');
  
  if (!value && v.critical) hasErrors = true;
  if (!value && !v.critical) hasWarnings = true;

  console.log(`  ${status} ${v.key}`);
  console.log(`     ${v.description}`);
  
  if (value) {
    // Validações específicas
    if (v.key === 'DATABASE_URL') {
      if (!value.startsWith('postgres')) {
        console.log(`     ⚠️ Valor não parece ser PostgreSQL`);
        hasWarnings = true;
      }
    }
    if (v.key === 'JWT_SECRET' || v.key === 'JWT_REFRESH_SECRET') {
      if (value.length < 32) {
        console.log(`     ⚠️ Secret muito curto (mínimo 32 caracteres recomendado)`);
        hasWarnings = true;
      }
      if (value.includes('dev-') || value.includes('change-me')) {
        console.log(`     ❌ Secret padrão de desenvolvimento detectado!`);
        hasErrors = true;
      }
    }
  } else {
    console.log(`     ℹ️ Não configurada`);
  }
  console.log();
}

// Verificar variáveis opcionais
console.log('\n📦 Variáveis Opcionais:');
for (const v of optionalVars) {
  const value = process.env[v.key];
  const status = value ? '✅' : 'ℹ️';
  
  console.log(`  ${status} ${v.key}: ${value || 'não configurada'}`);
  console.log(`     ${v.description}`);

  if (v.key === 'PORT' && value) {
    const raw = String(value).trim();
    const parsed = Number.parseInt(raw, 10);
    const valid = Number.isFinite(parsed) && !Number.isNaN(parsed) && parsed >= 0 && parsed <= 65535 && String(parsed) === raw;
    if (!valid) {
      console.log('     ❌ PORT inválida: deve ser um inteiro entre 0 e 65535 (ex.: 8080)');
      console.log('     💡 Dica: em Railway/Nixpacks, remova a variável PORT e deixe a plataforma definir automaticamente');
      hasErrors = true;
    }
  }
  console.log();
}

// Resumo
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ ERRO: Configuração incompleta ou incorreta');
  console.log('\nNo Railway:');
  console.log('1. Vá em Settings → Variables');
  console.log('2. Adicione as variáveis marcadas com ❌');
  console.log('3. Para DATABASE_URL: adicione um PostgreSQL no projeto e copie a URL');
  console.log('4. Para JWT secrets: gere valores seguros com:');
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.log('\n5. Redeploy o serviço após adicionar as variáveis');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️ AVISO: Algumas configurações podem ser melhoradas');
  console.log('Sistema deve funcionar, mas revise os avisos acima.');
  process.exit(0);
} else {
  console.log('✅ Configuração OK! Railway está pronto para deploy.');
  process.exit(0);
}
