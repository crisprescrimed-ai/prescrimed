Param(
  [string]$DatabaseUrl
)

Write-Host "🚂 Seed em Railway (Postgres)" -ForegroundColor Cyan

if (-not $DatabaseUrl -and -not $env:DATABASE_URL) {
  $DatabaseUrl = Read-Host "Cole sua DATABASE_URL (Railway)"
}

if (-not $DatabaseUrl -and -not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL não informada. Passe via parâmetro -DatabaseUrl ou defina no ambiente."
  exit 1
}

if ($DatabaseUrl) {
  $env:DATABASE_URL = $DatabaseUrl
}

Write-Host "🔑 DATABASE_URL definida (tamanho: $($env:DATABASE_URL.Length))" -ForegroundColor Green

Write-Host "🔍 Testando acesso Postgres (ping simples via Sequelize)…" -ForegroundColor Yellow

try {
  node -e "import('../config/database.js').then(m=>m.default.authenticate().then(()=>console.log('OK')).catch(e=>{console.error('FAIL');process.exit(1)}))" | Out-String | Write-Host
} catch {
  Write-Error "Falha ao autenticar no Postgres: $_"
  exit 1
}

Write-Host "📦 Executando seed multi-empresa…" -ForegroundColor Yellow
try {
  node "scripts/seed-multi-company.js"
  if ($LASTEXITCODE -ne 0) { throw "Seed retornou código $LASTEXITCODE" }
  Write-Host "✅ Seed concluído com sucesso no Railway." -ForegroundColor Green
} catch {
  Write-Error "❌ Seed falhou: $_"
  exit 1
}

Write-Host "🧪 Executando cenários reais (Prescrições, Estoque, Evolução, Financeiro)…" -ForegroundColor Yellow
try {
  node "scripts/seed-domain-scenarios.js"
  if ($LASTEXITCODE -ne 0) { throw "Cenários retornaram código $LASTEXITCODE" }
  Write-Host "✅ Cenários concluídos com sucesso no Railway." -ForegroundColor Green
} catch {
  Write-Error "❌ Cenários falharam: $_"
  exit 1
}

Write-Host "🔧 Ajustando coluna 'tipo' em agendamentos…" -ForegroundColor Yellow
try {
  node "scripts/alter-agendamento-tipo.js"
  if ($LASTEXITCODE -ne 0) { throw "Alter retornou código $LASTEXITCODE" }
  Write-Host "✅ Coluna 'tipo' ajustada." -ForegroundColor Green
} catch {
  Write-Error "❌ Alter da coluna 'tipo' falhou: $_"
  exit 1
}

Write-Host "🗓️ Inserindo agendamentos para todos os tipos…" -ForegroundColor Yellow
try {
  node "scripts/seed-agendamentos-tipos.js"
  if ($LASTEXITCODE -ne 0) { throw "Seed tipos retornou código $LASTEXITCODE" }
  Write-Host "✅ Agendamentos por tipo criados no Railway." -ForegroundColor Green
} catch {
  Write-Error "❌ Seed de agendamentos por tipo falhou: $_"
  exit 1
}

Write-Host "🩺 Verifique sua aplicação: https://prescrimed.up.railway.app/health" -ForegroundColor Cyan