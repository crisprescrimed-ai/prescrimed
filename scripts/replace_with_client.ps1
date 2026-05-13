Param(
    [string]$BranchName = "replace-with-client",
    [switch]$Push
)

$ErrorActionPreference = "Stop"

Write-Host "Iniciando: branch=$BranchName push=$Push"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git nao encontrado no PATH. Instale git antes de continuar."
    exit 1
}

if (-not (Test-Path ".git")) {
    Write-Error "O diretorio atual nao parece ser um repositorio git (nao foi encontrado .git). Execute este script na raiz do repositorio."
    exit 1
}

$Root = Get-Location
$ClientDir = Join-Path $Root "client"
$TempDir = Join-Path $Root ".tmp_client_deploy"

if (-not (Test-Path $ClientDir)) {
    Write-Error "Diretorio 'client' nao encontrado em $ClientDir"
    exit 1
}

# Criar/alternar para a branch
# Usa 'git branch --list' que funciona mesmo sem commits
$branchExistsOutput = git branch --list $BranchName 2>$null
$branchExists = ""
if ($branchExistsOutput) { $branchExists = $branchExistsOutput.Trim() }
if ($branchExists -ne '') {
    Write-Host "Branch $BranchName existe - fazendo checkout"
    git checkout $BranchName
} else {
    Write-Host "Criando branch $BranchName"
    git checkout -b $BranchName
}

# Preparar diretório temporário
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Path $TempDir | Out-Null

Write-Host "Copiando conteudos de client/ para $TempDir"
Get-ChildItem -Path (Join-Path $ClientDir "*") -Force | ForEach-Object {
    if ($_.PSIsContainer) { Copy-Item -Path $_.FullName -Destination (Join-Path $TempDir $_.Name) -Recurse -Force }
    else { Copy-Item -Path $_.FullName -Destination (Join-Path $TempDir $_.Name) -Force }
}

# Remover arquivos existentes na raiz, preservando .git, .github se existir, e a pasta scripts
$excludes = @('.git', '.github', '.tmp_client_deploy', 'scripts')
Write-Host "Removendo arquivos existentes (excluindo: $($excludes -join ', '))"
Get-ChildItem -Force | Where-Object { $excludes -notcontains $_.Name } | ForEach-Object {
    Write-Host "Removendo $($_.FullName)"
    Remove-Item -Recurse -Force $_.FullName
}

Write-Host "Movendo novos arquivos para a raiz do repositorio"
Get-ChildItem -Path $TempDir -Force | ForEach-Object {
    $dest = Join-Path $Root $_.Name
    Move-Item -Path $_.FullName -Destination $dest -Force
}

# Limpar temporario
Remove-Item -Recurse -Force $TempDir

Write-Host "Fazendo git add e commit"
git add -A
if ((git status --porcelain) -ne '') {
    git commit -m "Replace repository contents with client directory"
    Write-Host "Commit realizado na branch $BranchName"
} else {
    Write-Host "Sem mudancas para commitar"
}

if ($Push) {
    Write-Host "Tentando push para origin/$BranchName"
    git push -u origin $BranchName
    Write-Host "Push concluido (se autenticado)"
} else {
    Write-Host "Branch pronta: execute 'git push -u origin $BranchName' para subir as mudancas"
}

Write-Host "Concluido"
