'use strict';

import chalk from 'chalk';
import BaseCommand from './base.js';

/**
 * Context command
 */
export class ContextCommand extends BaseCommand {
    constructor(config) {
        super(config);
        this.options = null;
    }

    async execute(parsed) {
        this.options = parsed.options;
        return super.execute(parsed);
    }

        /**
     * List contexts (optionally filtered by workspace)
     */
    async handleList(parsed) {
        const workspaceFilter = parsed.options.workspace;

        try {
            const response = await this.apiClient.getContexts();
            let contexts = response.payload || response.data || response;

            // Client-side filtering by workspace if specified
            if (workspaceFilter && Array.isArray(contexts)) {
                contexts = contexts.filter(context => {
                    if (context.url && context.url.includes('://')) {
                        const [workspace] = context.url.split('://');
                        return workspace === workspaceFilter;
                    }
                    return false;
                });
            }

            if (Array.isArray(contexts) && contexts.length === 0) {
                const msg = workspaceFilter ?
                    `No contexts found in workspace '${workspaceFilter}'` :
                    'No contexts found';
                console.log(chalk.yellow(msg));
                return 0;
            }

            this.output(contexts, 'context');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list contexts: ${error.message}`);
        }
    }

    /**
     * Show context details
     */
    async handleShow(parsed) {
        const contextId = parsed.args[1];
        if (!contextId) {
            throw new Error('Context ID is required');
        }

        try {
            const response = await this.apiClient.getContext(contextId);
            let context = response.payload || response.data || response;

            // If context is still nested, extract it
            if (context && context.context) {
                context = context.context;
            }

            this.output(context, 'context');
            return 0;
        } catch (error) {
            throw new Error(`Failed to show context: ${error.message}`);
        }
    }

    /**
     * Create a new context
     */
    async handleCreate(parsed) {
        const url = parsed.args[1];
        if (!url) {
            throw new Error('Context URL is required (format: workspace://path or just /path for universe)');
        }

        // Parse workspace from URL or use default
        let workspaceId, contextPath;
        if (url.includes('://')) {
            [workspaceId, contextPath] = url.split('://');
        } else {
            workspaceId = parsed.options.workspace || 'universe';
            contextPath = url.startsWith('/') ? url : '/' + url;
        }

        const contextData = {
            id: parsed.options.id || `ctx-${Date.now()}`,
            url: `${workspaceId}://${contextPath}`,
            name: parsed.options.name || contextPath.split('/').pop() || 'Unnamed Context',
            description: parsed.options.description || '',
            settings: {}
        };

        try {
            const response = await this.apiClient.createContext(contextData);
            const context = response.payload || response.data || response;

            // Handle case where context might be nested or the response structure is different
            const contextUrl = context?.url || contextData.url;
            console.log(chalk.green(`✓ Context '${contextUrl}' created successfully`));

            // If the response doesn't contain the full context, show what we sent
            if (!context || !context.url) {
                this.output(contextData, 'context');
            } else {
                this.output(context, 'context');
            }
            return 0;
        } catch (error) {
            throw new Error(`Failed to create context: ${error.message}`);
        }
    }

    /**
     * Update context
     */
    async handleUpdate(parsed) {
        const contextId = parsed.args[1];
        if (!contextId) {
            throw new Error('Context ID is required');
        }

        const updateData = {};
        if (parsed.options.name) updateData.name = parsed.options.name;
        if (parsed.options.description) updateData.description = parsed.options.description;
        if (parsed.options.url) updateData.url = parsed.options.url;

        if (Object.keys(updateData).length === 0) {
            throw new Error('No update data provided. Use --name, --description, or --url');
        }

        try {
            const response = await this.apiClient.updateContext(contextId, updateData);
            const context = response.payload || response.data || response;

            console.log(chalk.green(`✓ Context '${context.url}' updated successfully`));
            this.output(context, 'context');
            return 0;
        } catch (error) {
            throw new Error(`Failed to update context: ${error.message}`);
        }
    }

