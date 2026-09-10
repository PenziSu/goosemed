# build-windows.ps1
# Build GooseMED Desktop for 64-bit Windows
# Run this script from the root of the goosemed repository in Developer PowerShell for VS 2022
#
# Prerequisites:
#   - Git (https://git-scm.com/download/win)
#   - Rust (https://rustup.rs)
#   - Node.js v24+ (https://nodejs.org)
#   - pnpm 10.30.3
#   - Visual Studio 2022 Build Tools: Desktop development with C++ and Windows 10/11 SDK
#
# Usage:
#   cd C:\path\to\goosemed
#   .\scripts\build-windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== GooseMED Windows Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

$missing = @()
if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) { $missing += "Rust (install from https://rustup.rs)" }
if (-not (Get-Command "rustup" -ErrorAction SilentlyContinue)) { $missing += "rustup (install from https://rustup.rs)" }
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) { $missing += "Node.js v24+ (install from https://nodejs.org)" }
if (-not (Get-Command "pnpm" -ErrorAction SilentlyContinue)) { $missing += "pnpm (run: npm install -g pnpm@10.30.3)" }
if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) { $missing += "Git (install from https://git-scm.com)" }
if (-not (Get-Command "cl.exe" -ErrorAction SilentlyContinue)) { $missing += "MSVC C++ Build Tools (run this script in Developer PowerShell for VS 2022)" }

if ($missing.Count -gt 0) {
    Write-Host "Missing prerequisites:" -ForegroundColor Red
    foreach ($m in $missing) {
        Write-Host "  - $m" -ForegroundColor Red
    }
    exit 1
}

Write-Host "  cargo: $(cargo --version)" -ForegroundColor Green
Write-Host "  node:  $(node --version)" -ForegroundColor Green
Write-Host "  pnpm:  $(pnpm --version)" -ForegroundColor Green
Write-Host ""

$runningProcesses = Get-Process -Name "GooseMED", "goose" -ErrorAction SilentlyContinue
if ($runningProcesses) {
    Write-Host "GooseMED or its backend is running. Close it before building so the script does not overwrite a live binary." -ForegroundColor Red
    exit 1
}

# Step 1: Clone or update repo
Write-Host "[2/7] Building Rust backend (release)..." -ForegroundColor Yellow
Write-Host "  This may take 5-15 minutes on first build..."
rustup target add x86_64-pc-windows-msvc
if ($LASTEXITCODE -ne 0) {
    Write-Host "Rust MSVC target installation failed!" -ForegroundColor Red
    exit 1
}
cargo build --release --target x86_64-pc-windows-msvc -p goose-cli --bin goose
if ($LASTEXITCODE -ne 0) {
    Write-Host "Rust build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Rust build complete." -ForegroundColor Green
Write-Host ""

# Step 2: Copy binaries
Write-Host "[3/7] Copying binaries to desktop app..." -ForegroundColor Yellow
$binDir = "ui\desktop\src\bin"
if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir -Force | Out-Null }

$gooseBinary = "target\x86_64-pc-windows-msvc\release\goose.exe"
if (-not (Test-Path $gooseBinary)) {
    Write-Host "Backend binary not found: $gooseBinary" -ForegroundColor Red
    exit 1
}
Copy-Item $gooseBinary "$binDir\" -Force
# Copy required DLLs if they exist (from cross-compilation)
Get-ChildItem "target\x86_64-pc-windows-msvc\release\*.dll" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName "$binDir\" -Force
}
Write-Host "  Binaries copied." -ForegroundColor Green
Write-Host ""

# Step 3: Install npm dependencies
Write-Host "[4/7] Installing npm dependencies..." -ForegroundColor Yellow
Push-Location "ui\desktop"
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  Dependencies installed." -ForegroundColor Green
Write-Host ""

# Step 4: Build desktop assets
Write-Host "[5/7] Building Goose ACP client, clearing Vite cache, and compiling i18n messages..." -ForegroundColor Yellow
pnpm run build-goose-acp-client
if ($LASTEXITCODE -ne 0) {
    Write-Host "Goose ACP client build or Vite cache cleanup failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
pnpm run i18n:compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "i18n compilation failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  Desktop assets built." -ForegroundColor Green
Write-Host ""

# Step 5: Package
Write-Host "[6/7] Packaging GooseMED Desktop..." -ForegroundColor Yellow
pnpm exec electron-forge package
if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  Packaging complete." -ForegroundColor Green
Write-Host ""

# Step 6: Make installer
Write-Host "[7/7] Creating Windows installer..." -ForegroundColor Yellow
pnpm exec electron-forge make
if ($LASTEXITCODE -ne 0) {
    Write-Host "Make failed! Trying with squirrel only..." -ForegroundColor Yellow
    pnpm exec electron-forge make --targets=@electron-forge/maker-squirrel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Fallback installer build also failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Pop-Location
Write-Host ""

# Done
Write-Host "=== Build Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Packaged app:  ui\desktop\out\GooseMED-win32-x64\GooseMED.exe" -ForegroundColor Green
Write-Host "Installer:     ui\desktop\out\make\" -ForegroundColor Green
Write-Host ""
Write-Host "To run the app directly:" -ForegroundColor Yellow
Write-Host "  .\ui\desktop\out\GooseMED-win32-x64\GooseMED.exe"
Write-Host ""
Write-Host "To install, find the .exe installer in ui\desktop\out\make\"
