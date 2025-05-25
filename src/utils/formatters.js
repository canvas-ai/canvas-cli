'use strict';

import Table from 'cli-table3';
import chalk from 'chalk';
import { format } from 'date-fns';

/**
 * Base formatter class
 */
class BaseFormatter {
    constructor(options = {}) {
        this.options = {
            raw: false,
            format: 'table',
            ...options
        };
    }

    format(data, schema = null) {
        if (this.options.raw) {
            return JSON.stringify(data, null, 2);
        }

        switch (this.options.format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.formatCsv(data, schema);
            case 'table':
            default:
                return this.formatTable(data, schema);
        }
    }

    formatTable(data, schema) {
        if (!Array.isArray(data)) {
            data = [data];
        }

        if (data.length === 0 || !data[0]) {
            return chalk.yellow('No data found');
        }

        // Use schema-specific formatter if available
        if (schema && this[`format${schema.charAt(0).toUpperCase() + schema.slice(1)}Table`]) {
            return this[`format${schema.charAt(0).toUpperCase() + schema.slice(1)}Table`](data);
        }

        return this.formatGenericTable(data);
    }

    formatCsv(data, schema) {
        if (!Array.isArray(data)) {
            data = [data];
        }

        if (data.length === 0) {
            return '';
        }

        const headers = Object.keys(data[0]);
        const rows = data.map(item => headers.map(header => item[header] || ''));

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    formatGenericTable(data) {
        const table = new Table({
            head: Object.keys(data[0]).map(key => chalk.cyan(key)),
            style: { head: [], border: [] }
        });

        data.forEach(item => {
            table.push(Object.values(item));
        });

        return table.toString();
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss');
        } catch {
            return dateString;
        }
    }

    truncate(text, length = 50) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
}

/**
 * Workspace formatter
 */
export class WorkspaceFormatter extends BaseFormatter {
    formatTable(data) {
        if (!Array.isArray(data)) {
            data = [data];
        }

        if (data.length === 0 || !data[0]) {
            return chalk.yellow('No workspaces found');
        }

        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Name'),
                chalk.cyan('Description'),
                chalk.cyan('Created'),
                chalk.cyan('Status')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(workspace => {
            if (workspace) {
                table.push([
                    workspace.id || 'N/A',
                    workspace.label || workspace.name || 'N/A',
                    this.truncate(workspace.description, 30),
                    this.formatDate(workspace.created || workspace.createdAt),
                    workspace.status ? chalk.green(workspace.status) : 'N/A'
                ]);
            }
        });

        return table.toString();
    }
}

/**
 * Context formatter
 */
export class ContextFormatter extends BaseFormatter {
    formatTable(data) {
        if (!Array.isArray(data)) {
            data = [data];
        }

        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Workspace'),
                chalk.cyan('Path'),
                chalk.cyan('Name'),
                chalk.cyan('Documents'),
                chalk.cyan('Created')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(context => {
            let workspace = 'N/A';
            let path = 'N/A';

            if (context.url && context.url.includes('://')) {
                [workspace, path] = context.url.split('://');
            } else if (context.url) {
                path = context.url;
            }

            table.push([
                context.id || 'N/A',
                workspace,
                this.truncate(path, 30),
                context.name || 'N/A',
                context.documentCount || '0',
                this.formatDate(context.created || context.createdAt)
            ]);
        });

        return table.toString();
    }
}

/**
 * Document formatter
 */
export class DocumentFormatter extends BaseFormatter {
    formatNoteTable(data) {
        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Title'),
                chalk.cyan('Content'),
                chalk.cyan('Tags'),
                chalk.cyan('Created')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(doc => {
            table.push([
                doc.id || 'N/A',
                this.truncate(doc.title, 20),
                this.truncate(doc.content, 40),
                Array.isArray(doc.tags) ? doc.tags.join(', ') : (doc.tags || ''),
                this.formatDate(doc.createdAt)
            ]);
        });

        return table.toString();
    }

    formatFileTable(data) {
        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Title'),
                chalk.cyan('Filename'),
                chalk.cyan('Size'),
                chalk.cyan('Type'),
                chalk.cyan('Created')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(doc => {
            table.push([
                doc.id || 'N/A',
                this.truncate(doc.title, 20),
                doc.filename || 'N/A',
                doc.size ? this.formatFileSize(doc.size) : 'N/A',
                doc.mimeType || 'N/A',
                this.formatDate(doc.createdAt)
            ]);
        });

        return table.toString();
    }

    formatTodoTable(data) {
        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Title'),
                chalk.cyan('Status'),
                chalk.cyan('Priority'),
                chalk.cyan('Due Date'),
                chalk.cyan('Created')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(doc => {
            const status = doc.completed ? chalk.green('✓ Done') : chalk.yellow('○ Pending');
            const priority = doc.priority ? this.formatPriority(doc.priority) : 'N/A';

            table.push([
                doc.id || 'N/A',
                this.truncate(doc.title, 25),
                status,
                priority,
                this.formatDate(doc.dueDate),
                this.formatDate(doc.createdAt)
            ]);
        });

        return table.toString();
    }

    formatEmailTable(data) {
        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Subject'),
                chalk.cyan('From'),
                chalk.cyan('To'),
                chalk.cyan('Date'),
                chalk.cyan('Read')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(doc => {
            table.push([
                doc.id || 'N/A',
                this.truncate(doc.subject, 25),
                this.truncate(doc.from, 20),
                this.truncate(doc.to, 20),
                this.formatDate(doc.date),
                doc.read ? chalk.green('✓') : chalk.yellow('○')
            ]);
        });

        return table.toString();
    }

    formatTabTable(data) {
        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Title'),
                chalk.cyan('URL'),
                chalk.cyan('Domain'),
                chalk.cyan('Created')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(doc => {
            table.push([
                doc.id || 'N/A',
                this.truncate(doc.title, 25),
                this.truncate(doc.url, 40),
                doc.domain || 'N/A',
                this.formatDate(doc.createdAt)
            ]);
        });

        return table.toString();
    }

    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatPriority(priority) {
        const colors = {
            high: chalk.red,
            medium: chalk.yellow,
            low: chalk.green
        };
        return colors[priority] ? colors[priority](priority) : priority;
    }
}

/**
 * Auth formatter
 */
export class AuthFormatter extends BaseFormatter {
    formatTable(data) {
        if (!Array.isArray(data)) {
            data = [data];
        }

        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Name'),
                chalk.cyan('Token'),
                chalk.cyan('Created'),
                chalk.cyan('Last Used'),
                chalk.cyan('Status')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(token => {
            table.push([
                token.id || 'N/A',
                token.name || 'N/A',
                token.token ? token.token.substring(0, 10) + '...' : 'N/A',
                this.formatDate(token.createdAt),
                this.formatDate(token.lastUsedAt),
                token.active ? chalk.green('Active') : chalk.red('Inactive')
            ]);
        });

        return table.toString();
    }
}

/**
 * Create formatter based on type
 */
export function createFormatter(type, options = {}) {
    switch (type) {
        case 'workspace':
            return new WorkspaceFormatter(options);
        case 'context':
            return new ContextFormatter(options);
        case 'document':
            return new DocumentFormatter(options);
        case 'auth':
            return new AuthFormatter(options);
        default:
            return new BaseFormatter(options);
    }
}

export default {
    BaseFormatter,
    WorkspaceFormatter,
    ContextFormatter,
    DocumentFormatter,
    AuthFormatter,
    createFormatter
};
