# Canvas CLI Installation Script for Windows
# PowerShell script to install Canvas CLI on Windows

param(
    [switch]$Force,
    [string]$InstallPath = $null
)

Write-Host "🎨 Canvas CLI Installation (Windows)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Get the CLI directory (parent of scripts directory)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CliDir = Split-Path -Parent $ScriptDir
$BinDir = Join-Path $CliDir "bin"

# Check if we're in the right directory
if (-not (Test-Path $BinDir)) {
    Write-Host "❌ Error: bin directory not found at $BinDir" -ForegroundColor Red
    Write-Host "Please run this script from the Canvas CLI directory or its parent." -ForegroundColor Red
    exit 1
}

Write-Host "📁 CLI Directory: $CliDir" -ForegroundColor Green
Write-Host "📂 Bin Directory: $BinDir" -ForegroundColor Green
Write-Host ""

# Check Node.js installation
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green

    # Check if version is v20+
    $versionNum = [int]($nodeVersion -replace "v(\d+)\..*", '$1')
    if ($versionNum -lt 20) {
        Write-Host "⚠️  Warning: Node.js version $nodeVersion detected. Canvas CLI requires v20 or higher." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: Node.js not found. Please install Node.js v20 LTS or higher." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/en/download/" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Determine installation method
if ($InstallPath) {
    $TargetDir = $InstallPath
    Write-Host "🎯 Using custom installation path: $TargetDir" -ForegroundColor Cyan
} else {
    # Default to adding bin directory to PATH
    Write-Host "🎯 Adding Canvas CLI bin directory to PATH..." -ForegroundColor Cyan

    # Get current user PATH
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::User)

    # Check if bin directory is already in PATH
    if ($currentPath -split ';' -contains $BinDir) {
        Write-Host "✅ Canvas CLI bin directory is already in PATH" -ForegroundColor Green
    } else {
        Write-Host "📝 Adding $BinDir to user PATH..." -ForegroundColor Yellow

        try {
            $newPath = if ($currentPath) { "$currentPath;$BinDir" } else { $BinDir }
            [Environment]::SetEnvironmentVariable("PATH", $newPath, [EnvironmentVariableTarget]::User)
            Write-Host "✅ Successfully added to PATH" -ForegroundColor Green
            Write-Host "⚠️  Note: You may need to restart your terminal for PATH changes to take effect" -ForegroundColor Yellow
        } catch {
            Write-Host "❌ Error adding to PATH: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "You can manually add $BinDir to your PATH in System Environment Variables" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Make sure all scripts in bin are accessible
Write-Host "🔍 Checking Canvas CLI binaries..." -ForegroundColor Yellow
$binaries = @("canvas.js", "context.js", "ws.js", "q.js")

foreach ($binary in $binaries) {
    $binaryPath = Join-Path $BinDir $binary
    if (Test-Path $binaryPath) {
        Write-Host "   ✅ Found: $binary" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Missing: $binary" -ForegroundColor Red
    }
}

Write-Host ""

# Check for PM2
Write-Host "🔍 Checking for PM2..." -ForegroundColor Yellow
try {
    $pm2Version = pm2 --version
    Write-Host "✅ PM2 is installed ($pm2Version)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PM2 is not installed" -ForegroundColor Yellow
    Write-Host "   Install it for server management: npm install -g pm2" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test your installation by opening a new PowerShell/Command Prompt window and trying:" -ForegroundColor Cyan
Write-Host "  node `"$BinDir\canvas.js`" --version" -ForegroundColor White
Write-Host "  node `"$BinDir\q.js`" --help" -ForegroundColor White
Write-Host "  node `"$BinDir\ws.js`" list" -ForegroundColor White
Write-Host "  node `"$BinDir\context.js`" tree" -ForegroundColor White
Write-Host ""

if (-not $InstallPath) {
    Write-Host "After restarting your terminal, you should be able to use:" -ForegroundColor Cyan
    Write-Host "  canvas --version" -ForegroundColor White
    Write-Host "  q --help" -ForegroundColor White
    Write-Host "  ws list" -ForegroundColor White
    Write-Host "  context tree" -ForegroundColor White
    Write-Host ""
}

Write-Host "Quick start:" -ForegroundColor Cyan
Write-Host "  canvas server start    # Start local Canvas server" -ForegroundColor White
Write-Host "  canvas ws list         # List workspaces" -ForegroundColor White
Write-Host "  canvas ctx list        # List contexts" -ForegroundColor White
Write-Host ""
