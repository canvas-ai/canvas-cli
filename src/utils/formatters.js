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
            // Single workspace - show detailed vertical table
            return this.formatDetailedTable(data);
        }

        // Multiple workspaces - show list table
        return this.formatListTable(data);
    }

    formatListTable(data) {
        if (data.length === 0 || !data[0]) {
            return chalk.yellow('No workspaces found');
        }

        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('Name'),
                chalk.cyan('Owner'),
                chalk.cyan('Color'),
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
                    this.truncate(workspace.owner, 20),
                    this.formatColor(workspace.color),
                    this.truncate(workspace.description, 25),
                    this.formatDate(workspace.created || workspace.createdAt),
                    this.formatWorkspaceStatus(workspace.status)
                ]);
            }
        });

        return table.toString();
    }

    formatDetailedTable(workspace) {
        if (!workspace) {
            return chalk.yellow('No workspace data found');
        }

        const table = new Table({
            style: { head: [], border: [] }
        });

        // Basic information
        table.push([chalk.cyan('ID'), workspace.id || 'N/A']);
        table.push([chalk.cyan('Owner'), workspace.owner || 'N/A']);
        table.push([chalk.cyan('Type'), workspace.type || 'N/A']);
        table.push([chalk.cyan('Label'), workspace.label || 'N/A']);
        table.push([chalk.cyan('Color'), this.formatColor(workspace.color)]);
        table.push([chalk.cyan('Description'), workspace.description || 'N/A']);

        // ACL - JSON stringify for safety
        if (workspace.acl) {
            table.push([chalk.cyan('ACL'), JSON.stringify(workspace.acl, null, 2)]);
        }

        // Timestamps
        table.push([chalk.cyan('Created'), this.formatDate(workspace.created)]);
        table.push([chalk.cyan('Updated'), this.formatDate(workspace.updated)]);

        // Metadata - JSON stringify
        if (workspace.metadata) {
            table.push([chalk.cyan('Metadata'), JSON.stringify(workspace.metadata, null, 2)]);
        }

        // Paths
        if (workspace.rootPath) {
            table.push([chalk.cyan('Root Path'), workspace.rootPath]);
        }

        if (workspace.configPath) {
            table.push([chalk.cyan('Config Path'), workspace.configPath]);
        }

        // Status with color
        table.push([chalk.cyan('Status'), this.formatWorkspaceStatus(workspace.status)]);

        return table.toString();
    }

    formatWorkspaceStatus(status) {

        const statusColors = {
            active: chalk.green,
            inactive: chalk.yellow,
            error: chalk.red,
            available: chalk.blue,
            not_found: chalk.red,
            removed: chalk.red,
            destroyed: chalk.red,
        }

        if (!status) return 'N/A';

        if (statusColors[status]) {
            return statusColors[status](status);
        }


        return status;
    }

        /**
     * Format color field with the actual color styling
     */
    formatColor(colorValue) {
        if (!colorValue) return 'N/A';

        // Convert hex color to chalk color
        try {
            // Remove # if present and validate hex format
            const hex = colorValue.replace('#', '');

            // Validate hex format (should be 6 characters)
            if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return colorValue; // Return uncolored if invalid format
            }

            // Convert hex to RGB
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            // For very light colors (like white), add a background to make them visible
            if (r > 240 && g > 240 && b > 240) {
                // Light color - use dark background
                return chalk.rgb(r, g, b).bgGray(colorValue);
            } else if (r < 50 && g < 50 && b < 50) {
                // Very dark color - use light background
                return chalk.rgb(r, g, b).bgWhite(colorValue);
            } else {
                // Normal color - just color the text
                return chalk.rgb(r, g, b)(colorValue);
            }
        } catch (error) {
            // Fallback to uncolored text if color parsing fails
            return colorValue;
        }
    }
}

/**
 * Context formatter
 */
export class ContextFormatter extends BaseFormatter {
    formatTable(data) {
        if (!Array.isArray(data)) {
            // Single context - show detailed vertical table
            return this.formatDetailedTable(data);
        }

        // Multiple contexts - show list table
        return this.formatListTable(data);
    }

    formatListTable(data) {
        if (data.length === 0 || !data[0]) {
            return chalk.yellow('No contexts found');
        }

        const table = new Table({
            head: [
                chalk.cyan('ID'),
                chalk.cyan('URL'),
                chalk.cyan('BaseUrl'),
                chalk.cyan('Owner'),
                chalk.cyan('Locked')
            ],
            style: { head: [], border: [] }
        });

        data.forEach(context => {
            const owner = context.userId || 'N/A';
            const locked = context.locked ? chalk.red('Yes') : chalk.green('No');
            const contextId = this.formatContextId(context.id, context.color);

            table.push([
                contextId,
                this.truncate(context.url || 'N/A', 35),
                context.baseUrl || 'N/A',
                this.truncate(owner, 20),
                locked
            ]);
        });

        return table.toString();
    }

