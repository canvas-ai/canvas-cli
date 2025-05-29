'use strict';

import chalk from 'chalk';
import BaseCommand from './base.js';

/**
 * Workspace command
 */
export class WorkspaceCommand extends BaseCommand {
    constructor(config) {
        super(config);
        this.options = null; // Will be set during execution
    }

    async execute(parsed) {
        try {
            this.options = parsed.options;

            // Collect client context for this execution
            this.collectClientContext();

            // Check if server is reachable
            await this.checkConnection();

            // If no arguments, default to list
            if (parsed.args.length === 0) {
                return await this.handleList(parsed);
            }

            const firstArg = parsed.args[0];
            const secondArg = parsed.args[1];

            // Check if first arg is a known action
            const knownActions = ['list', 'show', 'create', 'update', 'delete', 'start', 'stop', 'documents', 'document', 'tabs', 'notes', 'tree', 'help'];

            if (knownActions.includes(firstArg)) {
                // Route to appropriate action
                const action = firstArg;
                const methodName = `handle${action.charAt(0).toUpperCase() + action.slice(1)}`;

                if (typeof this[methodName] === 'function') {
                    return await this[methodName](parsed);
                } else {
                    console.error(chalk.red(`Unknown action: ${action}`));
                    this.showHelp();
                    return 1;
                }
            } else {
                // First arg is workspace ID, second arg is action
                const workspaceId = firstArg;
                const action = secondArg || 'show'; // default to show if no action specified

                // Create modified parsed object with workspace ID in correct position
                const modifiedParsed = {
                    ...parsed,
                    args: [action, workspaceId, ...parsed.args.slice(2)]
                };

                const methodName = `handle${action.charAt(0).toUpperCase() + action.slice(1)}`;

                if (typeof this[methodName] === 'function') {
                    return await this[methodName](modifiedParsed);
                } else {
                    console.error(chalk.red(`Unknown action: ${action}`));
                    this.showHelp();
                    return 1;
                }
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
     * List all workspaces
     */
        async handleList(parsed) {
        try {
            const response = await this.apiClient.getWorkspaces();
            const workspaces = response.payload || response.data || response;

            if (Array.isArray(workspaces) && workspaces.length === 0) {
                console.log(chalk.yellow('No workspaces found'));
                return 0;
            }

            this.output(workspaces, 'workspace');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list workspaces: ${error.message}`);
        }
    }

    /**
     * Show workspace details
     */
    async handleShow(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

                                        try {
            const response = await this.apiClient.getWorkspace(workspaceId);
            let workspace = response.workspace || response.payload || response.data || response;

            // If workspace is still nested, extract it
            if (workspace && workspace.workspace) {
                workspace = workspace.workspace;
            }

            this.output(workspace, 'workspace');
            return 0;
        } catch (error) {
            throw new Error(`Failed to show workspace: ${error.message}`);
        }
    }

    /**
     * Create a new workspace
     */
    async handleCreate(parsed) {
        const name = parsed.args[1];
        if (!name) {
            throw new Error('Workspace name is required');
        }

        const workspaceData = {
            name: name,
            description: parsed.options.description || '',
            settings: {}
        };

                try {
            const response = await this.apiClient.createWorkspace(workspaceData);
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspace.label || workspace.name}' created successfully`));
            this.output(workspace, 'workspace');
            return 0;
        } catch (error) {
            throw new Error(`Failed to create workspace: ${error.message}`);
        }
    }

    /**
     * Update workspace
     */
    async handleUpdate(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        const updateData = {};
        if (parsed.options.name) updateData.name = parsed.options.name;
        if (parsed.options.description) updateData.description = parsed.options.description;

        if (Object.keys(updateData).length === 0) {
            throw new Error('No update data provided. Use --name or --description');
        }

                try {
            const response = await this.apiClient.updateWorkspace(workspaceId, updateData);
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspace.label || workspace.name}' updated successfully`));
            this.output(workspace, 'workspace');
            return 0;
        } catch (error) {
            throw new Error(`Failed to update workspace: ${error.message}`);
        }
    }

