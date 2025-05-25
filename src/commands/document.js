'use strict';

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import BaseCommand from './base.js';

/**
 * Document command
 */
export class DocumentCommand extends BaseCommand {
    constructor(config) {
        super(config);
        this.options = null;
    }

    async execute(parsed) {
        this.options = parsed.options;
        return super.execute(parsed);
    }

    /**
     * List documents in context
     */
    async handleList(parsed) {
        const workspaceId = this.getCurrentWorkspace(parsed.options);
        const contextId = this.getCurrentContext(parsed.options);

        const options = {};
        if (parsed.options.schema) options.schema = parsed.options.schema;
        if (parsed.options.limit) options.limit = parsed.options.limit;
        if (parsed.options.offset) options.offset = parsed.options.offset;

        try {
            const response = await this.apiClient.getDocuments(workspaceId, contextId, options);
            const documents = response.data || response;

            if (Array.isArray(documents) && documents.length === 0) {
                const schemaMsg = parsed.options.schema ? ` with schema '${parsed.options.schema}'` : '';
                console.log(chalk.yellow(`No documents found in context '${contextId}'${schemaMsg}`));
                return 0;
            }

            this.output(documents, 'document', parsed.options.schema);
            return 0;
        } catch (error) {
            throw new Error(`Failed to list documents: ${error.message}`);
        }
    }

