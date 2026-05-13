# Script para gerar configuracoes Railway
# Execute: .\setup-railway.ps1

Write-Host "`nGerando chaves JWT seguras..." -ForegroundColor Cyan

# Gerar JWT_SECRET
$jwtSecret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
Write-Host "`nJWT_SECRET gerada:" -ForegroundColor Green
Write-Host $jwtSecret -ForegroundColor Yellow

# Gerar JWT_REFRESH_SECRET  
$jwtRefresh = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
Write-Host "`nJWT_REFRESH_SECRET gerada:" -ForegroundColor Green
Write-Host $jwtRefresh -ForegroundColor Yellow

# Criar arquivo com as variaveis
$filePath = Join-Path $PSScriptRoot ".railway-env.txt"
$envContent = @"
# ===================================
# Railway - Variaveis de Ambiente
# ===================================
# Copie e cole no Railway Dashboard -> Settings -> Variables

# OBRIGATORIO: JWT Secrets (geradas automaticamente)
JWT_SECRET=$jwtSecret
JWT_REFRESH_SECRET=$jwtRefresh

# OBRIGATORIO: Ambiente
NODE_ENV=production

# OBRIGATORIO: CORS
ALLOWED_ORIGINS=https://prescrimed.up.railway.app

# OPCIONAL: Timeout de sessao
SESSION_TIMEOUT=8h

# OBSERVACAO: DATABASE_URL e criada automaticamente pelo plugin PostgreSQL
# Nao adicione manualmente!
"@

# Salvar em arquivo
$envContent | Out-File -FilePath $filePath -Encoding UTF8

Write-Host "`nConfiguracoes salvas em: .railway-env.txt" -ForegroundColor Green
Write-Host "`nProximos passos:" -ForegroundColor Cyan
Write-Host "1. Abra o Railway Dashboard" -ForegroundColor White
Write-Host "2. Va em Settings -> Variables" -ForegroundColor White
Write-Host "3. Copie e cole as variaveis do arquivo .railway-env.txt" -ForegroundColor White
Write-Host "4. Adicione o plugin PostgreSQL (+ New -> Database -> PostgreSQL)" -ForegroundColor White
Write-Host "5. Faca Redeploy do servico" -ForegroundColor White
Write-Host "`nDepois execute: node scripts/seed-production-data.js" -ForegroundColor Magenta
Write-Host "`nConcluido!`n" -ForegroundColor Green