    /**
     * Delete workspace
     */
    async handleDelete(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        if (!parsed.options.force) {
            console.log(chalk.yellow(`Warning: This will permanently delete workspace '${workspaceId}' and all its data.`));
            console.log(chalk.yellow('Use --force to confirm deletion.'));
            return 1;
        }

        try {
            await this.apiClient.deleteWorkspace(workspaceId);
            console.log(chalk.green(`✓ Workspace '${workspaceId}' deleted successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to delete workspace: ${error.message}`);
        }
    }

    /**
     * Start workspace
     */
    async handleStart(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const response = await this.apiClient.startWorkspace(workspaceId);
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspace.label || workspace.name || workspaceId}' started successfully`));
            this.output(workspace, 'workspace');
            return 0;
        } catch (error) {
            throw new Error(`Failed to start workspace: ${error.message}`);
        }
    }

    /**
     * Stop workspace
     */
    async handleStop(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const response = await this.apiClient.stopWorkspace(workspaceId);

            console.log(chalk.green(`✓ Workspace '${workspaceId}' stopped successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to stop workspace: ${error.message}`);
        }
    }

    /**
     * List all documents in workspace
     */
    async handleDocuments(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const response = await this.apiClient.getDocuments(workspaceId, 'workspace');

            // Fix: Extract documents from ResponseObject format
            // The actual documents array is at response.payload.data
            let documents = response.payload?.data || response.payload || response.data || [];

            if (Array.isArray(documents) && documents.length === 0) {
                console.log(chalk.yellow('No documents found in this workspace'));
                return 0;
            }

            this.output(documents, 'document');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list documents: ${error.message}`);
        }
    }

    /**
     * List tabs in workspace
     */
    async handleTabs(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const options = {
                featureArray: ['data/abstraction/tab']
            };
            const response = await this.apiClient.getDocuments(workspaceId, 'workspace', options);
            // Fix: Extract tabs from ResponseObject format
            // The actual tabs array is at response.payload.data
            let tabs = response.payload?.data || response.payload || response.data || [];

            if (Array.isArray(tabs) && tabs.length === 0) {
                console.log(chalk.yellow('No tabs found in this workspace'));
                return 0;
            }

            this.output(tabs, 'document', 'tab');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list tabs: ${error.message}`);
        }
    }

    /**
     * List documents in workspace (alias for handleDocuments)
     */
    async handleDocument(parsed) {
        return this.handleDocuments(parsed);
    }

    /**
     * List notes in workspace
     */
    async handleNotes(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const options = {
                featureArray: ['data/abstraction/note']
            };
            const response = await this.apiClient.getDocuments(workspaceId, 'workspace', options);
            // Fix: Extract notes from ResponseObject format
            // The actual notes array is at response.payload.data
            let notes = response.payload?.data || response.payload || response.data || [];

            if (Array.isArray(notes) && notes.length === 0) {
                console.log(chalk.yellow('No notes found in this workspace'));
                return 0;
            }

            this.output(notes, 'document', 'note');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list notes: ${error.message}`);
        }
    }

    /**
     * Show workspace tree
     */
    async handleTree(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const response = await this.apiClient.getWorkspaceTree(workspaceId);
            let tree = response.payload || response.data || response;

            if (!tree || !tree.children) {
                console.log(chalk.yellow('No tree structure found for this workspace'));
                return 0;
            }

            console.log(chalk.bold(`Workspace Tree: ${workspaceId}`));
            console.log();
            this.displayTreeNode(tree);
            return 0;
        } catch (error) {
            throw new Error(`Failed to get workspace tree: ${error.message}`);
        }
    }

    /**
     * Display a tree node recursively (borrowed from context command)
     */
    displayTreeNode(node, prefix = '', isLast = true) {
        if (!node) return;

        const connector = isLast ? '└── ' : '├── ';
        const nameDisplay = node.label || node.name || node.id;
        const typeDisplay = node.type === 'universe' ? chalk.cyan('[UNIVERSE]') : '';
        const colorDisplay = node.color ? chalk.hex(node.color)('●') : '';

        console.log(`${prefix}${connector}${nameDisplay} ${typeDisplay} ${colorDisplay}`);

        if (node.description && node.description !== 'Canvas layer') {
            const descPrefix = prefix + (isLast ? '    ' : '│   ');
            console.log(`${descPrefix}${chalk.gray(node.description)}`);
        }

        if (node.children && Array.isArray(node.children)) {
            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            node.children.forEach((child, index) => {
                const isLastChild = index === node.children.length - 1;
                this.displayTreeNode(child, childPrefix, isLastChild);
            });
        }
    }

    /**
     * Show help
     */
    showHelp() {
        console.log(chalk.bold('Workspace Commands:'));
        console.log('  (no args)             List all workspaces (default)');
        console.log('  list                  List all workspaces');
        console.log('  show <id>             Show workspace details');
        console.log('  create <name>         Create new workspace');
        console.log('  update <id>           Update workspace');
        console.log('  delete <id>           Delete workspace');
        console.log('  start <id>            Start workspace');
        console.log('  stop <id>             Stop workspace');
        console.log();
        console.log(chalk.bold('Workspace-specific Commands:'));
        console.log('  <id>                  Show workspace details (shorthand)');
        console.log('  <id> tree             Show workspace tree');
        console.log('  <id> documents        List all documents in workspace');
        console.log('  <id> document         List all documents in workspace (alias)');
        console.log('  <id> tabs             List tabs in workspace');
        console.log('  <id> notes            List notes in workspace');
        console.log();
        console.log(chalk.bold('Legacy Commands (still supported):'));
        console.log('  documents <id>        List all documents in workspace');
        console.log('  tabs <id>             List tabs in workspace');
        console.log('  notes <id>            List notes in workspace');
        console.log('  tree <id>             Show workspace tree');
        console.log();
        console.log(chalk.bold('Options:'));
        console.log('  --name <name>         Workspace name (for update)');
        console.log('  --description <desc>  Workspace description');
        console.log('  --force               Force deletion without confirmation');
        console.log();
        console.log(chalk.bold('Examples:'));
        console.log('  canvas ws                         # List all workspaces');
        console.log('  canvas ws universe                # Show universe workspace');
        console.log('  canvas ws universe tree           # Show universe tree');
        console.log('  canvas ws universe documents      # List documents');
        console.log('  canvas ws universe notes          # List notes');
        console.log('  canvas ws universe tabs           # List tabs');
        console.log();
        console.log('  canvas workspace list');
        console.log('  canvas workspace create "My Project"');
        console.log('  canvas workspace start universe');
        console.log('  canvas workspace stop universe');
        console.log('  canvas workspace delete test1 --force');
        console.log();
        console.log(chalk.cyan('Architecture:'));
        console.log('  • Every user has a main workspace called "universe" (their home)');
        console.log('  • Contexts belong to workspaces and reference them by workspaceId');
        console.log('  • Use context commands to work within specific workspace contexts');
        console.log('  • Start/stop controls workspace lifecycle and resource allocation');
    }
}

export default WorkspaceCommand;
