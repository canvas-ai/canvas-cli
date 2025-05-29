'use strict';

import chalk from 'chalk';
import { ContextCommand } from './context.js';

/**
 * Contexts command (alias for context list)
 */
export class ContextsCommand extends ContextCommand {
    async execute(parsed) {
        try {
            this.options = parsed.options;

            // Collect client context for this execution
            this.collectClientContext();

            // Check if server is reachable
            await this.checkConnection();

            // For 'contexts' command, default action is 'list'
            const action = parsed.args[0] || 'list';
            let methodName;

            if (action === 'base-url') {
                methodName = 'handleBaseUrl';
            } else {
                methodName = `handle${action.charAt(0).toUpperCase() + action.slice(1)}`;
            }

            if (typeof this[methodName] === 'function') {
                return await this[methodName](parsed);
            } else {
                console.error(chalk.red(`Unknown action: ${action}`));
                this.showHelp();
                return 1;
            }
        } catch (error) {
            console.error(chalk.red('Error:'), error.message);
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            return 1;
        }
    }
}

export default ContextsCommand;
