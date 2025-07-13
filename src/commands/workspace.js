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

            // Handle ResponseObject format
            let workspaces = response.payload || response.data || response;

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

            // Handle ResponseObject format
            let workspace = response.payload || response.data || response;

            // Extract workspace from nested response if needed
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
     * Create new workspace
     */
    async handleCreate(parsed) {
        const name = parsed.args[1];
        if (!name) {
            throw new Error('Workspace name is required');
        }

        const workspaceData = {
            name: name,
            label: parsed.options.label || name,
            description: parsed.options.description || '',
            type: parsed.options.type || 'workspace',
            color: parsed.options.color,
            metadata: parsed.options.metadata ? JSON.parse(parsed.options.metadata) : {}
        };

        try {
            const response = await this.apiClient.createWorkspace(workspaceData);

            // Handle ResponseObject format
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${name}' created successfully`));
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
        if (parsed.options.label) updateData.label = parsed.options.label;
        if (parsed.options.description) updateData.description = parsed.options.description;
        if (parsed.options.color) updateData.color = parsed.options.color;
        if (parsed.options.metadata) updateData.metadata = JSON.parse(parsed.options.metadata);

        if (Object.keys(updateData).length === 0) {
            throw new Error('No update data provided. Use --label, --description, --color, or --metadata');
        }

        try {
            const response = await this.apiClient.updateWorkspace(workspaceId, updateData);

            // Handle ResponseObject format
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspaceId}' updated successfully`));
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

            // Handle ResponseObject format
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspaceId}' started successfully`));
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

            // Handle ResponseObject format
            const result = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspaceId}' stopped successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to stop workspace: ${error.message}`);
        }
    }

    /**
     * Open workspace
     */
    async handleOpen(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const response = await this.apiClient.openWorkspace(workspaceId);

            // Handle ResponseObject format
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspaceId}' opened successfully`));
            this.output(workspace, 'workspace');
            return 0;
        } catch (error) {
            throw new Error(`Failed to open workspace: ${error.message}`);
        }
    }

    /**
     * Close workspace
     */
    async handleClose(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const response = await this.apiClient.closeWorkspace(workspaceId);

            // Handle ResponseObject format
            const workspace = response.payload || response.data || response;

            console.log(chalk.green(`✓ Workspace '${workspaceId}' closed successfully`));
            this.output(workspace, 'workspace');
            return 0;
        } catch (error) {
            throw new Error(`Failed to close workspace: ${error.message}`);
        }
    }

    /**
     * Show workspace status
     */
    async handleStatus(parsed) {
        const workspaceId = parsed.args[1];
        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        try {
            const response = await this.apiClient.getWorkspaceStatus(workspaceId);

            // Handle ResponseObject format
            const statusData = response.payload || response.data || response;

            console.log(chalk.bold(`Workspace Status: ${workspaceId}`));
            console.log(`Status: ${statusData.status}`);
            return 0;
        } catch (error) {
            throw new Error(`Failed to get workspace status: ${error.message}`);
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

            // Handle ResponseObject format
            let documents = response.payload || response.data || response;

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

            // Handle ResponseObject format
            let tabs = response.payload || response.data || response;

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
     * Handle document commands
     */
    async handleDocument(parsed) {
        const action = parsed.args[1] || 'list';
        const workspaceId = parsed.args[2];

        if (!workspaceId) {
            throw new Error('Workspace ID is required');
        }

        // Redirect to appropriate handler based on action
        // Implementation would be similar to context document handling
        throw new Error('Document operations not yet implemented for workspace command');
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

            // Handle ResponseObject format
            let notes = response.payload || response.data || response;

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

            // Handle ResponseObject format
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
     * Display a tree node recursively
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
        console.log('  list                  List all workspaces');
        console.log('  show <id>             Show workspace details');
        console.log('  create <name>         Create new workspace');
        console.log('  update <id>           Update workspace');
        console.log('  delete <id>           Delete workspace');
        console.log('  start <id>            Start workspace');
        console.log('  stop <id>             Stop workspace');
        console.log('  open <id>             Open workspace');
        console.log('  close <id>            Close workspace');
        console.log('  status <id>           Show workspace status');
        console.log('  documents <id>        List documents in workspace');
        console.log('  tabs <id>             List tabs in workspace');
        console.log('  notes <id>            List notes in workspace');
        console.log('  tree <id>             Show workspace tree');
        console.log();
        console.log(chalk.bold('Options:'));
        console.log('  --label <label>       Workspace label');
        console.log('  --description <desc>  Workspace description');
        console.log('  --color <color>       Workspace color (hex)');
        console.log('  --type <type>         Workspace type (workspace, universe)');
        console.log('  --metadata <json>     Workspace metadata (JSON string)');
        console.log('  --force               Force deletion without confirmation');
        console.log();
        console.log(chalk.bold('Examples:'));
        console.log('  canvas workspace list');
        console.log('  canvas workspace show universe');
        console.log('  canvas workspace create my-workspace --description "My workspace"');
        console.log('  canvas workspace start universe');
        console.log('  canvas workspace documents universe');
        console.log('  canvas workspace tree universe');
        console.log('  canvas workspace delete old-workspace --force');
    }
}

export default WorkspaceCommand;
