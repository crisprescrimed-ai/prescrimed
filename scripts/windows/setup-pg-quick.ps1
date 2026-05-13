# Setup rápido do PostgreSQL local com usuário prescrimed
# Pressupõe que você saiba a senha do usuário postgres

param(
  [string]$PostgresPassword = "",
  [string]$NewUser = "prescrimed",
  [string]$NewPassword = "",
  [string]$Database = "prescrimed",
  [string]$PsqlPath = "",
  [int]$Port = 5432
)

function Resolve-PsqlPath {
  param([string]$ExplicitPath)
  if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
    if (Test-Path $ExplicitPath) { return $ExplicitPath }
    throw "psql.exe não encontrado em: $ExplicitPath"
  }

  $candidates = @(
    Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { Join-Path $_.FullName 'bin\psql.exe' } |
      Where-Object { Test-Path $_ }
  )

  if (-not $candidates -or $candidates.Count -eq 0) {
    throw "Não foi possível localizar o psql.exe. Instale o PostgreSQL ou informe -PsqlPath." 
  }

  # Seleciona a maior versão (por pasta) quando possível
  $best = $candidates |
    Sort-Object {
      $m = [regex]::Match($_, 'PostgreSQL\\(\d+)')
      if ($m.Success) { [int]$m.Groups[1].Value } else { 0 }
    } -Descending |
    Select-Object -First 1

  return $best
}

if ([string]::IsNullOrWhiteSpace($NewPassword)) {
  # Mantém um padrão local, mas sem imprimir a senha no final
  $NewPassword = "prescrimed-local-2026"
}

$psql = Resolve-PsqlPath -ExplicitPath $PsqlPath

if ([string]::IsNullOrWhiteSpace($PostgresPassword)) {
  Write-Host "Informe a senha do usuário postgres:" -ForegroundColor Yellow
  $sec = Read-Host -AsSecureString
  $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

$env:PGPASSWORD = $PostgresPassword

try {
  Write-Host "Criando usuário $NewUser..." -ForegroundColor Cyan
  & $psql -h localhost -p $Port -U postgres -d postgres --no-password -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$NewUser') THEN CREATE ROLE $NewUser WITH LOGIN PASSWORD '$NewPassword'; END IF; END `$`$;"
  
  Write-Host "Concedendo permissões de criação de DB..." -ForegroundColor Cyan
  & $psql -h localhost -p $Port -U postgres -d postgres --no-password -c "ALTER ROLE $NewUser WITH CREATEDB;"
  
  Write-Host "Criando database $Database..." -ForegroundColor Cyan
  # CREATE DATABASE não pode rodar dentro de DO/transaction. Fazemos check e criamos fora.
  $exists = & $psql -h localhost -p $Port -U postgres -d postgres --no-password -tAc "SELECT 1 FROM pg_database WHERE datname='$Database'" 2>$null
  if (-not $exists) {
    & $psql -h localhost -p $Port -U postgres -d postgres --no-password -c "CREATE DATABASE $Database OWNER $NewUser;"
  } else {
    Write-Host "Database já existe: $Database" -ForegroundColor DarkYellow
  }
  
  Write-Host "" 
  Write-Host "Configuração concluída!" -ForegroundColor Green
  Write-Host "Usuário: $NewUser" -ForegroundColor Yellow
  Write-Host "Database: $Database" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Defina as variáveis de ambiente:" -ForegroundColor Cyan
  Write-Host "`$env:PGHOST='localhost'; `$env:PGPORT='$Port'; `$env:PGUSER='$NewUser'; `$env:PGPASSWORD='(sua-senha)'; `$env:PGDATABASE='$Database'"
}
catch {
  Write-Error "Erro na configuração: $_"
  exit 1
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
