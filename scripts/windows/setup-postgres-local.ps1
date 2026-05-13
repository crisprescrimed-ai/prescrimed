param(
  [string]$PgVersion = "",
  [string]$User = "prescrimed",
  [string]$Password = "prescrimed-local-2026",
  [string]$Database = "prescrimed",
  [int]$Port = 5432
)

function Resolve-PgVersion {
  param([string]$Explicit)
  if (-not [string]::IsNullOrWhiteSpace($Explicit)) { return $Explicit }
  if (-not (Test-Path "C:\Program Files\PostgreSQL")) { return "16" }

  $dirs = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue
  if (-not $dirs) { return "16" }
  $best = $dirs |
    Sort-Object { 
      $n = 0
      if ([int]::TryParse($_.Name, [ref]$n)) { $n } else { 0 }
    } -Descending |
    Select-Object -First 1
  return $best.Name
}

function Assert-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    throw "Execute este script em um PowerShell aberto como Administrador."
  }
}

try {
  Assert-Admin
  $PgVersion = Resolve-PgVersion -Explicit $PgVersion
  $svcName = "postgresql-x64-$PgVersion"
  $pgRoot  = "C:\Program Files\PostgreSQL\$PgVersion"
  $pgData  = Join-Path $pgRoot 'data'
  $bin     = Join-Path $pgRoot 'bin'

  if (-not (Test-Path (Join-Path $bin 'psql.exe'))) {
    throw "psql.exe não encontrado em $bin. Verifique se o PostgreSQL $PgVersion está instalado."
  }

  Write-Host "Configurando PostgreSQL $PgVersion (svc: $svcName) ..." -ForegroundColor Cyan

  # 1) Habilitar trust local temporário
  $hba = Join-Path $pgData 'pg_hba.conf'
  if (-not (Test-Path $hba)) { throw "pg_hba.conf não encontrado em $pgData" }
  Copy-Item $hba "$hba.bak" -Force
  $trust = "host all all 127.0.0.1/32 trust`r`nhost all all ::1/128 trust`r`n"
  $orig  = Get-Content $hba -Raw
  if ($orig -notmatch '127.0.0.1/32 trust') {
    Set-Content -Path $hba -Value ($trust + $orig) -Encoding ASCII
    Restart-Service $svcName -Force
    Start-Sleep -Seconds 2
  }

  # 2) Criar usuário e base
  $psql = Join-Path $bin 'psql.exe'
  & $psql -h localhost -p $Port -U postgres -d postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='$User') THEN EXECUTE 'CREATE ROLE $User WITH LOGIN PASSWORD ''''$Password''''';'; END IF; END $$;" | Out-Null
  & $psql -h localhost -p $Port -U postgres -d postgres -c "ALTER ROLE $User WITH CREATEDB;" | Out-Null
  & $psql -h localhost -p $Port -U postgres -d postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='$Database') THEN EXECUTE 'CREATE DATABASE $Database OWNER $User'; END IF; END $$;" | Out-Null

  # 3) Restaurar pg_hba.conf original
  Copy-Item "$hba.bak" $hba -Force
  Restart-Service $svcName -Force
  Start-Sleep -Seconds 2

  Write-Host "PostgreSQL configurado. Usuário '$User' e DB '$Database' prontos." -ForegroundColor Green
  Write-Host "Dica: defina variáveis para o backend nesta sessão:" -ForegroundColor Yellow
  Write-Host "$env:PGHOST='localhost'; $env:PGPORT='5432'; $env:PGUSER='$User'; $env:PGPASSWORD='$Password'; $env:PGDATABASE='$Database'"
}
catch {
  Write-Error $_
  exit 1
}
