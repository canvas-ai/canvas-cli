'use strict';

import chalk from 'chalk';
import { CanvasApiClient } from '../utils/api-client.js';
import { createFormatter } from '../utils/formatters.js';
import { setupDebug } from '../utils/debug.js';

const debug = setupDebug('canvas:cli:command');

/**
 * Base command class
 */
export class BaseCommand {
    constructor(config) {
        this.config = config;
        this.apiClient = new CanvasApiClient(config);
        this.debug = debug;
    }

    /**
     * Execute the command
     * @param {Object} parsed - Parsed command arguments
     * @returns {number} Exit code
     */
    async execute(parsed) {
        try {
            this.debug('Executing command:', parsed.command, 'with args:', parsed.args);

            // Check if server is reachable
            await this.checkConnection();

            // Route to appropriate action
            const action = parsed.args[0] || 'list';
            const methodName = `handle${action.charAt(0).toUpperCase() + action.slice(1)}`;

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

    /**
     * Check connection to Canvas server
     */
    async checkConnection() {
        try {
            await this.apiClient.ping();
        } catch (error) {
            throw new Error(`Cannot connect to Canvas server: ${error.message}`);
        }
    }

    /**
     * Format and output data
     * @param {*} data - Data to format
     * @param {string} type - Formatter type
     * @param {string} schema - Schema type for documents
     */
    output(data, type = 'generic', schema = null) {
        const formatter = createFormatter(type, {
            raw: this.options?.raw || false,
            format: this.options?.format || 'table'
        });

        console.log(formatter.format(data, schema));
    }

    /**
     * Show help for the command
     */
    showHelp() {
        console.log(chalk.yellow('Help not implemented for this command'));
    }



    /**
     * Get current context ID from config or options
     */
    getCurrentContext(options = {}) {
        return options.context || this.config.get('session.context.id') || 'default';
    }

    /**
     * Validate required arguments
     */
    validateArgs(args, required = []) {
        for (const arg of required) {
            if (!args[arg]) {
                throw new Error(`Missing required argument: ${arg}`);
            }
        }
    }

    /**
     * Confirm action with user
     */
    async confirm(message) {
        // For now, just return true. In the future, we could add interactive prompts
        return true;
    }

    /**
     * Handle common list action
     */
    async handleList(parsed) {
        throw new Error('List action not implemented');
    }

    /**
     * Handle common create action
     */
    async handleCreate(parsed) {
        throw new Error('Create action not implemented');
    }

    /**
     * Handle common show action
     */
    async handleShow(parsed) {
        throw new Error('Show action not implemented');
    }

    /**
     * Handle common update action
     */
    async handleUpdate(parsed) {
        throw new Error('Update action not implemented');
    }

    /**
     * Handle common delete action
     */
    async handleDelete(parsed) {
        throw new Error('Delete action not implemented');
    }
}

export default BaseCommand;
