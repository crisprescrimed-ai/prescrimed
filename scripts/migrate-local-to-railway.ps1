# Full migration: Local Postgres -> Railway Postgres (OVERWRITE)
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/migrate-local-to-railway.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/migrate-local-to-railway.ps1 -RailwayDatabaseUrl "postgresql://..." -Force
#
# Requires: pg_dump.exe and pg_restore.exe (installed with PostgreSQL)
# This script overwrites the destination database by default.

param(
  [string]$RailwayDatabaseUrl = "",
  [string]$LocalDatabaseUrl = "",
  [switch]$Force,
  [string]$OutFile = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Protect-DbUrl([string]$url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return "" }
  return ($url -replace ":[^:@]+@", ":***@")
}

function Get-EnvFromDotEnv([string]$key) {
  $envPath = Join-Path $PSScriptRoot "..\.env"
  if (-not (Test-Path $envPath)) { return $null }

  $lines = Get-Content $envPath -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    if ($line -match "^\s*$key\s*=\s*(.+)\s*$") {
      $val = $Matches[1].Trim()
      if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
        $val = $val.Substring(1, $val.Length - 2)
      }
      return $val
    }
  }
  return $null
}

function Set-DbUrlSslMode([string]$url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return $url }
  try {
    $u = [System.Uri]::new($url)
    $dbHost = $u.Host.ToLowerInvariant()
    $isLocal = ($dbHost -eq 'localhost' -or $dbHost -eq '127.0.0.1' -or $dbHost -eq '::1')
    if ($isLocal) { return $url }

    if ($url -match "sslmode=") { return $url }
    if ($url -match "\?") { return "$url&sslmode=require" }
    return "$url?sslmode=require"
  } catch {
    return $url
  }
}

function Find-PgTool([string]$exeName) {
  $cmd = Get-Command $exeName -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Path }

  $roots = @(
    "C:\Program Files\PostgreSQL",
    "C:\Program Files (x86)\PostgreSQL"
  )

  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $candidates = Get-ChildItem -Path $root -Filter $exeName -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match "\\bin\\" } |
      Sort-Object FullName -Descending

    if ($candidates -and $candidates.Count -gt 0) {
      return $candidates[0].FullName
    }
  }

  return $null
}

function Is-RailwayInjected() {
  if ($env:RAILWAY_ENVIRONMENT) { return $true }
  if ($env:DATABASE_PUBLIC_URL) { return $true }
  if ($env:DATABASE_URL -and ($env:DATABASE_URL -match "railway\.internal" -or $env:DATABASE_URL -match "rlwy\.net" -or $env:DATABASE_URL -match "railway\.")) { return $true }
  return $false
}

$railwayInjected = Is-RailwayInjected

# Resolve local URL
if ([string]::IsNullOrWhiteSpace($LocalDatabaseUrl)) {
  # Prefer .env when running under `railway run`, because Railway injects DATABASE_URL for the target.
  $fromDotEnv = Get-EnvFromDotEnv "DATABASE_URL"
  if (-not [string]::IsNullOrWhiteSpace($fromDotEnv)) {
    $LocalDatabaseUrl = $fromDotEnv
  } elseif (-not $railwayInjected -and $env:DATABASE_URL) {
    $LocalDatabaseUrl = $env:DATABASE_URL
  }
}

# Special case: when running via `railway run`
# - Railway CLI injects DATABASE_URL (Railway) into the process.
# - Local source is provided explicitly via -LocalDatabaseUrl.
# So if the destination wasn't provided, reuse env:DATABASE_URL as destination.
if ([string]::IsNullOrWhiteSpace($RailwayDatabaseUrl)) {
  # Prefer public URL when present (needed for running pg_restore from your machine).
  $candidate = $env:DATABASE_PUBLIC_URL
  if ([string]::IsNullOrWhiteSpace($candidate)) { $candidate = $env:RAILWAY_DATABASE_URL }
  if ([string]::IsNullOrWhiteSpace($candidate)) { $candidate = $env:DATABASE_URL_RAILWAY }
  if ([string]::IsNullOrWhiteSpace($candidate)) { $candidate = $env:DATABASE_URL }

  if (-not [string]::IsNullOrWhiteSpace($candidate)) {
    $looksLikeRailway = ($candidate -match "rlwy\.net" -or $candidate -match "railway\.")
    $isDifferentFromLocal = ($candidate -ne $LocalDatabaseUrl)
    if ($looksLikeRailway -and $isDifferentFromLocal) {
      $RailwayDatabaseUrl = $candidate
    }
  }
}

