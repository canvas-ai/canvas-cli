'use strict';

import axios from 'axios';
import { setupDebug } from '../lib/debug.js';

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
                'Accept': 'application/json',
                'User-Agent': 'canvas-cli/1.0.0'
            }
        });

        // Add request interceptor for authentication and content-type
        this.client.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }

            // Set content-type for POST/PUT/PATCH requests (whether they have data or not)
            if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
                config.headers['Content-Type'] = 'application/json';
            }

            debug('Request:', config.method?.toUpperCase(), config.url);
            return config;
        });

        // Add response interceptor for error handling and ResponseObject format
        this.client.interceptors.response.use(
            (response) => {
                debug('Response:', response.status, response.config.url);

                // Handle ResponseObject format
                if (response.data && typeof response.data === 'object') {
                    const { status, statusCode, message, payload, count } = response.data;

                    // If it's a ResponseObject, return it as-is for CLI to handle
                    if (status && statusCode && message !== undefined) {
                        return response;
                    }
                }

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

            // Handle ResponseObject error format
            if (data && data.status === 'error' && data.message) {
                return new Error(`API Error (${status}): ${data.message}`);
            }

            // Fallback to generic error handling
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
        const response = await this.client.patch(`/workspaces/${workspaceId}`, workspaceData);
        return response.data;
    }

    async deleteWorkspace(workspaceId) {
        const response = await this.client.delete(`/workspaces/${workspaceId}`);
        return response.data;
    }

    async startWorkspace(workspaceId) {
        const response = await this.client.post(`/workspaces/${workspaceId}/start`);
        return response.data;
    }

    async stopWorkspace(workspaceId) {
        const response = await this.client.post(`/workspaces/${workspaceId}/stop`);
        return response.data;
    }

    async openWorkspace(workspaceId) {
        const response = await this.client.post(`/workspaces/${workspaceId}/open`);
        return response.data;
    }

    async closeWorkspace(workspaceId) {
        const response = await this.client.post(`/workspaces/${workspaceId}/close`);
        return response.data;
    }

    async getWorkspaceStatus(workspaceId) {
        const response = await this.client.get(`/workspaces/${workspaceId}/status`);
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
        if (options.filterArray && Array.isArray(options.filterArray)) {
            options.filterArray.forEach(filter => params.append('filterArray', filter));
        }
        if (options.includeServerContext) params.append('includeServerContext', 'true');
        if (options.includeClientContext) params.append('includeClientContext', 'true');
        if (options.limit) params.append('limit', options.limit);

        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;
        const url = `${baseUrl}/documents${params.toString() ? '?' + params.toString() : ''}`;
        const response = await this.client.get(url);
        return response.data;
    }

    async getDocument(containerId, documentId, containerType = 'context') {
        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;
        const response = await this.client.get(`${baseUrl}/documents/by-id/${documentId}`);
        return response.data;
    }

    async createDocument(containerId, documentData, containerType = 'context', featureArray = []) {
        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;

        // Always append client/app/canvas-cli to the featureArray for CLI-created documents
        const enhancedFeatureArray = [...featureArray];
        if (!enhancedFeatureArray.includes('client/app/canvas-cli')) {
            enhancedFeatureArray.push('client/app/canvas-cli');
        }

        const payload = {
            documents: Array.isArray(documentData) ? documentData : [documentData],
            featureArray: enhancedFeatureArray
        };
        const response = await this.client.post(`${baseUrl}/documents`, payload);
        return response.data;
    }

    async updateDocument(containerId, documentId, documentData, containerType = 'context') {
        const baseUrl = containerType === 'context' ? `/contexts/${containerId}` : `/workspaces/${containerId}`;
        const documents = Array.isArray(documentData) ? documentData : [{ id: documentId, ...documentData }];
        const response = await this.client.put(`${baseUrl}/documents`, { documents });
        return response.data;
    }

    async deleteDocument(containerId, documentId, containerType = 'context') {
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;
        const endpoint = `${baseUrl}/documents`;
        const documentIdArray = [documentId];

        const response = await this.client.delete(endpoint, {
            data: documentIdArray
        });
        return response.data;
    }

    async deleteDocuments(containerId, documentIds, containerType = 'context') {
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;
        const endpoint = `${baseUrl}/documents`;

        const response = await this.client.delete(endpoint, {
            data: documentIds
        });
        return response.data;
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
        // Update to use email instead of username and match new API structure
        const loginData = {
            email: credentials.username || credentials.email,
            password: credentials.password,
            strategy: credentials.strategy || 'auto'
        };
        const response = await this.client.post('/auth/login', loginData);
        return response.data;
    }

    async logout() {
        const response = await this.client.post('/auth/logout');
        return response.data;
    }

    async getProfile() {
        const response = await this.client.get('/auth/me');
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
        const response = await this.client.get('/rest/v2/ping');
        return response.data;
    }

    async removeDocument(containerId, documentId, containerType = 'context') {
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;
        const endpoint = `${baseUrl}/documents/remove`;
        const documentIdArray = [documentId];

        const response = await this.client.delete(endpoint, {
            data: documentIdArray
        });
        return response.data;
    }

    async removeDocuments(containerId, documentIds, containerType = 'context') {
        const baseUrl = containerType === 'workspace' ? `/workspaces/${containerId}` : `/contexts/${containerId}`;
        const endpoint = `${baseUrl}/documents/remove`;

        const response = await this.client.delete(endpoint, {
            data: documentIds
        });
        return response.data;
    }
}

export default CanvasApiClient;
