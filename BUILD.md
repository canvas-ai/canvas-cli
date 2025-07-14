# Canvas CLI Binary Builds

This document explains how to build standalone Canvas CLI binaries for distribution.

## Prerequisites

- [Bun](https://bun.sh) installed on your system
- Node.js dependencies installed (`npm install`)

## Building Binaries

### Development Build (Current Platform)
```bash
npm run build:dev
```
Creates `dist/canvas-dev` for the current platform.

### Production Builds

#### All Platforms
```bash
npm run build:all
```
Builds for Linux, macOS, and Windows.

#### Individual Platforms
```bash
# Linux x64
npm run build:linux

# Linux ARM64  
npm run build:linux-arm

# macOS x64
npm run build:macos

# macOS ARM64 (Apple Silicon)
npm run build:macos-arm

# Windows x64
npm run build:windows
```

### Clean Build Directory
```bash
npm run clean
```

## Binary Outputs

| Platform | Output File | Target |
|----------|------------|---------|
| Linux x64 | `dist/canvas-linux` | `bun-linux-x64` |
| Linux ARM64 | `dist/canvas-linux-arm` | `bun-linux-arm64` |
| macOS x64 | `dist/canvas-macos` | `bun-darwin-x64` |
| macOS ARM64 | `dist/canvas-macos-arm` | `bun-darwin-arm64` |
| Windows x64 | `dist/canvas-windows.exe` | `bun-windows-x64` |

## Usage

Once built, the binaries are completely standalone and don't require Node.js, Bun, or any other runtime to be installed on the target system.

### Example Usage
```bash
# Linux/macOS
./dist/canvas-linux --version
./dist/canvas-linux config show
./dist/canvas-linux q "Hello Canvas!"

# Windows
dist\canvas-windows.exe --version
dist\canvas-windows.exe config show
dist\canvas-windows.exe q "Hello Canvas!"
```

## Distribution

The binaries can be:
- Distributed via GitHub Releases
- Packaged in system-specific installers
- Deployed to cloud environments
- Shared as single-file executables

## Binary Size

The compiled binaries are approximately ~100MB due to including the complete Bun runtime. This ensures they work on any compatible system without dependencies.

## Features

All Canvas CLI features work in the compiled binaries:
- ✅ Full command-line interface
- ✅ Configuration management
- ✅ Canvas server communication
- ✅ AI assistant integration
- ✅ Context and workspace management
- ✅ Debug and logging capabilities

## Future Plans

We plan to implement:
- Automatic binary uploads to GitHub Releases
- Code signing for macOS and Windows
- Smaller binary sizes through optimization
- Auto-update mechanisms 
