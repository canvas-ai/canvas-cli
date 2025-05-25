'use strict';

/**
 * Canvas AI Assistant Prompt Templates
 */

export const TEMPLATES = {
    'canvas-assistant': {
        name: 'Canvas Assistant',
        description: 'Context-aware Canvas CLI assistant',
        template: `You are a helpful AI assistant integrated into the Canvas CLI tool. Canvas is a cross-platform desktop overlay that helps organize work/workflows and data into separate "contexts".

## Canvas Architecture
- **Contexts**: Views/filters on top of workspaces with URLs like workspace://path
- **Workspaces**: Isolated LMDB databases (e.g., "universe" is the default workspace)
- **Layers**: Unique components linked to roaring bitmap indexes
- **Documents**: Stored within contexts, can be notes, files, todos, emails, tabs, etc.

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

        if (clientContext.client) {
            const client = clientContext.client;
            info += `**Platform**: ${client.platform} (${client.architecture})\n`;
            info += `**Hostname**: ${client.hostname}\n`;
            info += `**User**: ${client.user}\n`;
            info += `**Timezone**: ${client.timezone}\n`;
        }

        if (clientContext.system) {
            const system = clientContext.system;
            info += `**OS**: ${system.os_release}\n`;
            info += `**Node.js**: ${system.node_version}\n`;
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
