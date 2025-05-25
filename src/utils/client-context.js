'use strict';

import os from 'os';
import pkg from 'node-machine-id';
const { machineIdSync } = pkg;
import debugInstance from 'debug';

const debug = debugInstance('canvas:cli:client-context');

/**
 * Client context collector for Canvas CLI
 * Collects system and environment information for LLM context and feature arrays
 */
export class ClientContextCollector {
    constructor() {
        this.machineId = machineIdSync(true);
        this.appId = 'canvas-cli';
    }

    /**
     * Collect comprehensive client context
     */
    collect() {
        const context = {
            // Application context
            app: {
                id: this.appId,
                machineId: this.machineId
            },

            // Operating system context
            os: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                release: os.release(),
                version: os.version()
                },

            // User context
            user: this.getUserContext(),

            // Runtime context
            runtime: {
                nodeVersion: process.version,
                pid: process.pid,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            },

            // Temporal context
            datetime: {
                iso: new Date().toISOString(),
                timestamp: Date.now(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };

        debug('Collected client context:', context);
        return context;
    }

    /**
     * Get user context information
     */
    getUserContext() {
        try {
            const userInfo = os.userInfo();
            return {
                name: userInfo.username,
                uid: userInfo.uid,
                gid: userInfo.gid,
                homedir: userInfo.homedir,
                shell: userInfo.shell || process.env.SHELL || 'unknown'
            };
        } catch (error) {
            debug('Failed to get user context:', error.message);
            return {
                name: process.env.USER || process.env.USERNAME || 'unknown',
                uid: null,
                gid: null,
                homedir: process.env.HOME || process.env.USERPROFILE || 'unknown',
                shell: process.env.SHELL || 'unknown'
            };
        }
    }

    /**
     * Generate feature array format for Canvas API
     * Returns array of strings in the format expected by Canvas
     */
    generateFeatureArray() {
        const context = this.collect();

        return [
            `client/app/id/${context.app.id}`,
            `client/device/id/${context.app.machineId}`,
            `client/os/platform/${context.os.platform}`,
            `client/os/architecture/${context.os.arch}`,
            `client/os/hostname/${context.os.hostname}`,
            `client/os/release/${context.os.release}`,
            `client/user/name/${context.user.name}`,
            `client/user/homedir/${context.user.homedir.replace(/\\/g, '/').replace(/^\//, '')}`, // Remove leading slash
            `client/user/shell/${context.user.shell.replace(/^\//, '')}`,
            `client/timestamp/${context.datetime.iso}`,
            `client/timezone/${context.datetime.timezone}`
        ];
    }

    /**
     * Generate context for LLM queries
     * Returns a structured object suitable for LLM context
     */
    generateLLMContext() {
        const context = this.collect();

        return {
            client: {
                application: context.app.id,
                machine_id: context.app.machineId,
                platform: context.os.platform,
                architecture: context.os.arch,
                hostname: context.os.hostname,
                user: context.user.name,
                home_directory: context.user.homedir,
                shell: context.user.shell,
                timezone: context.datetime.timezone,
                timestamp: context.datetime.iso
            },
            system: {
                os_release: context.os.release,
                node_version: context.runtime.nodeVersion,
                process_uptime: context.runtime.uptime
            }
        };
    }

    /**
     * Get minimal context for API headers
     */
    getApiHeaders() {
        const context = this.collect();

        return {
            'X-Client-App': context.app.id,
            'X-Client-Platform': context.os.platform,
            'X-Client-Machine': context.app.machineId,
            'X-Client-User': context.user.name,
            'X-Client-Timezone': context.datetime.timezone
        };
    }
}

// Export singleton instance
export const clientContext = new ClientContextCollector();

export default clientContext;
