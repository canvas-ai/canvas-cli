'use strict';

import chalk from 'chalk';
import BaseCommand from './base.js';
import { remoteStore } from '../utils/config.js';
import {
    parseRemoteIdentifier,
    constructRemoteIdentifier,
    isLocalRemote
} from '../utils/address-parser.js';

/**
 * Remote command for managing Canvas remote servers
 */
export class RemoteCommand extends BaseCommand {
    constructor(config) {
        super(config);
        this.options = null;
        this.remoteStore = remoteStore;
    }

    async execute(parsed) {
        this.options = parsed.options;

        // Collect client context for this execution
        this.collectClientContext();

        // Most remote operations don't need server connection check
        // as they work with local configuration

        const action = parsed.args[0] || 'list';
        const methodName = `handle${action.charAt(0).toUpperCase() + action.slice(1)}`;

        if (typeof this[methodName] === 'function') {
            return await this[methodName](parsed);
        } else {
            console.error(chalk.red(`Unknown remote action: ${action}`));
            this.showHelp();
            return 1;
        }
    }

    /**
     * Add a new remote
     */
    async handleAdd(parsed) {
        const remoteId = parsed.args[1];
        const url = parsed.args[2];

        if (!remoteId) {
            throw new Error('Remote identifier is required (format: user@remote-name)');
        }

        if (!url) {
            throw new Error('Remote URL is required');
        }

        // Parse and validate remote identifier
        const parsedRemote = parseRemoteIdentifier(remoteId);
        if (!parsedRemote) {
            throw new Error('Invalid remote identifier format. Use: user@remote-name');
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`Invalid URL format: ${url}`);
        }