    /**
     * Delete context
     */
    async handleDelete(parsed) {
        const contextId = parsed.args[1];
        if (!contextId) {
            throw new Error('Context ID is required');
        }

        if (!parsed.options.force) {
            console.log(chalk.yellow(`Warning: This will permanently delete context '${contextId}' and all its documents.`));
            console.log(chalk.yellow('Use --force to confirm deletion.'));
            return 1;
        }

        try {
            await this.apiClient.deleteContext(contextId);
            console.log(chalk.green(`✓ Context '${contextId}' deleted successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to delete context: ${error.message}`);
        }
    }

    /**
     * Set current context
     */
    async handleUse(parsed) {
        const contextId = parsed.args[1];
        if (!contextId) {
            throw new Error('Context ID is required');
        }

        try {
            // Verify context exists
            const response = await this.apiClient.getContext(contextId);
            const context = response.payload || response.data || response;

            // Update config - store context info
            this.config.set('session.context.id', contextId);
            this.config.set('session.context.url', context.url);

            console.log(chalk.green(`✓ Current context set to '${context.url}' (${contextId})`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to set context: ${error.message}`);
        }
    }

    /**
     * Show current context
     */
    async handleCurrent(parsed) {
        const currentContext = this.getCurrentContext(parsed.options);
        const currentUrl = this.config.get('session.context.url');

        console.log(chalk.cyan('Current context ID:'), currentContext);
        console.log(chalk.cyan('Current context URL:'), currentUrl || 'Not set');

        try {
            const response = await this.apiClient.getContext(currentContext);
            const context = response.payload || response.data || response;
            this.output(context, 'context');
            return 0;
        } catch (error) {
            console.log(chalk.yellow('Warning: Current context not found on server'));
            return 1;
        }
    }

        /**
     * Show context tree structure
     */
    async handleTree(parsed) {
        const workspaceFilter = parsed.options.workspace;

        try {
            const response = await this.apiClient.getContexts();
            let contexts = response.payload || response.data || response;

            // Client-side filtering by workspace if specified
            if (workspaceFilter && Array.isArray(contexts)) {
                contexts = contexts.filter(context => {
                    if (context.url && context.url.includes('://')) {
                        const [workspace] = context.url.split('://');
                        return workspace === workspaceFilter;
                    }
                    return false;
                });
            }

            const title = workspaceFilter ?
                `Context tree for workspace '${workspaceFilter}':` :
                'Context tree (all workspaces):';
            console.log(chalk.bold(title));
            console.log();

            if (Array.isArray(contexts)) {
                contexts.forEach(context => {
                    console.log(`├── ${context.url} (${context.id})`);
                    if (context.description) {
                        console.log(`│   └── ${chalk.gray(context.description)}`);
                    }
                });
            }

            return 0;
        } catch (error) {
            throw new Error(`Failed to show context tree: ${error.message}`);
        }
    }

    /**
     * Show help
     */
    showHelp() {
        console.log(chalk.bold('Context Commands:'));
        console.log('  list                  List contexts in workspace');
        console.log('  show <id>             Show context details');
        console.log('  create <url>          Create new context');
        console.log('  update <id>           Update context');
        console.log('  delete <id>           Delete context');
        console.log('  use <id>              Set current context');
        console.log('  current               Show current context');
        console.log('  tree                  Show context tree');
        console.log();
        console.log(chalk.bold('Options:'));
        console.log('  --id <id>             Context ID (auto-generated if not provided)');
        console.log('  --name <name>         Context name');
        console.log('  --description <desc>  Context description');
        console.log('  --url <url>           Context URL (for update)');
        console.log('  --workspace <id>      Target workspace (defaults to universe)');
        console.log('  --force               Force deletion without confirmation');
        console.log();
        console.log(chalk.bold('Examples:'));
        console.log('  canvas context list --workspace universe');
        console.log('  canvas context create /work/project');
        console.log('  canvas context create work://mb/devops/jira-1234');
        console.log('  canvas context create /travel --name "Travel Plans"');
        console.log('  canvas context show ctx-123 --workspace work');
        console.log('  canvas context use ctx-123 --workspace work');
        console.log();
        console.log(chalk.cyan('Architecture:'));
        console.log('  • Contexts are views/filters on top of workspaces');
        console.log('  • Context URLs: workspace://path (e.g., work://mb/devops/jira-1234)');
        console.log('  • Each workspace has its own LMDB database');
        console.log('  • Applications see data filtered by the current context');
    }
}

export default ContextCommand;
