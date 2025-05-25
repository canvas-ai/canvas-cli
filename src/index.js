#!/usr/bin/env node
'use strict';

import minimist from 'minimist';
import chalk from 'chalk';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

// Utils
import config from './utils/config.js';
import { parseInput, exit } from './utils/common.js';
import { setupDebug } from './utils/debug.js';

// Commands
import WorkspaceCommand from './commands/workspace.js';
import ContextCommand from './commands/context.js';
import DocumentCommand from './commands/document.js';
import AuthCommand from './commands/auth.js';
import ConfigCommand from './commands/config.js';
import ServerCommand from './commands/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const debug = setupDebug('canvas:cli');

/**
 * CLI Commands Registry
 */
const COMMANDS = {
  workspace: WorkspaceCommand,
  ws: WorkspaceCommand, // alias
  context: ContextCommand,
  ctx: ContextCommand, // alias
  document: DocumentCommand,
  doc: DocumentCommand, // alias
  note: DocumentCommand, // alias for document with note schema
  file: DocumentCommand, // alias for document with file schema
  todo: DocumentCommand, // alias for document with todo schema
  email: DocumentCommand, // alias for document with email schema
  tab: DocumentCommand, // alias for document with tab schema
  auth: AuthCommand,
  config: ConfigCommand,
  server: ServerCommand,
  help: null, // handled separately
  version: null // handled separately
};

/**
 * Main CLI entry point
 */
export async function main(argv = process.argv.slice(2)) {
  try {
    const args = minimist(argv, {
      string: ['context', 'workspace', 'format', 'title', 'tag', 'schema'],
      boolean: ['help', 'version', 'raw', 'verbose', 'debug'],
      alias: {
        h: 'help',
        v: 'version',
        c: 'context',
        w: 'workspace',
        f: 'format',
        t: 'title',
        s: 'schema',
        r: 'raw',
        d: 'debug'
      }
    });

    // Handle debug flag
    if (args.debug || args.verbose) {
      process.env.DEBUG = 'canvas:*';
      setupDebug('canvas:*');
    }

    debug('CLI args:', args);

    // Handle version
    if (args.version) {
      console.log(`${pkg.name} v${pkg.version}`);
      return 0;
    }

    // Handle help
    if (args.help || args._.length === 0) {
      showHelp();
      return 0;
    }

    // Parse input
    const parsed = parseInput(args);
    const command = parsed.command;

    debug('Parsed command:', command);
    debug('Parsed args:', parsed);

    // Handle stdin data
    let stdinData = null;
    if (!process.stdin.isTTY) {
      stdinData = await readStdin();
      parsed.data = stdinData;
    }

    // Route to appropriate command handler
    if (!COMMANDS[command]) {
      console.error(chalk.red(`Unknown command: ${command}`));
      console.error(chalk.yellow('Run "canvas help" for available commands'));
      return 1;
    }

    const CommandClass = COMMANDS[command];
    const commandInstance = new CommandClass(config);

    // Set schema based on command alias
    if (['note', 'file', 'todo', 'email', 'tab'].includes(command)) {
      parsed.options.schema = command;
    }

    const exitCode = await commandInstance.execute(parsed);
    return exitCode;

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    return 1;
  }
}

/**
 * Read data from stdin
 */
async function readStdin() {
  return new Promise((resolve) => {
    let chunks = [];
    process.stdin.on('data', data => chunks.push(data));
    process.stdin.on('end', () => resolve(chunks.join('')));
  });
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.bold(`${pkg.name} v${pkg.version}`));
  console.log(chalk.gray(pkg.description));
  console.log();

  console.log(chalk.bold('Usage:'));
  console.log('  canvas <command> [options] [arguments]');
  console.log();

  console.log(chalk.bold('Commands:'));
  console.log('  workspace, ws     Manage workspaces');
  console.log('  context, ctx      Manage contexts');
  console.log('  document, doc     Manage documents');
  console.log('  note              Add/manage notes (document with note schema)');
  console.log('  file              Add/manage files (document with file schema)');
  console.log('  todo              Add/manage todos (document with todo schema)');
  console.log('  email             Add/manage emails (document with email schema)');
  console.log('  tab               Add/manage tabs (document with tab schema)');
  console.log('  auth              Manage authentication');
  console.log('  config            Manage configuration');
  console.log('  server            Manage local Canvas server (PM2)');
  console.log();

  console.log(chalk.bold('Global Options:'));
  console.log('  -h, --help        Show help');
  console.log('  -v, --version     Show version');
  console.log('  -c, --context     Set context');
  console.log('  -w, --workspace   Set workspace');
  console.log('  -f, --format      Output format (table, json, csv)');
  console.log('  -r, --raw         Raw JSON output');
  console.log('  -d, --debug       Enable debug output');
  console.log();

  console.log(chalk.bold('Examples:'));
  console.log('  canvas server start');
  console.log('  canvas workspace list');
  console.log('  canvas context create /work/project');
  console.log('  canvas note add --title "Meeting notes" < notes.txt');
  console.log('  canvas file add ./script.sh --title "Deploy script"');
  console.log('  cat log.txt | canvas note add --title "Error logs"');
  console.log();

  console.log(chalk.bold('Configuration:'));
  console.log(`  Config file: ${config.path}`);
  console.log('  canvas config show');
  console.log('  canvas config set server.url http://localhost:8001/rest/v2');
}

export default main;
