# Script de Teste Completo do Sistema Prescrimed
Write-Host "🧪 TESTE COMPLETO DO SISTEMA PRESCRIMED" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = @{},
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testando: $Name" -ForegroundColor Yellow -NoNewline
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            Headers = $Headers
            ErrorAction = "Stop"
            TimeoutSec = 10
        }
        
        if ($Body.Count -gt 0) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host " ✅" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ❌ ($($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# 1. Teste de Conectividade
Write-Host "`n1️⃣  TESTE DE CONECTIVIDADE" -ForegroundColor Cyan
Write-Host "─────────────────────────────" -ForegroundColor Gray
if (Test-Endpoint "Servidor ativo" "$baseUrl/api/diagnostic/health") {
    $testsPassed++
} else {
    $testsFailed++
}

# 2. Login
Write-Host "`n2️⃣  TESTE DE AUTENTICAÇÃO" -ForegroundColor Cyan
Write-Host "─────────────────────────────" -ForegroundColor Gray

$loginBody = @{
    email = "admin@prescrimed.com"
    senha = "admin123"
}

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
    $token = $loginResponse.token
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    Write-Host "Login com admin@prescrimed.com" -ForegroundColor Yellow -NoNewline
    Write-Host " ✅" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "Login com admin@prescrimed.com ❌" -ForegroundColor Red
    $testsFailed++
    Write-Host "ERRO: Não foi possível fazer login. Abortando testes..." -ForegroundColor Red
    exit 1
}

# 3. Teste de Endpoints Protegidos
Write-Host "`n3️⃣  TESTE DE ENDPOINTS (COM AUTENTICAÇÃO)" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

$endpoints = @(
    @{ Name = "Dashboard"; Url = "$baseUrl/api/dashboard"; Method = "GET" }
    @{ Name = "Listar Pacientes"; Url = "$baseUrl/api/pacientes"; Method = "GET" }
    @{ Name = "Listar Prescrições"; Url = "$baseUrl/api/prescricoes"; Method = "GET" }
    @{ Name = "Listar Agendamentos"; Url = "$baseUrl/api/agendamentos"; Method = "GET" }
    @{ Name = "Listar Usuários"; Url = "$baseUrl/api/usuarios"; Method = "GET" }
    @{ Name = "Listar Leitos"; Url = "$baseUrl/api/casa-repouso/leitos"; Method = "GET" }
    @{ Name = "Listar Itens Estoque"; Url = "$baseUrl/api/estoque/itens"; Method = "GET" }
    @{ Name = "Listar Transações Financeiras"; Url = "$baseUrl/api/financeiro/transacoes"; Method = "GET" }
    @{ Name = "Listar Registros Enfermagem"; Url = "$baseUrl/api/enfermagem/registros"; Method = "GET" }
)

foreach ($endpoint in $endpoints) {
    if (Test-Endpoint $endpoint.Name $endpoint.Url $endpoint.Method @{} $headers) {
        $testsPassed++
    } else {
        $testsFailed++
    }
}

# 4. Teste de Banco de Dados
Write-Host "`n4️⃣  TESTE DE BANCO DE DADOS" -ForegroundColor Cyan
Write-Host "─────────────────────────────" -ForegroundColor Gray

try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET

    if ($health.database -eq "connected") {
        Write-Host "Conexão banco atual" -ForegroundColor Yellow -NoNewline
        Write-Host " ✅" -ForegroundColor Green
        $testsPassed++
        Write-Host "Estado reportado: $($health.database)" -ForegroundColor Gray
    } else {
        Write-Host "Conexão banco atual ❌" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "Conexão banco atual ❌" -ForegroundColor Red
    $testsFailed++
}

# 5. Teste de Criação de Paciente
Write-Host "`n5️⃣  TESTE DE CRIAÇÃO DE DADOS" -ForegroundColor Cyan
Write-Host "───────────────────────────────" -ForegroundColor Gray

$cpfsValidos = @(
    "529.982.247-25",
    "111.444.777-35",
    "935.411.347-80"
)

$novoPaciente = @{
    nome = "Paciente Teste $(Get-Random -Minimum 1000 -Maximum 9999)"
    cpf = $cpfsValidos | Get-Random
    dataNascimento = "1980-01-01"
    telefone = "(11) 98765-4321"
    email = "paciente.teste@example.com"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/pacientes" -Method POST -Body ($novoPaciente | ConvertTo-Json) -ContentType "application/json" -Headers $headers
    Write-Host "Criar novo paciente" -ForegroundColor Yellow -NoNewline
    Write-Host " ✅" -ForegroundColor Green
    Write-Host "  ID: $($response.id)" -ForegroundColor Gray
    $testsPassed++
} catch {
    Write-Host "Criar novo paciente ❌" -ForegroundColor Red
    $testsFailed++
}

# Resumo
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Testes aprovados: $testsPassed" -ForegroundColor Green
Write-Host "❌ Testes falhados:  $testsFailed" -ForegroundColor Red
Write-Host "📈 Total de testes:  $($testsPassed + $testsFailed)" -ForegroundColor Yellow

$successRate = [math]::Round(($testsPassed / ($testsPassed + $testsFailed)) * 100, 2)
Write-Host "🎯 Taxa de sucesso: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔗 Links Úteis:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:8000" -ForegroundColor White
Write-Host "   API:      http://localhost:8000/api" -ForegroundColor White
Write-Host "   Health:   http://localhost:8000/api/diagnostic/health" -ForegroundColor White
Write-Host "`n📧 Credenciais de Login:" -ForegroundColor Cyan
Write-Host "   Email: admin@prescrimed.com" -ForegroundColor White
Write-Host "   Senha: admin123" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($testsFailed -eq 0) {
    Write-Host "`n✨ TODOS OS TESTES PASSARAM! Sistema 100% funcional! 🎉" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Alguns testes falharam. Verifique os logs acima." -ForegroundColor Yellow
}

