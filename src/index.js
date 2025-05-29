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
import ContextsCommand from './commands/contexts.js';
import AuthCommand from './commands/auth.js';
import ConfigCommand from './commands/config.js';
import ServerCommand from './commands/server.js';
import QCommand from './commands/q.js';

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
  contexts: ContextsCommand, // alias for context list
  ctx: ContextCommand, // alias
  auth: AuthCommand,
  config: ConfigCommand,
  server: ServerCommand,
  q: QCommand, // AI query command
  help: null, // handled separately
  version: null // handled separately
};

/**
 * Main CLI entry point
 */
export async function main(argv = process.argv.slice(2)) {
  try {
    const args = minimist(argv, {
      string: ['context', 'workspace', 'format', 'title', 'tag', 'schema', 'connector', 'model', 'template', 'max-tokens'],
      boolean: ['help', 'version', 'raw', 'verbose', 'debug', 'code', 'quiet', 'show-prompt', 'show-prompt-only'],
      alias: {
        h: 'help',
        v: 'version',
        c: 'context',
        w: 'workspace',
        f: 'format',
        t: 'title',
        s: 'schema',
        r: 'raw',
        d: 'debug',
        q: 'quiet'
      }
    });

    // Handle debug flag
    if (args.debug || args.verbose) {
      process.env.DEBUG = 'canvas:*';
      setupDebug('canvas:*'); // Re-initialize debug with the new setting
    }

    debug('CLI args:', args);

    // Handle version
    if (args.version) {
      console.log(`${pkg.name} v${pkg.version}`);
      return 0;
    }

    const commandNameFromArgs = args._[0];

    // Case 1: A specific command is invoked with --help
    if (commandNameFromArgs && COMMANDS[commandNameFromArgs] && args.help) {
      const CommandClass = COMMANDS[commandNameFromArgs];
      const commandInstance = new CommandClass(config);
      if (typeof commandInstance.showHelp === 'function') {
        commandInstance.showHelp();
      } else {
        // Fallback if command has no specific help
        console.log(chalk.yellow(`No specific help defined for command '${commandNameFromArgs}'. Showing general help.`));
        showHelp();
      }
      return 0;
    }

    // Case 2: A specific command is invoked (not for --help, that's handled above)
    // This also covers 'canvas <command> help' (where 'help' is an argument handled by the command's execute method)
    if (commandNameFromArgs && COMMANDS[commandNameFromArgs]) {
      const CommandClass = COMMANDS[commandNameFromArgs];
      const commandInstance = new CommandClass(config);

      const parsedInput = parseInput(args); // parseInput needs full args for context
      let stdinData = null;
      if (!process.stdin.isTTY) {
        stdinData = await readStdin();
        parsedInput.data = stdinData; // Attach stdin data to the object passed to execute
      }

      const exitCode = await commandInstance.execute(parsedInput);
      return exitCode;
    }

    // Case 3: General help (--help with no command, or no command at all)
    if (args.help || args._.length === 0) {
      showHelp();
      return 0;
    }

    // Case 4: Unknown command
    if (commandNameFromArgs && !COMMANDS[commandNameFromArgs]) {
      console.error(chalk.red(`Unknown command: ${commandNameFromArgs}`));
      console.error(chalk.yellow(`Run "canvas --help" for available commands.`));
      return 1;
    }

    // Fallback: Should ideally be caught by args._.length === 0 if no command
    // or if a non-command argument is passed without a valid command.
    showHelp();
    return 0;

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
  console.log('  contexts          List all contexts (alias)');
  console.log('  auth              Manage authentication');
  console.log('  config            Manage configuration');
  console.log('  server            Manage local Canvas server (PM2)');
  console.log('  q                 AI assistant (context-aware)');
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
  console.log('  canvas ws                           # List workspaces');
  console.log('  canvas ws universe                  # Show universe workspace');
  console.log('  canvas ws universe tree             # Show workspace tree');
  console.log('  canvas context                      # Show current context');
  console.log('  canvas contexts                     # List all contexts');
  console.log('  canvas context create my-project');
  console.log('  canvas context switch my-project');
  console.log('  canvas context documents');
  console.log('  canvas context tabs');
  console.log('  canvas context notes                # List notes');
  console.log('  canvas context note add "Remember to check logs" --title "Important"');
  console.log('  canvas context tab add https://example.com --title "Example Site"');
  console.log('  canvas ws universe documents        # List workspace documents');
  console.log('  canvas ws universe tabs             # List workspace tabs');
  console.log('  canvas q "How do I create a new context?"');
  console.log('  cat error.log | canvas q "What does this error mean?"');
  console.log();

  console.log(chalk.bold('Configuration:'));
  console.log(`  Config file: ${config.path}`);
  console.log('  canvas config show');
  console.log('  canvas config set server.url http://localhost:8001/rest/v2');
}

export default main;

// Execute main function if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(process.exit).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
