@echo off
setlocal enabledelayedexpansion

:: Canvas CLI Installation Script for Windows (Command Prompt)
echo.
echo 🎨 Canvas CLI Installation (Windows)
echo ====================================
echo.

:: Get the CLI directory (parent of scripts directory)
set "SCRIPT_DIR=%~dp0"
set "CLI_DIR=%SCRIPT_DIR%..\"
set "BIN_DIR=%CLI_DIR%bin"

:: Remove trailing backslash
if "%CLI_DIR:~-1%"=="\" set "CLI_DIR=%CLI_DIR:~0,-1%"

:: Check if we're in the right directory
if not exist "%BIN_DIR%" (
    echo ❌ Error: bin directory not found at %BIN_DIR%
    echo Please run this script from the Canvas CLI directory or its parent.
    pause
    exit /b 1
)

echo 📁 CLI Directory: %CLI_DIR%
echo 📂 Bin Directory: %BIN_DIR%
echo.

:: Check Node.js installation
echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js found: !NODE_VERSION!

    :: Extract major version number
    set "VERSION_NUM=!NODE_VERSION:v=!"
    for /f "delims=." %%a in ("!VERSION_NUM!") do set "MAJOR_VERSION=%%a"

    if !MAJOR_VERSION! lss 20 (
        echo ⚠️  Warning: Node.js version !NODE_VERSION! detected. Canvas CLI requires v20 or higher.
    )
) else (
    echo ❌ Error: Node.js not found. Please install Node.js v20 LTS or higher.
    echo Download from: https://nodejs.org/en/download/
    pause
    exit /b 1
)

echo.

:: Add bin directory to PATH
echo 🎯 Adding Canvas CLI bin directory to PATH...

:: Get current user PATH
for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "CURRENT_PATH=%%b"

:: Check if bin directory is already in PATH
echo !CURRENT_PATH! | findstr /C:"%BIN_DIR%" >nul
if !errorlevel! equ 0 (
    echo ✅ Canvas CLI bin directory is already in PATH
) else (
    echo 📝 Adding %BIN_DIR% to user PATH...

    if defined CURRENT_PATH (
        set "NEW_PATH=!CURRENT_PATH!;%BIN_DIR%"
    ) else (
        set "NEW_PATH=%BIN_DIR%"
    )

    :: Set the new PATH
    setx PATH "!NEW_PATH!" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Successfully added to PATH
        echo ⚠️  Note: You may need to restart your terminal for PATH changes to take effect
    ) else (
        echo ❌ Error adding to PATH. You can manually add %BIN_DIR% to your PATH in System Environment Variables
    )
)

echo.

:: Check Canvas CLI binaries
echo 🔍 Checking Canvas CLI binaries...
for %%f in (canvas.js context.js ws.js q.js) do (
    if exist "%BIN_DIR%\%%f" (
        echo    ✅ Found: %%f
    ) else (
        echo    ❌ Missing: %%f
    )
)

echo.

:: Check for PM2
echo 🔍 Checking for PM2...
pm2 --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('pm2 --version') do set PM2_VERSION=%%i
    echo ✅ PM2 is installed (!PM2_VERSION!)
) else (
    echo ⚠️  PM2 is not installed
    echo    Install it for server management: npm install -g pm2
)

echo.
echo 🎉 Installation complete!
echo.
echo Test your installation by opening a new Command Prompt window and trying:
echo   node "%BIN_DIR%\canvas.js" --version
echo   node "%BIN_DIR%\q.js" --help
echo   node "%BIN_DIR%\ws.js" list
echo   node "%BIN_DIR%\context.js" tree
echo.
echo After restarting your terminal, you should be able to use:
echo   canvas --version
echo   q --help
echo   ws list
echo   context tree
echo.
echo Quick start:
echo   canvas server start    # Start local Canvas server
echo   canvas ws list         # List workspaces
echo   canvas ctx list        # List contexts
echo.

pause
