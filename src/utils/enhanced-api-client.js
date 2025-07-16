'use strict';

import { CanvasApiClient } from './api-client.js';
import { remoteStore } from './config.js';
import {
    parseResourceAddress,
    extractRemoteIdentifier,
    extractResourceKey,
    isLocalRemote
} from './address-parser.js';
import { setupDebug } from '../lib/debug.js';

const debug = setupDebug('canvas:cli:enhanced-api');

/**
 * Enhanced Canvas API Client that supports multi-remote resource addressing
 */
export class EnhancedCanvasApiClient {
    constructor(config) {
        this.config = config;
        this.remoteStore = remoteStore;
        this.apiClients = new Map(); // Cache for API clients per remote
    }

    /**
     * Get or create an API client for a specific remote
     * @param {string} remoteId - Remote identifier (user@remote)
     * @returns {Promise<CanvasApiClient>} API client for the remote
     */
    async getApiClient(remoteId) {
        // Check cache first
        if (this.apiClients.has(remoteId)) {
            return this.apiClients.get(remoteId);
        }

        // Get remote configuration
        const remote = await this.remoteStore.getRemote(remoteId);
        if (!remote) {
            throw new Error(`Remote '${remoteId}' not found. Add it with: canvas remote add ${remoteId} <url>`);
        }

        // Create config-like object for the API client
        const remoteConfig = {
            get: (key) => {
                if (key === 'server.url') {
                    return remote.url + remote.apiBase;
                }
                if (key === 'server.auth.token') {
                    return remote.auth?.token || '';
                }
                return this.config.get(key);
            }
        };

        // Create and cache the API client
        const apiClient = new CanvasApiClient(remoteConfig);
        this.apiClients.set(remoteId, apiClient);

        debug(`Created API client for remote: ${remoteId}`);
        return apiClient;
    }

    /**
     * Get the current default remote from session
     * @returns {Promise<string|null>} Default remote ID or null
     */
    async getCurrentRemote() {
        const session = await this.remoteStore.getSession();
        return session.boundRemote;
    }

    /**
     * Resolve a resource address to API client and resource identifier
     * @param {string} addressOrId - Resource address or simple ID
     * @returns {Promise<{apiClient: CanvasApiClient, resourceId: string, remoteId: string}>}
     */
    async resolveResource(addressOrId) {
        let remoteId;
        let resourceId;

        // Try to parse as resource address first
        const parsed = parseResourceAddress(addressOrId);
        if (parsed) {
            // Full address format: user@remote:resource
            remoteId = extractRemoteIdentifier(addressOrId);
            resourceId = parsed.resource;
        } else {
            // Simple ID format - use current/default remote
            resourceId = addressOrId;
            remoteId = await this.getCurrentRemote();

            if (!remoteId) {
                throw new Error('No default remote bound. Use: canvas remote bind <user@remote> or provide full address');
            }
        }

        const apiClient = await this.getApiClient(remoteId);
        return { apiClient, resourceId, remoteId };
    }

    /**
     * Workspace operations with resource address support
     */

    async getWorkspaces(addressOrRemote = null) {
        let remoteId = addressOrRemote;

        if (!remoteId) {
            remoteId = await this.getCurrentRemote();
            if (!remoteId) {
                throw new Error('No default remote bound. Use: canvas remote bind <user@remote>');
            }
        }

        const apiClient = await this.getApiClient(remoteId);
        const response = await apiClient.getWorkspaces();

        // Update local cache
        const workspaces = response.payload || response.data || response;
        if (Array.isArray(workspaces)) {
            for (const workspace of workspaces) {
                const workspaceKey = `${remoteId}:${workspace.id || workspace.name}`;
                await this.remoteStore.updateWorkspace(workspaceKey, workspace);
            }
        }

        return response;
    }

    async getWorkspace(addressOrId) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        const response = await apiClient.getWorkspace(resourceId);

        // Update local cache
        const workspace = response.payload || response.data || response;
        if (workspace) {
            const workspaceKey = extractResourceKey(addressOrId) || `${await this.getCurrentRemote()}:${resourceId}`;
            await this.remoteStore.updateWorkspace(workspaceKey, workspace);
        }

