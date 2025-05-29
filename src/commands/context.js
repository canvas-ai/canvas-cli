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
        try {
            this.options = parsed.options;

            // Collect client context for this execution
            this.collectClientContext();

            // Check if server is reachable
            await this.checkConnection();

            // Handle special case for hyphenated commands
            const action = parsed.args[0] || 'current';
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

    /**
     * List contexts
     */
    async handleList(parsed) {
        try {
            const response = await this.apiClient.getContexts();
            let contexts = response.payload || response.data || response;

            if (Array.isArray(contexts) && contexts.length === 0) {
                console.log(chalk.yellow('No contexts found'));
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
        const contextId = parsed.args[1] || this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getContext(contextId);
            let context = response.payload || response.data || response;

            // Extract context from nested response if needed
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
     * Usage: canvas context create <id> [url] [options]
     */
    async handleCreate(parsed) {
        const contextId = parsed.args[1];
        if (!contextId) {
            throw new Error('Context ID is required');
        }

        const url = parsed.args[2];
        const contextData = {
            id: contextId,
            description: parsed.options.description || '',
            metadata: {}
        };

        // Only include URL if provided
        if (url) {
            // If URL contains ://, use as-is, otherwise assume universe workspace
            if (url.includes('://')) {
                contextData.url = url;
            } else {
                contextData.url = `universe://${url.startsWith('/') ? url : '/' + url}`;
            }
        }

        if (parsed.options.color) {
            contextData.metadata.color = parsed.options.color;
        }

        try {
            const response = await this.apiClient.createContext(contextData);
            let context = response.payload || response.data || response;

            // Extract context from nested response if needed
            if (context && context.context) {
                context = context.context;
            }

            console.log(chalk.green(`✓ Context '${contextId}' created successfully`));
            this.output(context, 'context');
            return 0;
        } catch (error) {
            throw new Error(`Failed to create context: ${error.message}`);
        }
    }

    /**
     * Delete context (destroy)
     */
    async handleDestroy(parsed) {
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
            console.log(chalk.green(`✓ Context '${contextId}' destroyed successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to destroy context: ${error.message}`);
        }
    }

    /**
     * Switch/bind to a context (both do the same)
     */
    async handleSwitch(parsed) {
        return this.handleBind(parsed);
    }

    async handleBind(parsed) {
        const contextId = parsed.args[1];
        if (!contextId) {
            throw new Error('Context ID is required');
        }

        try {
            // Verify context exists (optional - we could skip this check)
            // const response = await this.apiClient.getContext(contextId);
            // const context = response.payload || response.data || response;

            // Update config - store context ID
            this.config.set('session.context.id', contextId);

            console.log(chalk.green(`✓ Switched to context '${contextId}'`));
            return 0;
        } catch (error) {
            // If context doesn't exist, still allow binding (as per requirement)
            this.config.set('session.context.id', contextId);
            console.log(chalk.yellow(`⚠ Switched to context '${contextId}' (context may not exist on server)`));
            return 0;
        }
    }

    /**
     * Set context URL
     */
    async handleSet(parsed) {
        const url = parsed.args[1];
        if (!url) {
            throw new Error('Context URL is required');
        }

        const contextId = this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.setContextUrl(contextId, url);
            console.log(chalk.green(`✓ Context URL set to '${url}'`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to set context URL: ${error.message}`);
        }
    }

    /**
     * Get context URL
     */
    async handleUrl(parsed) {
        const contextId = parsed.args[1] || this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getContextUrl(contextId);
            const url = response.payload?.url || response.data?.url || response.url;
            console.log(url);
            return 0;
        } catch (error) {
            throw new Error(`Failed to get context URL: ${error.message}`);
        }
    }

    /**
     * Get base URL for context (workspace part)
     */
    async handleBaseUrl(parsed) {
        const contextId = parsed.args[1] || this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getContextUrl(contextId);
            const url = response.payload?.url || response.data?.url || response.url;

            if (url && url.includes('://')) {
                const baseUrl = url.split('://')[0];
                console.log(baseUrl);
            } else {
                console.log('universe'); // fallback
            }
            return 0;
        } catch (error) {
            throw new Error(`Failed to get context base URL: ${error.message}`);
        }
    }

    /**
     * Get context path
     */
    async handlePath(parsed) {
        const contextId = parsed.args[1] || this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getContextPath(contextId);
            const path = response.payload?.path || response.data?.path || response.path;
            console.log(path);
            return 0;
        } catch (error) {
            throw new Error(`Failed to get context path: ${error.message}`);
        }
    }

    /**
     * Get all available context paths
     */
    async handlePaths(parsed) {
        try {
            const response = await this.apiClient.getContexts();
            let contexts = response.payload || response.data || response;

            if (Array.isArray(contexts)) {
                contexts.forEach(context => {
                    if (context.url && context.url.includes('://')) {
                        const path = context.url.split('://')[1];
                        console.log(path);
                    }
                });
            }
            return 0;
        } catch (error) {
            throw new Error(`Failed to get context paths: ${error.message}`);
        }
    }

    /**
     * Show context tree
     */
    async handleTree(parsed) {
        const contextId = parsed.args[1] || this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getContextTree(contextId);
            let tree = response.payload || response.data || response;

            if (!tree || !tree.children) {
                console.log(chalk.yellow('No tree structure found for this context'));
                return 0;
            }

            console.log(chalk.bold(`Context Tree: ${contextId}`));
            console.log();
            this.displayTreeNode(tree);
            return 0;
        } catch (error) {
            throw new Error(`Failed to get context tree: ${error.message}`);
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
     * Get context workspace
     */
    async handleWorkspace(parsed) {
        const contextId = parsed.args[1] || this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getContextUrl(contextId);
            const url = response.payload?.url || response.data?.url || response.url;

            if (url && url.includes('://')) {
                const workspace = url.split('://')[0];
                console.log(workspace);
            } else {
                console.log('universe'); // fallback
            }
            return 0;
        } catch (error) {
            throw new Error(`Failed to get context workspace: ${error.message}`);
        }
    }

    /**
     * Show current context
     */
    async handleCurrent(parsed) {
        const currentContext = this.getCurrentContext(parsed.options);
        const currentUrl = this.config.get('session.context.url');

        console.log(chalk.cyan('Current context ID:'), currentContext);
        if (currentUrl) {
            console.log(chalk.cyan('Current context URL:'), currentUrl);
        }

        try {
            const response = await this.apiClient.getContext(currentContext);
            let context = response.payload || response.data || response;

            // Extract context from nested response if needed
            if (context && context.context) {
                context = context.context;
            }

            this.output(context, 'context');
            return 0;
        } catch (error) {
            console.log(chalk.yellow('Warning: Current context not found on server'));
            return 1;
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
        if (parsed.options.description) updateData.description = parsed.options.description;
        if (parsed.options.metadata) updateData.metadata = JSON.parse(parsed.options.metadata);

        if (Object.keys(updateData).length === 0) {
            throw new Error('No update data provided. Use --description or --metadata');
        }

        try {
            const response = await this.apiClient.updateContext(contextId, updateData);
            let context = response.payload || response.data || response;

            // Extract context from nested response if needed
            if (context && context.context) {
                context = context.context;
            }

            console.log(chalk.green(`✓ Context '${contextId}' updated successfully`));
            this.output(context, 'context');
            return 0;
        } catch (error) {
            throw new Error(`Failed to update context: ${error.message}`);
        }
    }

    /**
     * List all documents in context
     */
    async handleDocuments(parsed) {
        const contextId = parsed.args[1] || this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getDocuments(contextId, 'context');
            let documents = response.payload || response.data || response;

            if (Array.isArray(documents) && documents.length === 0) {
                console.log(chalk.yellow('No documents found in this context'));
                return 0;
            }

            this.output(documents, 'document');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list documents: ${error.message}`);
        }
    }

    /**
     * Handle tab commands (list, add, delete, remove)
     */
    async handleTab(parsed) {
        const action = parsed.args[1] || 'list';

        if (action === 'list') {
            return this.handleTabList(parsed);
        } else if (action === 'add') {
            return this.handleTabAdd(parsed);
        } else if (action === 'delete') {
            return this.handleTabDelete(parsed);
        } else if (action === 'remove') {
            return this.handleTabRemove(parsed);
        } else {
            console.error(chalk.red(`Unknown tab action: ${action}`));
            console.log(chalk.yellow('Available actions: list, add, delete, remove'));
            return 1;
        }
    }

    /**
     * Handle tabs command (alias for tab list)
     */
    async handleTabs(parsed) {
        return this.handleTabList(parsed);
    }

    /**
     * List tabs in context
     */
    async handleTabList(parsed) {
        const contextId = this.getCurrentContext(parsed.options);

        try {
            const options = {
                featureArray: ['data/abstraction/tab']
            };
            const response = await this.apiClient.getDocuments(contextId, 'context', options);
            let tabs = response.payload || response.data || response;

            if (Array.isArray(tabs) && tabs.length === 0) {
                console.log(chalk.yellow('No tabs found in this context'));
                return 0;
            }

            this.output(tabs, 'document', 'tab');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list tabs: ${error.message}`);
        }
    }

    /**
     * Add a tab to context
     */
    async handleTabAdd(parsed) {
        const url = parsed.args[2];
        if (!url) {
            throw new Error('URL is required for adding a tab');
        }

        const contextId = this.getCurrentContext(parsed.options);
        const title = parsed.options.title || url;

        const tabDocument = {
            schema: 'data/abstraction/tab',
            data: {
                url: url,
                title: title,
                timestamp: new Date().toISOString()
            }
        };

        try {
            const featureArray = ['data/abstraction/tab'];
            const response = await this.apiClient.createDocument(contextId, tabDocument, 'context', featureArray);
            let result = response.payload || response.data || response;

            console.log(chalk.green(`✓ Tab added successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to add tab: ${error.message}`);
        }
    }

    /**
     * Delete tabs from database (permanent)
     */
    async handleTabDelete(parsed) {
        const documentIds = parsed.args.slice(2); // Skip 'tab' and 'delete'
        if (documentIds.length === 0) {
            throw new Error('At least one document ID is required');
        }

        return this.handleDocumentOperation(parsed, documentIds, 'delete', 'data/abstraction/tab', 'tab');
    }

    /**
     * Remove tabs from context (like removing symlinks)
     */
    async handleTabRemove(parsed) {
        const documentIds = parsed.args.slice(2); // Skip 'tab' and 'remove'
        if (documentIds.length === 0) {
            throw new Error('At least one document ID is required');
        }

        return this.handleDocumentOperation(parsed, documentIds, 'remove', 'data/abstraction/tab', 'tab');
    }

    /**
     * Handle note commands (list, add, delete, remove)
     */
    async handleNote(parsed) {
        const action = parsed.args[1] || 'list';

        if (action === 'list') {
            return this.handleNoteList(parsed);
        } else if (action === 'add') {
            return this.handleNoteAdd(parsed);
        } else if (action === 'delete') {
            return this.handleNoteDelete(parsed);
        } else if (action === 'remove') {
            return this.handleNoteRemove(parsed);
        } else {
            console.error(chalk.red(`Unknown note action: ${action}`));
            console.log(chalk.yellow('Available actions: list, add, delete, remove'));
            return 1;
        }
    }

    /**
     * Handle notes command (alias for note list)
     */
    async handleNotes(parsed) {
        return this.handleNoteList(parsed);
    }

    /**
     * List notes in context
     */
    async handleNoteList(parsed) {
        const contextId = this.getCurrentContext(parsed.options);

        try {
            const options = {
                featureArray: ['data/abstraction/note']
            };
            const response = await this.apiClient.getDocuments(contextId, 'context', options);
            let notes = response.payload || response.data || response;

            if (Array.isArray(notes) && notes.length === 0) {
                console.log(chalk.yellow('No notes found in this context'));
                return 0;
            }

            this.output(notes, 'document', 'note');
            return 0;
        } catch (error) {
            throw new Error(`Failed to list notes: ${error.message}`);
        }
    }

    /**
     * Add a note to context
     */
    async handleNoteAdd(parsed) {
        const noteText = parsed.args[2];
        if (!noteText) {
            throw new Error('Note text is required');
        }

        const contextId = this.getCurrentContext(parsed.options);
        const title = parsed.options.title || `Note - ${new Date().toLocaleString()}`;

        const noteDocument = {
            schema: 'data/abstraction/note',
            data: {
                text: noteText,
                title: title,
                timestamp: new Date().toISOString()
            }
        };

        try {
            const featureArray = ['data/abstraction/note'];
            const response = await this.apiClient.createDocument(contextId, noteDocument, 'context', featureArray);
            let result = response.payload || response.data || response;

            console.log(chalk.green(`✓ Note added successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to add note: ${error.message}`);
        }
    }

    /**
     * Delete notes from database (permanent)
     */
    async handleNoteDelete(parsed) {
        const documentIds = parsed.args.slice(2); // Skip 'note' and 'delete'
        if (documentIds.length === 0) {
            throw new Error('At least one document ID is required');
        }

        return this.handleDocumentOperation(parsed, documentIds, 'delete', 'data/abstraction/note', 'note');
    }

    /**
     * Remove notes from context (like removing symlinks)
     */
    async handleNoteRemove(parsed) {
        const documentIds = parsed.args.slice(2); // Skip 'note' and 'remove'
        if (documentIds.length === 0) {
            throw new Error('At least one document ID is required');
        }

        return this.handleDocumentOperation(parsed, documentIds, 'remove', 'data/abstraction/note', 'note');
    }

    /**
     * Handle document commands (delete, remove)
     */
    async handleDocument(parsed) {
        const action = parsed.args[1] || 'list';

        if (action === 'delete') {
            return this.handleDocumentDelete(parsed);
        } else if (action === 'remove') {
            return this.handleDocumentRemove(parsed);
        } else {
            console.error(chalk.red(`Unknown document action: ${action}`));
            console.log(chalk.yellow('Available actions: delete, remove'));
            return 1;
        }
    }

    /**
     * Delete documents from database (permanent)
     */
    async handleDocumentDelete(parsed) {
        const documentIds = parsed.args.slice(2); // Skip 'document' and 'delete'
        if (documentIds.length === 0) {
            throw new Error('At least one document ID is required');
        }

        return this.handleDocumentOperation(parsed, documentIds, 'delete', null, 'document');
    }

    /**
     * Remove documents from context (like removing symlinks)
     */
    async handleDocumentRemove(parsed) {
        const documentIds = parsed.args.slice(2); // Skip 'document' and 'remove'
        if (documentIds.length === 0) {
            throw new Error('At least one document ID is required');
        }

        return this.handleDocumentOperation(parsed, documentIds, 'remove', null, 'document');
    }

    /**
     * Generic handler for document operations (delete/remove)
     */
    async handleDocumentOperation(parsed, documentIds, operation, featureArray, docType) {
        const contextId = this.getCurrentContext(parsed.options);

        try {
            const results = [];
            const errors = [];

            // For now, we only support remove operation since delete from DB isn't implemented yet
            if (operation === 'delete') {
                console.log(chalk.yellow(`Warning: Database deletion not yet implemented. Using remove instead.`));
                operation = 'remove';
            }

            // Process documents one by one or in bulk
            if (documentIds.length === 1) {
                try {
                    await this.apiClient.deleteDocument(contextId, documentIds[0], 'context');
                    results.push(documentIds[0]);
                } catch (error) {
                    errors.push({ id: documentIds[0], error: error.message });
                }
            } else {
                try {
                    await this.apiClient.deleteDocuments(contextId, documentIds, 'context');
                    results.push(...documentIds);
                } catch (error) {
                    // If bulk fails, try individual deletions
                    for (const documentId of documentIds) {
                        try {
                            await this.apiClient.deleteDocument(contextId, documentId, 'context');
                            results.push(documentId);
                        } catch (individualError) {
                            errors.push({ id: documentId, error: individualError.message });
                        }
                    }
                }
            }

            // Report results
            const operationText = operation === 'delete' ? 'deleted from database' : 'removed from context';

            if (results.length > 0) {
                if (results.length === 1) {
                    console.log(chalk.green(`✓ ${docType} '${results[0]}' ${operationText}`));
                } else {
                    console.log(chalk.green(`✓ ${results.length} ${docType}s ${operationText}:`));
                    results.forEach(id => console.log(chalk.green(`  - ${id}`)));
                }
            }

            if (errors.length > 0) {
                console.log(chalk.red(`✗ Failed to ${operation} ${errors.length} ${docType}(s):`));
                errors.forEach(({ id, error }) => {
                    console.log(chalk.red(`  - ${id}: ${error}`));
                });
            }

            // Return success if at least one document was processed
            return errors.length === documentIds.length ? 1 : 0;
        } catch (error) {
            throw new Error(`Failed to ${operation} ${docType}s: ${error.message}`);
        }
    }

    /**
     * Show help
     */
    showHelp() {
        console.log(chalk.bold('Context Commands:'));
        console.log('  (no args)             Show current context (default)');
        console.log('  current               Show current context');
        console.log('  list                  List all contexts');
        console.log('  show [id]             Show context details (current if no ID)');
        console.log('  create <id> [url]     Create new context with optional URL');
        console.log('  destroy <id>          Delete a context');
        console.log('  switch <id>           Switch to context (alias: bind)');
        console.log('  bind <id>             Bind to context (alias: switch)');
        console.log('  set <url>             Set the context URL');
        console.log('  url [id]              Get the context URL');
        console.log('  base-url [id]         Get the base URL for context');
        console.log('  path [id]             Get the context path');
        console.log('  paths                 Get all available context paths');
        console.log('  tree [id]             Show context tree for workspace');
        console.log('  workspace [id]        Get the context workspace');
        console.log('  update <id>           Update context');
        console.log();
        console.log(chalk.bold('Document Commands:'));
        console.log('  documents             List all documents in context');
        console.log('  tab list              List tabs in context');
        console.log('  tabs                  List tabs in context (alias)');
        console.log('  tab add <url>         Add a tab to context');
        console.log('  tab delete <id...>    Delete tabs from database (permanent)');
        console.log('  tab remove <id...>    Remove tabs from context');
        console.log('  note list             List notes in context');
        console.log('  notes                 List notes in context (alias)');
        console.log('  note add <text>       Add a note to context');
        console.log('  note delete <id...>   Delete notes from database (permanent)');
        console.log('  note remove <id...>   Remove notes from context');
        console.log('  document delete <id...> Delete documents from database (permanent)');
        console.log('  document remove <id...> Remove documents from context');
        console.log();
        console.log(chalk.bold('Options:'));
        console.log('  --description <desc>  Context description');
        console.log('  --color <value>       Context color');
        console.log('  --metadata <json>     Context metadata (JSON string)');
        console.log('  --title <title>       Title for documents (e.g., tabs, notes)');
        console.log('  --force               Force deletion without confirmation');
        console.log();
        console.log(chalk.bold('Examples:'));
        console.log('  canvas context                    # Show current context');
        console.log('  canvas contexts                   # List all contexts (alias)');
        console.log('  canvas context list');
        console.log('  canvas context create my-project');
        console.log('  canvas context create work-proj work://acme-org/devops/jira-1234');
        console.log('  canvas context create travel /travel --description "Travel Plans"');
        console.log('  canvas context switch my-project');
        console.log('  canvas context set universe://new/path');
        console.log('  canvas context url');
        console.log('  canvas context tree');
        console.log('  canvas context destroy old-project --force');
        console.log('  canvas context notes              # List notes');
        console.log('  canvas context note add "Remember to check logs" --title "Important"');
        console.log();
        console.log(chalk.bold('Document Examples:'));
        console.log('  canvas context documents');
        console.log('  canvas context tabs');
        console.log('  canvas context tab add https://example.com --title "Example Site"');
        console.log('  canvas context tab delete 12345');
        console.log('  canvas context tab remove 12345 67890');
        console.log('  canvas context note delete 11111 22222');
        console.log('  canvas context document remove 33333 44444 55555');
        console.log();
        console.log(chalk.cyan('Architecture:'));
        console.log('  • Contexts are views/filters on top of your data');
        console.log('  • Context URLs: workspace://path (e.g., work://acme-org/devops/jira-1234)');
        console.log('  • Default workspace is "universe" for relative paths');
        console.log('  • CLI binds to "default" context by default');
        console.log('  • Delete = permanent removal from database');
        console.log('  • Remove = remove from context only (like removing symlinks)');
    }
}

export default ContextCommand;
