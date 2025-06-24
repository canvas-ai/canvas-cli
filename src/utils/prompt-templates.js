'use strict';

/**
 * Canvas AI Assistant Prompt Templates
 */

export const TEMPLATES = {
    'canvas-assistant': {
        name: 'Canvas Agent',
        description: 'Context-aware CLI assistant for Canvas',
        template: `You are a helpful AI assistant integrated into the Canvas CLI tool. Canvas is a cross-platform desktop overlay that helps organize work/workflows and data into separate "contexts" powered by a roaring-bitmap based database.

## Canvas Architecture

### Technologies used

- LMDB for per-workspace databases storing JSON documents and roaring bitmaps
- roaring-bitmap for efficient set operations on bitmaps
- LanceDB for vector indexing

### Basic concepts

- **Contexts**: Contexts are represented by a virtual file-system tree powered by bitmaps[0]. Every tree node("directory") represents a layer linked to a roaring bitmap[1], filtering down all unstructured information fighting for your attention while working in a standard(tm) desktop environment(emails, notifications/chat and system messages, growing number of random browser tabs, unmanageable stack of windows and ad-hoc download-extract-test-forget endeavors to name a few).
- **Workspaces**: Every user has a "universe" workspace by default but can create self-contained exportable/shareable workspaces within his universe. These run their own databases with their own bitmap and vector based indices.
- **Layers**: Context layers filter different data based on where they are placed within the context tree. Layers are unique - a "reports" layer of the "/work/acme/reports" and "/work/reports" context URLs is stored under the same uuid.
- **Documents**: JSON documents stored in the database referencing indexed data from various sources/locations.

## Current Context Information
{{contextInfo}}

## Client Environment
{{clientInfo}}

## User Query
{{userQuery}}

{{#if stdinData}}
## Input Data
The user has provided the following input data:
\`\`\`
{{stdinData}}
\`\`\`
{{/if}}

Please provide a helpful response based on the context and query. If the user is asking about Canvas-specific functionality, use your knowledge of the Canvas architecture. If they're asking about general topics or analyzing provided data, respond accordingly.

Be concise but thorough, and suggest Canvas CLI commands when relevant.`
    },

    'data-analysis': {
        name: 'Data Analysis Assistant',
        description: 'Specialized for analyzing piped data',
        template: `You are an AI assistant specialized in data analysis, integrated into the Canvas CLI tool.

## Current Context
{{contextInfo}}

## Data to Analyze
{{stdinData}}

## User Query
{{userQuery}}

Please analyze the provided data and respond to the user's query. Focus on:
- Identifying patterns, anomalies, or important information
- Providing clear explanations of what the data means
- Suggesting actionable insights when appropriate
- Using technical accuracy while remaining accessible

If relevant, suggest how this analysis could be stored or organized within Canvas contexts.`
    },

    'code-assistant': {
        name: 'Code Assistant',
        description: 'Specialized for code-related queries',
        template: `You are a senior software engineer AI assistant integrated into the Canvas CLI tool.

## Current Context
{{contextInfo}}

## Client Environment
{{clientInfo}}

{{#if stdinData}}
## Code/Data
\`\`\`
{{stdinData}}
\`\`\`
{{/if}}

## Query
{{userQuery}}

Please provide expert software engineering assistance. Focus on:
- Code review and optimization suggestions
- Debugging help and error analysis
- Best practices and architectural advice
- Security considerations when relevant

If working with Canvas-related code, leverage your knowledge of the Canvas architecture and suggest relevant CLI commands for managing code contexts.`
    }
};

/**
 * Template renderer using simple string replacement
 */
export class PromptRenderer {
    constructor() {
        this.templates = TEMPLATES;
    }

    render(templateName, variables = {}) {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        let rendered = template.template;

        // Simple variable substitution
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            rendered = rendered.replace(new RegExp(placeholder, 'g'), value || '');
        }

        // Handle conditional blocks (simple implementation)
        rendered = this.handleConditionals(rendered, variables);