    /**
     * Show document details
     */
    async handleShow(parsed) {
        const documentId = parsed.args[1];
        if (!documentId) {
            throw new Error('Document ID is required');
        }

        const workspaceId = this.getCurrentWorkspace(parsed.options);
        const contextId = this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getDocument(workspaceId, contextId, documentId);
            const document = response.data || response;

            this.output(document, 'document', document.schema);
            return 0;
        } catch (error) {
            throw new Error(`Failed to show document: ${error.message}`);
        }
    }

    /**
     * Add/create a new document
     */
    async handleAdd(parsed) {
        const workspaceId = this.getCurrentWorkspace(parsed.options);
        const contextId = this.getCurrentContext(parsed.options);

        // Determine schema from command or option
        const schema = parsed.options.schema || this.inferSchemaFromCommand(parsed.command);

        let documentData = await this.buildDocumentData(parsed, schema);

        try {
            const response = await this.apiClient.createDocument(workspaceId, contextId, documentData);
            const document = response.data || response;

            console.log(chalk.green(`✓ ${schema} document created successfully`));
            this.output(document, 'document', schema);
            return 0;
        } catch (error) {
            throw new Error(`Failed to create document: ${error.message}`);
        }
    }

    /**
     * Update document
     */
    async handleUpdate(parsed) {
        const documentId = parsed.args[1];
        if (!documentId) {
            throw new Error('Document ID is required');
        }

        const workspaceId = this.getCurrentWorkspace(parsed.options);
        const contextId = this.getCurrentContext(parsed.options);

        const updateData = {};
        if (parsed.options.title) updateData.title = parsed.options.title;
        if (parsed.options.content) updateData.content = parsed.options.content;
        if (parsed.options.tags) updateData.tags = parsed.options.tags.split(',');
        if (parsed.data) updateData.content = parsed.data;

        if (Object.keys(updateData).length === 0) {
            throw new Error('No update data provided');
        }

        try {
            const response = await this.apiClient.updateDocument(workspaceId, contextId, documentId, updateData);
            const document = response.data || response;

            console.log(chalk.green(`✓ Document updated successfully`));
            this.output(document, 'document', document.schema);
            return 0;
        } catch (error) {
            throw new Error(`Failed to update document: ${error.message}`);
        }
    }

    /**
     * Delete document
     */
    async handleDelete(parsed) {
        const documentId = parsed.args[1];
        if (!documentId) {
            throw new Error('Document ID is required');
        }

        const workspaceId = this.getCurrentWorkspace(parsed.options);
        const contextId = this.getCurrentContext(parsed.options);

        if (!parsed.options.force) {
            console.log(chalk.yellow(`Warning: This will permanently delete document '${documentId}'.`));
            console.log(chalk.yellow('Use --force to confirm deletion.'));
            return 1;
        }

        try {
            await this.apiClient.deleteDocument(workspaceId, contextId, documentId);
            console.log(chalk.green(`✓ Document '${documentId}' deleted successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to delete document: ${error.message}`);
        }
    }

    /**
     * Search documents
     */
    async handleSearch(parsed) {
        const query = parsed.args[1];
        if (!query) {
            throw new Error('Search query is required');
        }

        // For now, just list all documents and filter client-side
        // In the future, this should use a proper search API
        const workspaceId = this.getCurrentWorkspace(parsed.options);
        const contextId = this.getCurrentContext(parsed.options);

        try {
            const response = await this.apiClient.getDocuments(workspaceId, contextId);
            const documents = response.data || response;

            const filtered = documents.filter(doc =>
                (doc.title && doc.title.toLowerCase().includes(query.toLowerCase())) ||
                (doc.content && doc.content.toLowerCase().includes(query.toLowerCase()))
            );

            if (filtered.length === 0) {
                console.log(chalk.yellow(`No documents found matching '${query}'`));
                return 0;
            }

            console.log(chalk.cyan(`Found ${filtered.length} documents matching '${query}':`));
            this.output(filtered, 'document');
            return 0;
        } catch (error) {
            throw new Error(`Failed to search documents: ${error.message}`);
        }
    }

    /**
     * Build document data based on schema and input
     */
    async buildDocumentData(parsed, schema) {
        const baseData = {
            schema: schema,
            title: parsed.options.title || this.generateDefaultTitle(schema),
            content: parsed.data || '',
            tags: parsed.options.tags ? parsed.options.tags.split(',') : [],
            metadata: {}
        };

        // Handle file input
        if (parsed.args[1] && fs.existsSync(parsed.args[1])) {
            const filePath = parsed.args[1];
            const content = fs.readFileSync(filePath, 'utf8');
            baseData.content = content;

            if (!parsed.options.title) {
                baseData.title = path.basename(filePath);
            }

            // For file schema, add file-specific metadata
            if (schema === 'file') {
                const stats = fs.statSync(filePath);
                baseData.filename = path.basename(filePath);
                baseData.size = stats.size;
                baseData.mimeType = this.getMimeType(filePath);
                baseData.metadata.originalPath = filePath;
            }
        }

        // Schema-specific data
        switch (schema) {
            case 'todo':
                baseData.completed = parsed.options.completed || false;
                baseData.priority = parsed.options.priority || 'medium';
                if (parsed.options.due) {
                    baseData.dueDate = new Date(parsed.options.due).toISOString();
                }
                break;

            case 'email':
                baseData.from = parsed.options.from || '';
                baseData.to = parsed.options.to || '';
                baseData.subject = parsed.options.subject || baseData.title;
                baseData.read = parsed.options.read || false;
                if (parsed.options.date) {
                    baseData.date = new Date(parsed.options.date).toISOString();
                }
                break;

            case 'tab':
                baseData.url = parsed.options.url || '';
                baseData.domain = parsed.options.url ? new URL(parsed.options.url).hostname : '';
                break;
        }

        return baseData;
    }

    /**
     * Infer schema from command name
     */
    inferSchemaFromCommand(command) {
        const schemaMap = {
            note: 'note',
            file: 'file',
            todo: 'todo',
            email: 'email',
            tab: 'tab'
        };
        return schemaMap[command] || 'note';
    }

    /**
     * Generate default title based on schema
     */
    generateDefaultTitle(schema) {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

        const prefixes = {
            note: 'Note',
            file: 'File',
            todo: 'Todo',
            email: 'Email',
            tab: 'Tab'
        };

        return `${prefixes[schema] || 'Document'} ${timestamp}`;
    }

    /**
     * Get MIME type for file
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.html': 'text/html',
            '.css': 'text/css',
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Show help
     */
    showHelp() {
        console.log(chalk.bold('Document Commands:'));
        console.log('  list                  List documents in context');
        console.log('  show <id>             Show document details');
        console.log('  add [file]            Add new document');
        console.log('  update <id>           Update document');
        console.log('  delete <id>           Delete document');
        console.log('  search <query>        Search documents');
        console.log();
        console.log(chalk.bold('Options:'));
        console.log('  --title <title>       Document title');
        console.log('  --content <content>   Document content');
        console.log('  --tags <tags>         Comma-separated tags');
        console.log('  --schema <schema>     Document schema (note, file, todo, email, tab)');
        console.log('  --workspace <id>      Target workspace');
        console.log('  --context <id>        Target context');
        console.log('  --force               Force deletion without confirmation');
        console.log();
        console.log(chalk.bold('Todo-specific options:'));
        console.log('  --completed           Mark todo as completed');
        console.log('  --priority <level>    Priority (low, medium, high)');
        console.log('  --due <date>          Due date');
        console.log();
        console.log(chalk.bold('Email-specific options:'));
        console.log('  --from <email>        From email address');
        console.log('  --to <email>          To email address');
        console.log('  --subject <subject>   Email subject');
        console.log('  --read                Mark as read');
        console.log('  --date <date>         Email date');
        console.log();
        console.log(chalk.bold('Tab-specific options:'));
        console.log('  --url <url>           Tab URL');
        console.log();
        console.log(chalk.bold('Examples:'));
        console.log('  canvas document list');
        console.log('  canvas note add --title "Meeting notes" < notes.txt');
        console.log('  canvas file add ./script.sh --title "Deploy script"');
        console.log('  canvas todo add --title "Fix bug" --priority high --due "2024-01-15"');
        console.log('  canvas email add --subject "Important" --from "user@example.com"');
        console.log('  canvas tab add --title "Documentation" --url "https://docs.example.com"');
        console.log('  cat log.txt | canvas note add --title "Error logs"');
    }
}

export default DocumentCommand;
