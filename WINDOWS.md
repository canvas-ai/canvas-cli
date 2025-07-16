# Windows Compatibility Guide

This document explains the Windows-specific fixes and optimizations for Canvas CLI.

## Issues Addressed

### 1. Config File Location
- **Problem**: Config files were created in `.canvas/` instead of `.canvas/config/`
- **Solution**: Modified `src/utils/config.js` to place CLI config files in proper subdirectory:
  - `remotes.json` → `.canvas/config/remotes.json`
  - `contexts.json` → `.canvas/config/contexts.json`
  - `workspaces.json` → `.canvas/config/workspaces.json`
  - `session-cli.json` → `.canvas/config/session-cli.json`

### 2. Console Output on Windows
- **Problem**: Bundled Windows executable created config files but showed no text output
- **Solution**: Created `src/utils/windows-compat.js` with:
  - Early initialization of Windows console compatibility
  - Forced color support activation
  - Console method fallbacks for bundled executables
  - Proper TTY detection
  - UTF-8 encoding setup

### 3. Bundle Size Optimization
- **Problem**: Bun builds were larger (115MB) compared to npm builds (61MB)
- **Solutions**:
  - Added `bunfig.toml` with optimization settings
  - Enabled minification in build scripts
  - Configured tree shaking
  - Excluded unused Bun features

## Build Scripts

### Optimized Builds (Recommended)
```bash
# All platforms with optimizations and icons
npm run build:safe

# Individual platforms (safe with icons)
npm run build:safe:linux      # Linux x64 (minified + icon)
npm run build:safe:macos      # macOS x64 (minified + icon)
npm run build:safe:windows    # Windows x64 (minified + icon)

# Direct builds (faster, manual icon generation needed)
npm run build:linux      # Linux x64 (minified)
npm run build:macos      # macOS x64 (minified)
npm run build:windows    # Windows x64 (minified)
```

### Debug Builds
```bash
# Windows debug build (no minification)
npm run build:windows-debug

# Development build (current platform)
npm run build:dev
```

### Icon Generation
Canvas CLI uses custom icons for better Windows integration:

```bash
# Generate platform-specific icons
npm run generate:icons

# Clean generated icons
npm run clean:icons
```

**Requirements for proper icon generation:**
- ImageMagick: `choco install imagemagick` (Windows) or use WSL with Linux tools
- Source file: `assets/logo_64x64.png` (provided)

**Generated icons:**
- `assets/icons/canvas.ico` - Windows multi-size icon
- `assets/icons/canvas.icns` - macOS icon bundle  
- `assets/icons/canvas.png` - Linux icon

If icon generation fails, builds will use the source PNG as fallback.

## Windows-Specific Features

### Platform Detection
The CLI automatically detects Windows and applies compatibility fixes:

```bash
# Show platform information
canvas --version --debug
```

### Debug Information
On Windows builds, the version command shows additional platform info:
- Platform and architecture
- OS release
- Bundled executable detection
- Console capabilities
- TTY detection status

### Compatibility Fixes Applied
1. **Console Output**: Safe console methods with stdout/stderr fallbacks
2. **Color Support**: Force-enabled color output for better UX
3. **TTY Detection**: Proper terminal detection in bundled executables
4. **Encoding**: UTF-8 encoding for proper text display

## Bundle Size Comparison

| Build Type | Size | Description |
|------------|------|-------------|
| npm build (original) | ~61MB | Standard build |
| bun build (unoptimized) | ~115MB | Large due to unused features |
| bun build (optimized) | ~65-70MB | With minification and tree shaking |
| bun build (debug) | ~110MB | No minification, for debugging |

## Configuration Files

The Canvas CLI creates configuration files in the following structure:

```
~/.canvas/
├── config/
│   ├── canvas-cli.json      # Main config (Conf library)
│   ├── remotes.json         # Remote servers
│   ├── contexts.json        # Cached contexts
│   ├── workspaces.json      # Cached workspaces
│   └── session-cli.json     # Current session
└── logs/                    # Log files (if any)
```

## Troubleshooting Windows Issues

### No Output Displayed
If the Windows executable runs but shows no output:

1. **Check Console**: Try running in different console environments:
   - Command Prompt (cmd)
   - PowerShell
   - Windows Terminal
   - Git Bash

2. **Force Color**: Set environment variable:
   ```cmd
   set FORCE_COLOR=1
   canvas --version
   ```

3. **Debug Mode**: Enable debug output:
   ```cmd
   canvas --debug --version
   ```

### Large Bundle Size
If bundle size is still too large:

1. **Use Optimized Build**:
   ```bash
   npm run build:optimized
   ```

2. **Check Dependencies**: Large dependencies can be excluded in `bunfig.toml`

3. **Profile Bundle**: Use bun's bundle analyzer:
   ```bash
   bun build --compile --analyze ./src/index.js
   ```

### Console Encoding Issues
If text appears garbled:

1. **Set Console Code Page**:
   ```cmd
   chcp 65001
   canvas --version
   ```

2. **Check Terminal Settings**: Ensure your terminal supports UTF-8

## Testing Windows Builds

### Local Testing
```bash
# Build Windows executable
npm run build:windows

# Test basic functionality
dist/canvas-windows.exe --version
dist/canvas-windows.exe config show
dist/canvas-windows.exe --help
```

### Debug Build Testing
```bash
# Build debug version for troubleshooting
npm run build:windows-debug

# Test with debug output
dist/canvas-windows-debug.exe --debug --version
```

### Cross-Platform Testing
The same source code works across platforms. Test core functionality:

```bash
# Test config management
canvas config show
canvas config set test.value "hello"
canvas config get test.value

# Test help system
canvas --help
canvas context --help

# Test error handling
canvas unknown-command
```

## Future Improvements

- [ ] Further bundle size optimization
- [ ] Windows installer package
- [ ] Code signing for Windows executables
- [ ] Auto-update mechanism
- [ ] Windows-specific shell integration 
