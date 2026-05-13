<#
Remove MySQL and SQLite from Windows (services, files) safely.
Run PowerShell as Administrator.
#>

Write-Host "Desinstalação de bancos (MySQL/SQLite) iniciada..." -ForegroundColor Cyan

# Fechar Node e apps que usam os bancos
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Remover arquivo SQLite local do projeto (se existir)
$sqlitePath = Join-Path $PSScriptRoot "database.sqlite"
if (Test-Path $sqlitePath) {
  Remove-Item -Force $sqlitePath -ErrorAction SilentlyContinue
  Write-Host "SQLite local removido: $sqlitePath" -ForegroundColor Yellow
}

# Tentar desinstalar MySQL via winget
try {
  Write-Host "Tentando desinstalar MySQL via winget..." -ForegroundColor Yellow
  winget uninstall --id Oracle.MySQL -h --silent | Out-Null
} catch {}

# Remover serviço MySQL (se registrado)
try {
  $svc = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
  if ($svc) {
    foreach ($s in $svc) {
      Write-Host "Parando serviço: $($s.Name)" -ForegroundColor Yellow
      Stop-Service $s.Name -Force -ErrorAction SilentlyContinue
      sc.exe delete $s.Name | Out-Null
      Write-Host "Serviço removido: $($s.Name)" -ForegroundColor Green
    }
  }
} catch {}

# Remover possíveis pastas padrão do MySQL
$paths = @("C:\\Program Files\\MySQL", "C:\\Program Files (x86)\\MySQL", "C:\\MySQL")
foreach ($p in $paths) {
  if (Test-Path $p) {
    try { Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue; Write-Host "Pasta removida: $p" -ForegroundColor Green } catch {}
  }
}

Write-Host "Concluído. PostgreSQL permanece como único banco." -ForegroundColor Cyan