    formatDetailedTable(context) {
        if (!context) {
            return chalk.yellow('No context data found');
        }

        const table = new Table({
            style: { head: [], border: [] }
        });

        // Basic information
        table.push([chalk.cyan('ID'), context.id || 'N/A']);
        table.push([chalk.cyan('User ID'), context.userId || 'N/A']);
        table.push([chalk.cyan('URL'), context.url || 'N/A']);
        table.push([chalk.cyan('Base URL'), context.baseUrl || 'N/A']);
        table.push([chalk.cyan('Path'), context.path || 'N/A']);
        table.push([chalk.cyan('Workspace ID'), context.workspaceId || 'N/A']);

        // Timestamps
        table.push([chalk.cyan('Created'), this.formatDate(context.createdAt)]);
        table.push([chalk.cyan('Updated'), this.formatDate(context.updatedAt)]);

        // Status
        const locked = context.locked ? chalk.red('Yes') : chalk.green('No');
        table.push([chalk.cyan('Locked'), locked]);

        const shared = context.isShared ? chalk.green('Yes') : chalk.red('No');
        table.push([chalk.cyan('Shared'), shared]);

        if (context.sharedVia) {
            table.push([chalk.cyan('Shared Via'), context.sharedVia]);
        }

        // Arrays
        if (context.pathArray && Array.isArray(context.pathArray)) {
            table.push([chalk.cyan('Path Array'), this.formatArrayVertical(context.pathArray)]);
        }

        if (context.serverContextArray && Array.isArray(context.serverContextArray)) {
            table.push([chalk.cyan('Server Context Array'), this.formatArrayVertical(context.serverContextArray)]);
        }

        if (context.clientContextArray && Array.isArray(context.clientContextArray)) {
            table.push([chalk.cyan('Client Context Array'), this.formatArrayVertical(context.clientContextArray)]);
        }

        if (context.contextBitmapArray && Array.isArray(context.contextBitmapArray)) {
            table.push([chalk.cyan('Context Bitmap Array'), this.formatArrayVertical(context.contextBitmapArray)]);
        }

        if (context.featureBitmapArray && Array.isArray(context.featureBitmapArray)) {
            table.push([chalk.cyan('Feature Bitmap Array'), this.formatArrayVertical(context.featureBitmapArray)]);
        }

        if (context.filterArray && Array.isArray(context.filterArray)) {
            table.push([chalk.cyan('Filter Array'), this.formatArrayVertical(context.filterArray)]);
        }

        // ACL
        if (context.acl && Object.keys(context.acl).length > 0) {
            const aclEntries = Object.entries(context.acl).map(([user, permission]) => `${user}: ${permission}`);
            table.push([chalk.cyan('ACL'), aclEntries.join('\n')]);
        }

        // Pending URL
        if (context.pendingUrl) {
            table.push([chalk.cyan('Pending URL'), context.pendingUrl]);
        }

                return table.toString();
    }

    /**
     * Format context ID with color styling
     */
    formatContextId(contextId, colorValue) {
        if (!contextId) return 'N/A';
        if (!colorValue) return contextId;

        // Use the same color formatting logic as workspace formatter
        try {
            // Remove # if present and validate hex format
            const hex = colorValue.replace('#', '');

            // Validate hex format (should be 6 characters)
            if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return contextId; // Return uncolored if invalid format
            }

            // Convert hex to RGB
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            // For very light colors (like white), add a background to make them visible
            if (r > 240 && g > 240 && b > 240) {
                // Light color - use dark background
                return chalk.rgb(r, g, b).bgGray(contextId);
            } else if (r < 50 && g < 50 && b < 50) {
                // Very dark color - use light background
                return chalk.rgb(r, g, b).bgWhite(contextId);
            } else {
                // Normal color - just color the text
                return chalk.rgb(r, g, b)(contextId);
            }
        } catch (error) {
            // Fallback to uncolored text if color parsing fails
            return contextId;
        }
    }

    /**
     * Format array elements vertically for better readability
     */
    formatArrayVertical(array) {
        if (!Array.isArray(array) || array.length === 0) {
            return 'N/A';
        }

        // For single item, just return it
        if (array.length === 1) {
            return String(array[0]);
        }

        // For multiple items, format vertically
        return array.map(item => String(item)).join('\n');
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
