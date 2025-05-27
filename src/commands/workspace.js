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
        this.options = parsed.options;
        return super.execute(parsed);
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
        console.log('  documents <id>        List all documents in workspace');
        console.log('  tabs <id>             List tabs in workspace');
        console.log();
        console.log(chalk.bold('Options:'));
        console.log('  --name <name>         Workspace name (for update)');
        console.log('  --description <desc>  Workspace description');
        console.log('  --force               Force deletion without confirmation');
        console.log();
        console.log(chalk.bold('Examples:'));
        console.log('  canvas workspace list');
        console.log('  canvas workspace create "My Project"');
        console.log('  canvas workspace show universe');
        console.log('  canvas workspace start universe');
        console.log('  canvas workspace stop universe');
        console.log('  canvas workspace documents universe');
        console.log('  canvas workspace tabs universe');
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