        return response;
    }

    async createWorkspace(workspaceData, remoteId = null) {
        if (!remoteId) {
            remoteId = await this.getCurrentRemote();
            if (!remoteId) {
                throw new Error('No default remote bound. Use: canvas remote bind <user@remote>');
            }
        }

        const apiClient = await this.getApiClient(remoteId);
        const response = await apiClient.createWorkspace(workspaceData);

        // Update local cache
        const workspace = response.payload || response.data || response;
        if (workspace) {
            const workspaceKey = `${remoteId}:${workspace.id || workspace.name}`;
            await this.remoteStore.updateWorkspace(workspaceKey, workspace);
        }

        return response;
    }

    async updateWorkspace(addressOrId, workspaceData) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        const response = await apiClient.updateWorkspace(resourceId, workspaceData);

        // Update local cache
        const workspace = response.payload || response.data || response;
        if (workspace) {
            const workspaceKey = extractResourceKey(addressOrId) || `${await this.getCurrentRemote()}:${resourceId}`;
            await this.remoteStore.updateWorkspace(workspaceKey, workspace);
        }

        return response;
    }

    async deleteWorkspace(addressOrId) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        const response = await apiClient.deleteWorkspace(resourceId);

        // Remove from local cache
        const workspaceKey = extractResourceKey(addressOrId) || `${await this.getCurrentRemote()}:${resourceId}`;
        await this.remoteStore.removeWorkspace(workspaceKey);

        return response;
    }

    async startWorkspace(addressOrId) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        return await apiClient.startWorkspace(resourceId);
    }

    async stopWorkspace(addressOrId) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        return await apiClient.stopWorkspace(resourceId);
    }

    /**
     * Context operations with resource address support
     */

    async getContexts(addressOrRemote = null) {
        let remoteId = addressOrRemote;

        if (!remoteId) {
            remoteId = await this.getCurrentRemote();
            if (!remoteId) {
                throw new Error('No default remote bound. Use: canvas remote bind <user@remote>');
            }
        }

        const apiClient = await this.getApiClient(remoteId);
        const response = await apiClient.getContexts();

        // Update local cache
        const contexts = response.payload || response.data || response;
        if (Array.isArray(contexts)) {
            for (const context of contexts) {
                const contextKey = `${remoteId}:${context.id}`;
                await this.remoteStore.updateContext(contextKey, context);
            }
        }

        return response;
    }

    async getContext(addressOrId) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        const response = await apiClient.getContext(resourceId);

        // Update local cache
        const context = response.payload || response.data || response;
        if (context) {
            const contextKey = extractResourceKey(addressOrId) || `${await this.getCurrentRemote()}:${resourceId}`;
            await this.remoteStore.updateContext(contextKey, context);
        }

        return response;
    }

    async createContext(contextData, remoteId = null) {
        if (!remoteId) {
            remoteId = await this.getCurrentRemote();
            if (!remoteId) {
                throw new Error('No default remote bound. Use: canvas remote bind <user@remote>');
            }
        }

        const apiClient = await this.getApiClient(remoteId);
        const response = await apiClient.createContext(contextData);

        // Update local cache
        const context = response.payload || response.data || response;
        if (context) {
            const contextKey = `${remoteId}:${context.id}`;
            await this.remoteStore.updateContext(contextKey, context);
        }

        return response;
    }

    async updateContext(addressOrId, contextData) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        const response = await apiClient.updateContext(resourceId, contextData);

        // Update local cache
        const context = response.payload || response.data || response;
        if (context) {
            const contextKey = extractResourceKey(addressOrId) || `${await this.getCurrentRemote()}:${resourceId}`;
            await this.remoteStore.updateContext(contextKey, context);
        }

        return response;
    }

    async deleteContext(addressOrId) {
        const { apiClient, resourceId } = await this.resolveResource(addressOrId);
        const response = await apiClient.deleteContext(resourceId);

        // Remove from local cache
        const contextKey = extractResourceKey(addressOrId) || `${await this.getCurrentRemote()}:${resourceId}`;
        await this.remoteStore.removeContext(contextKey);

        return response;
    }

    /**
     * Document operations with resource address support
     */

    async getDocuments(containerAddressOrId, containerType = 'context', options = {}) {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.getDocuments(resourceId, containerType, options);
    }

    async getDocument(containerAddressOrId, documentId, containerType = 'context') {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.getDocument(resourceId, documentId, containerType);
    }

    async createDocument(containerAddressOrId, documentData, containerType = 'context', featureArray = []) {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.createDocument(resourceId, documentData, containerType, featureArray);
    }

    async updateDocument(containerAddressOrId, documentId, documentData, containerType = 'context') {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.updateDocument(resourceId, documentId, documentData, containerType);
    }

    async deleteDocument(containerAddressOrId, documentId, containerType = 'context') {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.deleteDocument(resourceId, documentId, containerType);
    }

    async deleteDocuments(containerAddressOrId, documentIds, containerType = 'context') {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.deleteDocuments(resourceId, documentIds, containerType);
    }

    async removeDocument(containerAddressOrId, documentId, containerType = 'context') {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.removeDocument(resourceId, documentId, containerType);
    }

    async removeDocuments(containerAddressOrId, documentIds, containerType = 'context') {
        const { apiClient, resourceId } = await this.resolveResource(containerAddressOrId);
        return await apiClient.removeDocuments(resourceId, documentIds, containerType);
    }

    /**
     * Utility methods
     */

    async ping(remoteId = null) {
        if (!remoteId) {
            remoteId = await this.getCurrentRemote();
            if (!remoteId) {
                throw new Error('No default remote bound. Use: canvas remote bind <user@remote>');
            }
        }

        const apiClient = await this.getApiClient(remoteId);
        return await apiClient.ping();
    }

    /**
     * Get cached resources from local storage
     */

    async getCachedWorkspaces(remoteId = null) {
        const workspaces = await this.remoteStore.getWorkspaces();

        if (remoteId) {
            const filtered = {};
            const prefix = `${remoteId}:`;
            for (const [key, workspace] of Object.entries(workspaces)) {
                if (key.startsWith(prefix)) {
                    filtered[key] = workspace;
                }
            }
            return filtered;
        }

        return workspaces;
    }

    async getCachedContexts(remoteId = null) {
        const contexts = await this.remoteStore.getContexts();

        if (remoteId) {
            const filtered = {};
            const prefix = `${remoteId}:`;
            for (const [key, context] of Object.entries(contexts)) {
                if (key.startsWith(prefix)) {
                    filtered[key] = context;
                }
            }
            return filtered;
        }

        return contexts;
    }

    /**
     * Clear API client cache (useful after remote configuration changes)
     */
    clearCache() {
        this.apiClients.clear();
        debug('Cleared API client cache');
    }
}

export default EnhancedCanvasApiClient;