        try {
            // Check if remote already exists
            const existingRemote = await this.remoteStore.getRemote(remoteId);
            if (existingRemote) {
                throw new Error(`Remote '${remoteId}' already exists. Use 'canvas remote remove ${remoteId}' first.`);
            }

            // Create remote configuration
            const remoteConfig = {
                url: url,
                apiBase: parsed.options.apiBase || '/rest/v2',
                description: parsed.options.description || `Remote Canvas server at ${url}`,
                auth: {
                    method: parsed.options.token ? 'token' : 'password',
                    tokenType: 'jwt',
                    token: parsed.options.token || ''
                }
            };

            // Add remote to store
            await this.remoteStore.addRemote(remoteId, remoteConfig);

            console.log(chalk.green(`✓ Remote '${remoteId}' added successfully`));
            console.log(`  URL: ${url}`);
            console.log(`  API Base: ${remoteConfig.apiBase}`);

            if (parsed.options.token) {
                console.log(chalk.yellow('  Authentication: Token-based'));
            } else {
                console.log(chalk.yellow('  Authentication: Password-based (use login command)'));
            }

            // Offer to bind as default if it's the first remote
            const remotes = await this.remoteStore.getRemotes();
            if (Object.keys(remotes).length === 1) {
                console.log();
                console.log(chalk.cyan(`Tip: Set as default remote with: canvas remote bind ${remoteId}`));
            }

            return 0;
        } catch (error) {
            throw new Error(`Failed to add remote: ${error.message}`);
        }
    }

    /**
     * List all remotes
     */
    async handleList(parsed) {
        try {
            const remotes = await this.remoteStore.getRemotes();
            const session = await this.remoteStore.getSession();

            if (Object.keys(remotes).length === 0) {
                console.log(chalk.yellow('No remotes configured'));
                console.log();
                console.log(chalk.cyan('Add a remote with:'));
                console.log('  canvas remote add user@remote-name https://server-url');
                return 0;
            }

            this.output(Object.entries(remotes).map(([id, config]) => ({
                id,
                url: config.url,
                description: config.description || '',
                auth: config.auth?.method || 'unknown',
                lastSynced: config.lastSynced ? new Date(config.lastSynced).toLocaleString() : 'Never',
                isDefault: session.boundRemote === id ? '✓' : '',
                status: this.getRemoteStatus(config)
            })), 'remote');

            if (session.boundRemote) {
                console.log();
                console.log(chalk.cyan(`Current default remote: ${session.boundRemote}`));
            }

            return 0;
        } catch (error) {
            throw new Error(`Failed to list remotes: ${error.message}`);
        }
    }

    /**
     * Remove a remote
     */
    async handleRemove(parsed) {
        const remoteId = parsed.args[1];

        if (!remoteId) {
            throw new Error('Remote identifier is required');
        }

        if (!parsed.options.force) {
            console.log(chalk.yellow(`Warning: This will remove remote '${remoteId}' and all its cached data.`));
            console.log(chalk.yellow('Use --force to confirm removal.'));
            return 1;
        }

        try {
            const remote = await this.remoteStore.getRemote(remoteId);
            if (!remote) {
                throw new Error(`Remote '${remoteId}' not found`);
            }

            await this.remoteStore.removeRemote(remoteId);

            // Update session if this was the bound remote
            const session = await this.remoteStore.getSession();
            if (session.boundRemote === remoteId) {
                await this.remoteStore.updateSession({
                    boundRemote: null,
                    defaultWorkspace: null,
                    boundContext: null,
                    boundAt: null
                });
                console.log(chalk.yellow('  Unbound default remote'));
            }

            console.log(chalk.green(`✓ Remote '${remoteId}' removed successfully`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to remove remote: ${error.message}`);
        }
    }

    /**
     * Sync with a remote (fetch workspaces and contexts)
     */
    async handleSync(parsed) {
        const remoteId = parsed.args[1];

        if (!remoteId) {
            throw new Error('Remote identifier is required');
        }

        try {
            const remote = await this.remoteStore.getRemote(remoteId);
            if (!remote) {
                throw new Error(`Remote '${remoteId}' not found`);
            }

            console.log(chalk.blue(`Syncing with remote '${remoteId}'...`));

            // Create API client for this remote
            const apiClient = await this.createRemoteApiClient(remoteId);

            // Test connection
            await apiClient.ping();
            console.log(chalk.green('  ✓ Connection verified'));

            // Sync workspaces
            console.log('  📦 Syncing workspaces...');
            const workspacesResponse = await apiClient.getWorkspaces();
            const workspaces = workspacesResponse.payload || workspacesResponse.data || workspacesResponse;

            if (Array.isArray(workspaces)) {
                for (const workspace of workspaces) {
                    const workspaceKey = `${remoteId}:${workspace.id || workspace.name}`;
                    await this.remoteStore.updateWorkspace(workspaceKey, workspace);
                }
                console.log(chalk.green(`    ✓ Synced ${workspaces.length} workspaces`));
            }

            // Sync contexts
            console.log('  📋 Syncing contexts...');
            const contextsResponse = await apiClient.getContexts();
            const contexts = contextsResponse.payload || contextsResponse.data || contextsResponse;

            if (Array.isArray(contexts)) {
                for (const context of contexts) {
                    const contextKey = `${remoteId}:${context.id}`;
                    await this.remoteStore.updateContext(contextKey, context);
                }
                console.log(chalk.green(`    ✓ Synced ${contexts.length} contexts`));
            }

            // Update last synced timestamp
            await this.remoteStore.updateRemote(remoteId, {
                lastSynced: new Date().toISOString()
            });

            console.log(chalk.green(`✓ Sync completed for remote '${remoteId}'`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to sync remote: ${error.message}`);
        }
    }

    /**
     * Ping a remote to test connectivity
     */
    async handlePing(parsed) {
        const remoteId = parsed.args[1];

        if (!remoteId) {
            throw new Error('Remote identifier is required');
        }

        try {
            const remote = await this.remoteStore.getRemote(remoteId);
            if (!remote) {
                throw new Error(`Remote '${remoteId}' not found`);
            }

            console.log(chalk.blue(`Pinging remote '${remoteId}' at ${remote.url}...`));

            const apiClient = await this.createRemoteApiClient(remoteId);
            const start = Date.now();

            const response = await apiClient.ping();
            const duration = Date.now() - start;

            const serverInfo = response.payload || response.data || response;

            console.log(chalk.green(`✓ Remote '${remoteId}' is reachable (${duration}ms)`));
            if (serverInfo.version) {
                console.log(`  Server Version: ${serverInfo.version}`);
            }
            if (serverInfo.environment) {
                console.log(`  Environment: ${serverInfo.environment}`);
            }
            if (serverInfo.hostname) {
                console.log(`  Hostname: ${serverInfo.hostname}`);
            }

            return 0;
        } catch (error) {
            console.log(chalk.red(`✗ Remote '${remoteId}' is not reachable`));
            console.log(`  Error: ${error.message}`);
            return 1;
        }
    }

    /**
     * Bind to a remote as default
     */
    async handleBind(parsed) {
        const remoteId = parsed.args[1];

        if (!remoteId) {
            throw new Error('Remote identifier is required');
        }

        try {
            const remote = await this.remoteStore.getRemote(remoteId);
            if (!remote) {
                throw new Error(`Remote '${remoteId}' not found`);
            }

            await this.remoteStore.updateSession({
                boundRemote: remoteId,
                boundAt: new Date().toISOString()
            });

            console.log(chalk.green(`✓ Bound to remote '${remoteId}' as default`));
            console.log(`  URL: ${remote.url}`);
            console.log(`  Description: ${remote.description || 'No description'}`);

            return 0;
        } catch (error) {
            throw new Error(`Failed to bind remote: ${error.message}`);
        }
    }

    /**
     * Login to a remote (JWT authentication)
     */
    async handleLogin(parsed) {
        const remoteId = parsed.args[1];

        if (!remoteId) {
            throw new Error('Remote identifier is required');
        }

        const email = parsed.options.email || parsed.options.username;
        const password = parsed.options.password;

        if (!email) {
            throw new Error('Email is required (use --email)');
        }

        if (!password) {
            throw new Error('Password is required (use --password)');
        }

        try {
            const remote = await this.remoteStore.getRemote(remoteId);
            if (!remote) {
                throw new Error(`Remote '${remoteId}' not found`);
            }

            console.log(chalk.blue(`Logging into remote '${remoteId}'...`));

            const apiClient = await this.createRemoteApiClient(remoteId);
            const response = await apiClient.login({ email, password });

            const responseData = response.payload || response.data || response;
            const { token, user } = responseData;

            // Update remote config with new token
            await this.remoteStore.updateRemote(remoteId, {
                auth: {
                    method: 'token',
                    tokenType: 'jwt',
                    token: token
                }
            });

            console.log(chalk.green(`✓ Successfully logged into '${remoteId}' as ${user.name || user.email}`));
            console.log(chalk.gray('Token stored in remote configuration'));

            return 0;
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    /**
     * Logout from a remote
     */
    async handleLogout(parsed) {
        const remoteId = parsed.args[1];

        if (!remoteId) {
            throw new Error('Remote identifier is required');
        }

        try {
            const remote = await this.remoteStore.getRemote(remoteId);
            if (!remote) {
                throw new Error(`Remote '${remoteId}' not found`);
            }

            // Try to logout on server
            try {
                const apiClient = await this.createRemoteApiClient(remoteId);
                await apiClient.logout();
            } catch (error) {
                console.log(chalk.yellow('⚠ Server logout may have failed, clearing local token'));
            }

            // Clear token from local config
            await this.remoteStore.updateRemote(remoteId, {
                auth: {
                    method: 'password',
                    tokenType: 'jwt',
                    token: ''
                }
            });

            console.log(chalk.green(`✓ Logged out from remote '${remoteId}'`));
            return 0;
        } catch (error) {
            throw new Error(`Logout failed: ${error.message}`);
        }
    }

    /**
     * Rename a remote
     */
    async handleRename(parsed) {
        const oldRemoteId = parsed.args[1];
        const newRemoteId = parsed.args[2];

        if (!oldRemoteId || !newRemoteId) {
            throw new Error('Both old and new remote identifiers are required');
        }

        // Validate new remote identifier format
        const parsedNewRemote = parseRemoteIdentifier(newRemoteId);
        if (!parsedNewRemote) {
            throw new Error('Invalid new remote identifier format. Use: user@remote-name');
        }

        try {
            const oldRemote = await this.remoteStore.getRemote(oldRemoteId);
            if (!oldRemote) {
                throw new Error(`Remote '${oldRemoteId}' not found`);
            }

            const existingNewRemote = await this.remoteStore.getRemote(newRemoteId);
            if (existingNewRemote) {
                throw new Error(`Remote '${newRemoteId}' already exists`);
            }

            // Add with new name and remove old
            await this.remoteStore.addRemote(newRemoteId, oldRemote);
            await this.remoteStore.removeRemote(oldRemoteId);

            // Update session if this was the bound remote
            const session = await this.remoteStore.getSession();
            if (session.boundRemote === oldRemoteId) {
                await this.remoteStore.updateSession({
                    boundRemote: newRemoteId
                });
            }

            console.log(chalk.green(`✓ Remote renamed from '${oldRemoteId}' to '${newRemoteId}'`));
            return 0;
        } catch (error) {
            throw new Error(`Failed to rename remote: ${error.message}`);
        }
    }

    /**
     * Show remote details
     */
    async handleShow(parsed) {
        const remoteId = parsed.args[1];

        if (!remoteId) {
            throw new Error('Remote identifier is required');
        }

        try {
            const remote = await this.remoteStore.getRemote(remoteId);
            if (!remote) {
                throw new Error(`Remote '${remoteId}' not found`);
            }

            const session = await this.remoteStore.getSession();

            console.log(chalk.bold(`Remote Details: ${remoteId}`));
            console.log();
            console.log(`URL: ${remote.url}`);
            console.log(`API Base: ${remote.apiBase}`);
            console.log(`Description: ${remote.description || 'No description'}`);
            console.log(`Authentication: ${remote.auth?.method || 'unknown'}`);
            console.log(`Token Type: ${remote.auth?.tokenType || 'N/A'}`);
            console.log(`Has Token: ${remote.auth?.token ? 'Yes' : 'No'}`);
            console.log(`Last Synced: ${remote.lastSynced ? new Date(remote.lastSynced).toLocaleString() : 'Never'}`);
            console.log(`Is Default: ${session.boundRemote === remoteId ? 'Yes' : 'No'}`);
            console.log(`Is Local: ${isLocalRemote(parseRemoteIdentifier(remoteId)?.remote) ? 'Yes' : 'No'}`);

            // Show cached resources count
            const contexts = await this.remoteStore.getContexts();
            const workspaces = await this.remoteStore.getWorkspaces();

            const remoteContexts = Object.keys(contexts).filter(key => key.startsWith(`${remoteId}:`));
            const remoteWorkspaces = Object.keys(workspaces).filter(key => key.startsWith(`${remoteId}:`));

            console.log();
            console.log(chalk.cyan('Cached Resources:'));
            console.log(`  Workspaces: ${remoteWorkspaces.length}`);
            console.log(`  Contexts: ${remoteContexts.length}`);

            return 0;
        } catch (error) {
            throw new Error(`Failed to show remote details: ${error.message}`);
        }
    }

    /**
     * Helper methods
     */

    async createRemoteApiClient(remoteId) {
        // Use the enhanced API client to get a client for the specific remote
        return this.apiClient.getApiClient(remoteId);
    }

    getRemoteStatus(remoteConfig) {
        if (!remoteConfig.auth?.token) {
            return chalk.yellow('No Token');
        }
        if (remoteConfig.lastSynced) {
            const lastSync = new Date(remoteConfig.lastSynced);
            const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
            if (hoursSinceSync < 1) {
                return chalk.green('Synced');
            } else if (hoursSinceSync < 24) {
                return chalk.yellow('Stale');
            } else {
                return chalk.red('Old');
            }
        }
        return chalk.gray('Unknown');
    }

    /**
     * Show help
     */
    showHelp() {
        console.log(chalk.bold('Remote Commands:'));
        console.log('  add <user@remote> <url>    Add a new remote server');
        console.log('  list                       List all configured remotes');
        console.log('  remove <user@remote>       Remove a remote server');
        console.log('  sync <user@remote>         Sync workspaces and contexts from remote');
        console.log('  ping <user@remote>         Test connectivity to remote');
        console.log('  bind <user@remote>         Set remote as default');
        console.log('  login <user@remote>        Login to remote (JWT)');
        console.log('  logout <user@remote>       Logout from remote');
        console.log('  rename <old> <new>         Rename a remote identifier');
        console.log('  show <user@remote>         Show detailed remote information');
        console.log();
        console.log(chalk.bold('Options:'));
        console.log('  --token <token>           API token for authentication');
        console.log('  --email <email>           Email for login');
        console.log('  --username <email>        Email for login (alias)');
        console.log('  --password <password>     Password for login');
        console.log('  --api-base <path>         API base path (default: /rest/v2)');
        console.log('  --description <desc>      Remote description');
        console.log('  --force                   Force action without confirmation');
        console.log();
        console.log(chalk.bold('Examples:'));
        console.log('  canvas remote add admin@canvas.local http://localhost:8001');
        console.log('  canvas remote add user@work.server https://canvas.company.com --token canvas-abc123');
        console.log('  canvas remote list');
        console.log('  canvas remote sync admin@canvas.local');
        console.log('  canvas remote bind admin@canvas.local');
        console.log('  canvas remote login user@work.server --email user@company.com --password mypass');
        console.log('  canvas remote ping admin@canvas.local');
        console.log('  canvas remote show admin@canvas.local');
        console.log('  canvas remote rename old@server new@server');
        console.log('  canvas remote remove old@server --force');
        console.log();
        console.log(chalk.bold('Remote Identifier Format:'));
        console.log('  user@remote-name          Where user is your username on that remote');
        console.log('  admin@canvas.local        Local Canvas server');
        console.log('  john@work.company.com     Remote Canvas server');
        console.log();
        console.log(chalk.cyan('Note: After adding a remote, use sync to fetch available workspaces and contexts.'));
    }
}

export default RemoteCommand;
