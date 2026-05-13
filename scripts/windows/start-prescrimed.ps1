# Script PowerShell para rodar Prescrimed em modo produção
# Carrega variáveis do .env, faz build do frontend e inicia o backend

if (Test-Path .env) {
    Write-Host "Carregando variáveis do .env..."
    Get-Content .env | ForEach-Object {
        if ($_ -match '^(\w+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value)
        }
    }
}

$env:NODE_ENV = "production"

if (-not $env:DATABASE_URL -and -not $env:PGHOST) {
    Write-Error "Defina DATABASE_URL ou PGHOST/PGUSER/PGPASSWORD/PGDATABASE antes de iniciar em produção."
    exit 1
}

Write-Host "Iniciando build do frontend..."
cmd /c "npm run build:client"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha no build do frontend."
    exit $LASTEXITCODE
}

Write-Host "Iniciando backend Prescrimed em modo produção..."
node server.js