        // Clean up any remaining placeholders
        rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

        return rendered.trim();
    }

    handleConditionals(template, variables) {
        // Handle {{#if variable}} ... {{/if}} blocks
        const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

        return template.replace(ifRegex, (match, variable, content) => {
            const value = variables[variable];
            if (value && value !== '' && value !== null && value !== undefined) {
                return content;
            }
            return '';
        });
    }

    getTemplate(templateName) {
        return this.templates[templateName];
    }

    listTemplates() {
        return Object.keys(this.templates);
    }

    addTemplate(name, template) {
        this.templates[name] = template;
    }
}

/**
 * Context formatter for AI prompts
 */
export class ContextFormatter {
    static formatContextInfo(context) {
        if (!context) {
            return 'No context information available.';
        }

        let info = '';

        if (context.id) {
            info += `**Current Context**: ${context.id}\n`;
        }

        if (context.url) {
            info += `**Context URL**: ${context.url}\n`;

            // Extract workspace and path
            if (context.url.includes('://')) {
                const [workspace, path] = context.url.split('://');
                info += `**Workspace**: ${workspace}\n`;
                info += `**Path**: /${path}\n`;
            }
        }

        if (context.description) {
            info += `**Description**: ${context.description}\n`;
        }

        if (context.documentCount !== undefined) {
            info += `**Documents**: ${context.documentCount}\n`;
        }

        if (context.createdAt) {
            info += `**Created**: ${new Date(context.createdAt).toLocaleString()}\n`;
        }

        return info || 'Context information not available.';
    }

    static formatClientInfo(clientContext) {
        if (!clientContext) {
            return 'No client information available.';
        }

        let info = '';

        // Basic client information
        if (clientContext.client) {
            const client = clientContext.client;
            info += `**Platform**: ${client.platform} (${client.architecture})\n`;
            info += `**Hostname**: ${client.hostname}\n`;
            info += `**User**: ${client.user}\n`;
            info += `**Home Directory**: ${client.home_directory}\n`;
            info += `**Shell**: ${client.shell}\n`;
            info += `**Timezone**: ${client.timezone}\n`;
        }

        // System information
        if (clientContext.system) {
            const system = clientContext.system;
            info += `**OS Release**: ${system.os_release}\n`;
            info += `**Node.js Version**: ${system.node_version}\n`;
        }

        // Environment information
        if (clientContext.environment) {
            const env = clientContext.environment;

            // Desktop environment
            if (env.desktop_environment || env.desktop_session) {
                info += `\n**Desktop Environment**:\n`;
                if (env.desktop_environment) info += `- Environment: ${env.desktop_environment}\n`;
                if (env.desktop_session) info += `- Session: ${env.desktop_session}\n`;
                if (env.session_type) info += `- Type: ${env.session_type}\n`;
            }

            // Locale information
            if (env.locale) {
                info += `\n**Locale**: ${env.locale}\n`;
            }

            // Display information
            if (env.display) {
                info += `**Display**: ${env.display}\n`;
            }

            // Working directory
            if (env.working_directory) {
                info += `**Working Directory**: ${env.working_directory}\n`;
            }

            // Key directories
            if (env.directories) {
                const dirs = env.directories;
                if (dirs.desktop || dirs.downloads || dirs.documents) {
                    info += `\n**Key Directories**:\n`;
                    if (dirs.desktop) info += `- Desktop: ${dirs.desktop}\n`;
                    if (dirs.downloads) info += `- Downloads: ${dirs.downloads}\n`;
                    if (dirs.documents) info += `- Documents: ${dirs.documents}\n`;
                }
            }
        }

        return info || 'Client information not available.';
    }

    static formatFeatureArray(featureArray) {
        if (!Array.isArray(featureArray) || featureArray.length === 0) {
            return 'No feature array available.';
        }

        return featureArray.map(feature => `- ${feature}`).join('\n');
    }
}

export default {
    TEMPLATES,
    PromptRenderer,
    ContextFormatter
};
