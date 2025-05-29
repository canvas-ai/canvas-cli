'use strict';

import axios from 'axios';
import { setupDebug } from './debug.js';

const debug = setupDebug('canvas:cli:api');

/**
 * Canvas API Client
 */
export class CanvasApiClient {
    constructor(config) {
        this.config = config;
        this.baseURL = config.get('server.url');
        this.token = config.get('server.auth.token');

        // Create axios instance
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'canvas-cli/1.0.0'
            }
        });

        // Add request interceptor for authentication
        this.client.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            debug('Request:', config.method?.toUpperCase(), config.url);
            return config;
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => {
                debug('Response:', response.status, response.config.url);
                return response;
            },
            (error) => {
                debug('Error:', error.response?.status, error.config?.url, error.message);
                return Promise.reject(this.formatError(error));
            }
        );
    }

    /**
     * Format API errors for better user experience
     */
    formatError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const message = data?.message || data?.error || `HTTP ${status}`;
            return new Error(`API Error (${status}): ${message}`);
        } else if (error.request) {
            return new Error(`Network Error: Unable to connect to Canvas server at ${this.baseURL}`);
        } else {
            return new Error(`Request Error: ${error.message}`);
        }
    }

    // Workspace API methods
    async getWorkspaces() {
        const response = await this.client.get('/workspaces');
        return response.data;
    }

    async getWorkspace(workspaceId) {
        const response = await this.client.get(`/workspaces/${workspaceId}`);
        return response.data;
    }

    async createWorkspace(workspaceData) {
        const response = await this.client.post('/workspaces', workspaceData);
        return response.data;
    }

    async updateWorkspace(workspaceId, workspaceData) {
        const response = await this.client.put(`/workspaces/${workspaceId}`, workspaceData);
        return response.data;
    }

    async deleteWorkspace(workspaceId) {
        const response = await this.client.delete(`/workspaces/${workspaceId}`);
        return response.data;
    }

    async startWorkspace(workspaceId) {
        const response = await this.client.post(`/workspaces/${workspaceId}/start`, { action: 'start' });
        return response.data;
    }

    async stopWorkspace(workspaceId) {
        const response = await this.client.post(`/workspaces/${workspaceId}/stop`, { action: 'stop' });
        return response.data;
    }

    async getWorkspaceTree(workspaceId) {
        const response = await this.client.get(`/workspaces/${workspaceId}/tree`);
        return response.data;
    }

    // Context API methods
    async getContexts(options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);

        const url = `/contexts${params.toString() ? '?' + params.toString() : ''}`;
        const response = await this.client.get(url);
        return response.data;
    }

    async getContext(contextId) {
        const response = await this.client.get(`/contexts/${contextId}`);
        return response.data;
    }

    async createContext(contextData) {
        const response = await this.client.post('/contexts', contextData);
        return response.data;
    }

    async updateContext(contextId, contextData) {
        const response = await this.client.put(`/contexts/${contextId}`, contextData);
        return response.data;
    }

    async deleteContext(contextId) {
        const response = await this.client.delete(`/contexts/${contextId}`);
        return response.data;
    }

    async getContextUrl(contextId) {
        const response = await this.client.get(`/contexts/${contextId}/url`);
        return response.data;
    }

    async setContextUrl(contextId, url) {
        const response = await this.client.post(`/contexts/${contextId}/url`, { url });
        return response.data;
    }

    async getContextPath(contextId) {
        const response = await this.client.get(`/contexts/${contextId}/path`);
        return response.data;
    }

    async getContextPathArray(contextId) {
        const response = await this.client.get(`/contexts/${contextId}/path-array`);
        return response.data;
    }

    async getContextTree(contextId) {
        const response = await this.client.get(`/contexts/${contextId}/tree`);
        return response.data;
    }

    // Document API methods
    async getDocuments(containerId, containerType = 'context', options = {}) {
        const params = new URLSearchParams();
        if (options.featureArray && Array.isArray(options.featureArray)) {
            options.featureArray.forEach(feature => params.append('featureArray', feature));
        }
        if (options.schema) params.append('schema', options.schema);
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);

        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;
        const url = `${baseUrl}/documents${params.toString() ? '?' + params.toString() : ''}`;
        const response = await this.client.get(url);
        return response.data;
    }

    async getDocument(containerId, documentId, containerType = 'context') {
        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;
        const response = await this.client.get(`${baseUrl}/documents/${documentId}`);
        return response.data;
    }

    async createDocument(containerId, documentData, containerType = 'context', featureArray = []) {
        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;
        const payload = {
            documents: documentData,
            featureArray: featureArray
        };
        const response = await this.client.post(`${baseUrl}/documents`, payload);
        return response.data;
    }

    async updateDocument(containerId, documentId, documentData, containerType = 'context') {
        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;
        const response = await this.client.put(`${baseUrl}/documents/${documentId}`, documentData);
        return response.data;
    }

    async deleteDocument(containerId, documentId, containerType = 'context') {
        // Fix: containerType should only determine route (context vs workspace), not operation type
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;

        // Operation type should be determined by method name, not containerType
        // For context routes: root = database deletion, /remove = context removal
        // For workspace routes: root = database deletion, /remove = workspace removal
        const endpoint = `${baseUrl}/documents`; // Always use root endpoint for database deletion

        // Always send as array since backend now requires arrays
        const documentIdArray = [documentId];

        // Use axios.delete directly with data parameter
        const response = await this.client.delete(endpoint, {
            data: documentIdArray
        });
        return response.data;
    }

    async deleteDocuments(containerId, documentIds, containerType = 'context') {
        // Fix: containerType should only determine route (context vs workspace), not operation type
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;

        // Always use root endpoint for database deletion
        const endpoint = `${baseUrl}/documents`;

        // Use axios.delete directly with data parameter
        const response = await this.client.delete(endpoint, {
            data: documentIds
        });
        return response.data;
    }

    // Test method using WebSocket instead of REST for delete operations
    async deleteDocumentViaWebSocket(containerId, documentId, containerType = 'context') {
        // This is a temporary test method - in production we'd need proper WebSocket client setup
        console.log(`Would delete document ${documentId} from ${containerId} via WebSocket (${containerType})`);
        return { success: true, method: 'websocket', documentId, containerId, containerType };
    }

    // Schema API methods
    async getSchemas() {
        const response = await this.client.get('/schemas');
        return response.data;
    }

    async getSchema(schemaName) {
        const response = await this.client.get(`/schemas/data/abstraction/${schemaName}`);
        return response.data;
    }

    async getSchemaJson(schemaName) {
        const response = await this.client.get(`/schemas/data/abstraction/${schemaName}.json`);
        return response.data;
    }

    // Auth API methods
    async login(credentials) {
        const response = await this.client.post('/auth/login', credentials);
        return response.data;
    }

    async logout() {
        const response = await this.client.post('/auth/logout', { action: 'logout' });
        return response.data;
    }

    async getProfile() {
        const response = await this.client.get('/auth/profile');
        return response.data;
    }

    async createApiToken(tokenData) {
        const response = await this.client.post('/auth/tokens', tokenData);
        return response.data;
    }

    async getApiTokens() {
        const response = await this.client.get('/auth/tokens');
        return response.data;
    }

    async deleteApiToken(tokenId) {
        const response = await this.client.delete(`/auth/tokens/${tokenId}`);
        return response.data;
    }

    // Health check
    async ping() {
        const response = await this.client.get('/ping');
        return response.data;
    }

    async removeDocument(containerId, documentId, containerType = 'context') {
        // Fix: containerType should only determine route (context vs workspace), not operation type
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;

        // Use /remove endpoint for removal operations (remove from context/workspace)
        const endpoint = `${baseUrl}/documents/remove`;

        // Always send as array since backend now requires arrays
        const documentIdArray = [documentId];

        // Use axios.delete directly with data parameter
        const response = await this.client.delete(endpoint, {
            data: documentIdArray
        });
        return response.data;
    }

    async removeDocuments(containerId, documentIds, containerType = 'context') {
        // Fix: containerType should only determine route (context vs workspace), not operation type
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;

        // Use /remove endpoint for removal operations (remove from context/workspace)
        const endpoint = `${baseUrl}/documents/remove`;

        // Use axios.delete directly with data parameter
        const response = await this.client.delete(endpoint, {
            data: documentIds
        });
        return response.data;
    }
}

export default CanvasApiClient;