# Fallback envs / prompt
if ([string]::IsNullOrWhiteSpace($RailwayDatabaseUrl)) {
  if ($env:RAILWAY_DATABASE_URL) {
    $RailwayDatabaseUrl = $env:RAILWAY_DATABASE_URL
  } elseif ($env:DATABASE_URL_RAILWAY) {
    $RailwayDatabaseUrl = $env:DATABASE_URL_RAILWAY
  } else {
    $RailwayDatabaseUrl = Read-Host "Paste Railway DATABASE_URL (destination)"
  }
}

if ([string]::IsNullOrWhiteSpace($LocalDatabaseUrl)) {
  throw "LocalDatabaseUrl not found. Set DATABASE_URL in env or in .env (local database)."
}
if ([string]::IsNullOrWhiteSpace($RailwayDatabaseUrl)) {
  throw "RailwayDatabaseUrl not provided. Use -RailwayDatabaseUrl or set RAILWAY_DATABASE_URL."
}

$RailwayDatabaseUrl = Set-DbUrlSslMode $RailwayDatabaseUrl

Write-Host ("Source (local):  {0}" -f (Protect-DbUrl $LocalDatabaseUrl)) -ForegroundColor Cyan
Write-Host ("Target (railway): {0}" -f (Protect-DbUrl $RailwayDatabaseUrl)) -ForegroundColor Cyan

if (-not $Force) {
  Write-Host "`nWARNING: this will overwrite the destination (Railway) database." -ForegroundColor Yellow
  $confirm = Read-Host "Type CONFIRMO to continue"
  if ($confirm -ne "CONFIRMO") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
  }
}

$pgDump = Find-PgTool "pg_dump.exe"
$pgRestore = Find-PgTool "pg_restore.exe"

if (-not $pgDump -or -not $pgRestore) {
  throw "pg_dump.exe/pg_restore.exe not found. Install PostgreSQL tools or add them to PATH."
}

Write-Host ("pg_dump: {0}" -f $pgDump) -ForegroundColor DarkGray
Write-Host ("pg_restore: {0}" -f $pgRestore) -ForegroundColor DarkGray

if ([string]::IsNullOrWhiteSpace($OutFile)) {
  $outDir = Join-Path $PSScriptRoot "..\data\export"
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutFile = Join-Path $outDir ("prescrimed-local-{0}.dump" -f $stamp)
}

Write-Host "`nDumping local database..." -ForegroundColor Yellow
& $pgDump --format=custom --no-owner --no-privileges --verbose --dbname "$LocalDatabaseUrl" --file "$OutFile"

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $OutFile)) {
  throw "Dump failed (file not found): $OutFile"
}

try {
  $fi = Get-Item $OutFile -ErrorAction Stop
  if ($fi.Length -le 0) {
    throw "Dump file is empty: $OutFile"
  }
} catch {
  throw $_
}

Write-Host ("Dump file: {0}" -f $OutFile) -ForegroundColor Green

Write-Host "`nRestoring into Railway (overwrite)..." -ForegroundColor Yellow
& $pgRestore --clean --if-exists --no-owner --no-privileges --verbose --dbname "$RailwayDatabaseUrl" "$OutFile"

if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed with exit code $LASTEXITCODE"
}

Write-Host "`nMigration completed successfully." -ForegroundColor Green
Write-Host "Tip: run node scripts/check-railway-tables.js with DATABASE_URL_OVERRIDE pointing to Railway to validate." -ForegroundColor Cyan
