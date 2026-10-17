<#
.SYNOPSIS
  One-command setup and verification for the Enterprise Core template.

.DESCRIPTION
  Turns the manual onboarding steps into a single, repeatable command:
    1. Checks the Node.js version.
    2. Creates missing local env files from .env.example (never overwrites).
    3. Installs dependencies exactly as locked (npm ci; npm install if no lockfile).
    4. Generates the MSW service worker if missing.
    5. Installs the Playwright browser.
    6. Runs the definition of done: typecheck, lint, unit tests, production build.
    7. Runs the end-to-end suite (automated browser checklist).

  Safe to re-run at any time.

.EXAMPLE
  ./setup.ps1                 # full setup + verify + e2e
  ./setup.ps1 -SkipE2E        # skip Playwright install and e2e run
  ./setup.ps1 -SkipVerify     # only install and prepare files
  npm run setup               # same as ./setup.ps1 (bypasses execution policy)
#>
[CmdletBinding()]
param(
  [switch]$SkipE2E,
  [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Write-Step([string]$Message) {
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked([string]$Command, [string[]]$Arguments) {
  Write-Host "    $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "'$Command $($Arguments -join ' ')' failed with exit code $LASTEXITCODE."
  }
}

function Copy-EnvIfMissing([string]$Target, [hashtable]$Overrides) {
  if (Test-Path $Target) {
    Write-Host "    $Target exists - left unchanged."
    return
  }
  $content = Get-Content -Path '.env.example' -Raw
  foreach ($key in $Overrides.Keys) {
    $content = [regex]::Replace($content, "(?m)^$key=.*$", "$key=$($Overrides[$key])")
  }
  Set-Content -Path $Target -Value $content -NoNewline -Encoding utf8
  Write-Host "    Created $Target from .env.example." -ForegroundColor Green
}

# 1. Node.js -------------------------------------------------------------------
Write-Step 'Checking Node.js'
$nodeVersion = (& node --version) 2>$null
if (-not $nodeVersion) { throw 'Node.js is not installed. Install the current LTS from https://nodejs.org.' }
$parts = $nodeVersion.TrimStart('v').Split('.') | ForEach-Object { [int]$_ }
$major = $parts[0]; $minor = $parts[1]
$supported = ($major -ge 24) -or ($major -eq 22 -and $minor -ge 13) -or ($major -eq 20 -and $minor -ge 19)
if (-not $supported) { throw "Node $nodeVersion is not supported. Required: ^20.19, ^22.13 or >=24." }
Write-Host "    Node $nodeVersion OK"

# 2. Env files ------------------------------------------------------------------
Write-Step 'Preparing environment files'
# Development: mock backend on, so the app runs without a server.
Copy-EnvIfMissing '.env.development' @{ 'VITE_ENABLE_MOCKS' = 'true' }
# Production build needs values to pass validation; .local is git-ignored.
if (-not (Test-Path '.env.production') -and -not (Test-Path '.env.production.local')) {
  Copy-EnvIfMissing '.env.production.local' @{}
  Write-Host '    Edit .env.production.local with real production values before deploying.' -ForegroundColor Yellow
}

# 3. Dependencies ---------------------------------------------------------------
Write-Step 'Installing dependencies'
if (Test-Path 'package-lock.json') { Invoke-Checked 'npm' @('ci') } else { Invoke-Checked 'npm' @('install') }

# 4. Mock service worker --------------------------------------------------------
Write-Step 'Mock Service Worker'
if (Test-Path 'public/mockServiceWorker.js') {
  Write-Host '    public/mockServiceWorker.js present.'
} else {
  Invoke-Checked 'npx' @('msw', 'init', 'public', '--save')
}

# 5. Playwright browser ---------------------------------------------------------
if (-not $SkipE2E) {
  Write-Step 'Installing Playwright browser (Chromium)'
  Invoke-Checked 'npx' @('playwright', 'install', 'chromium')
}

# 6-7. Verification -------------------------------------------------------------
if (-not $SkipVerify) {
  Write-Step 'Definition of done: typecheck, lint, unit tests, build'
  Invoke-Checked 'npm' @('run', 'verify')

  if (-not $SkipE2E) {
    Write-Step 'End-to-end suite (automated browser checklist)'
    Invoke-Checked 'npm' @('run', 'test:e2e')
  }
}

Write-Host ''
Write-Host 'Setup complete. Start the app with: npm run dev' -ForegroundColor Green
Write-Host 'Mock users: admin/admin, manager/manager, viewer/viewer'
