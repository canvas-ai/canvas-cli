/**
 * Simple, ad-hoc, minimal nodejs-based REPL interface for interacting with the Canvas API.
 * Loosely based on the canvas-ui-shell project.
 */


// Utils
const axios = require('axios');
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Default configuration
let config = {
    transports: {
        rest: {
            protocol: 'http',
            host: '127.0.0.1',
            port: 8000,
            baseUrl: '/rest/v1',
            auth: {
                type: 'token',
                token: 'canvas-server-token',
            },
            timeout: 2000
        }
    }
};

// Load configuration from default location
const configPath = path.join(os.homedir(), '.canvas', 'config', 'client.json');
if (fs.existsSync(configPath)) {
    try {
        const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config = { ...config, ...loadedConfig };
    } catch (error) {
        console.warn(chalk.red('Failed to load or parse the config file, using defaults.'));
    }
}

const restConfig = config.transports.rest;

// Initialize HTTP client
const httpClient = axios.create({
    baseURL: `${restConfig.protocol}://${restConfig.host}:${restConfig.port}${restConfig.baseUrl}`,
    headers: {
        Authorization: `Bearer ${restConfig.auth.token}`,
        'Content-Type': 'application/json',
    },
    timeout: restConfig.timeout,
});

// Quick & dirty session management
var session = {
    sessionId: 'default',
    contextId: 'default',
};


/**
 * Utility functions
 */

const apiReachable = async () => {
    try {
        const response = await httpClient.get('/ping');
        return response.data.payload === 'pong';
    } catch (error) {
        return false;
    }
}

function setPromptPath(path, sessionId = 'default') {
    const styledPrompt = `${sessionId}:[${path}] > `;
    vorpal.delimiter(styledPrompt);
    // vorpal.ui.delimiter(stripAnsi(styledPrompt));
}

function updatePrompt() {
    httpClient.get('/context/path?sessionId=' + session.sessionId)
        .then(response => {
            const contextPath = response.data.payload;
            setPromptPath(contextPath, session.sessionId);
        }).catch(error => {
            vorpal.log('Error fetching context path:', error.message);
            setPromptPath('Canvas Server not reachable');
        });
}

function getData(path) {
    httpClient.get(path)
        .then(response => {
            vorpal.log(response.data.payload);
        }).catch(error => {
            vorpal.log('Error fetching data:', error.message);
        });
}

function postData(path, data) {
    httpClient.post(path, JSON.stringify({
        sessionId: session.sessionId,
        contextId: session.contextId,
        ...data
    }))
        .then(response => {
            vorpal.log(response.data.payload);
        }).catch(error => {
            vorpal.log('Error posting data:', error.message);
        });
}


/**
 * Vorpal
 */

const vorpal = require('vorpal')()


/**
 * Context API
 */

vorpal
    .command('context', 'Returns /context')
    .action(function(args, callback) {
        getData('/context');
        callback();
    });

vorpal
    .command('context url', 'Returns /context/url')
    .action(function(args, callback) {
        getData('/context/url');
        callback();
    });

vorpal
    .command('context path', 'Returns /context/path')
    .action(function(args, callback) {
        getData('/context/path');
        callback();
    });

vorpal
    .command('context paths', 'Returns /context/paths')
    .action(function(args, callback) {
        getData('/context/paths');
        callback();
    });

vorpal
    .command('context tree', 'Returns /context/tree')
    .action(function(args, callback) {
        getData('/context/tree');
        callback();
    });

vorpal
    .command('context list [abstraction]', 'Returns all documents for the current context or documents of type <abstraction> if specified.')
    .action(function(args, callback) {
        if (args.abstraction) {
            this.log(`Fetching documents of type: ${args.abstraction}`);
            getData(`/context/documents/${args.abstraction}`);
        } else {
            this.log('Fetching all documents for the current context');
            getData('/context/documents');
        }
        callback();
    });


vorpal
    .command('context bitmaps', 'Returns /context/bitmaps')
    .action(function(args, callback) {
        getData('/context/bitmaps');
        callback();
    });

vorpal
    .command('context set <path>', 'Set context to the given path')
    .action(function (args, callback) {
        this.log(`Setting context to: ${args.path}`);
        postData('/context/url', {
            url: args.path,
            sessionId: session.sessionId,
            contextId: session.contextId
        });
        setPromptPath(args.path);
        callback();
    });


/**
 * Documents API
 */

vorpal
  .command('documents', 'Returns /documents')
  .action(function(args, callback) {
    getData('/documents');
    callback();
  });

vorpal
  .command('documents notes', 'Returns /documents/notes')
  .action(function(args, callback) {
    getData('/documents/notes');
    callback();
  });


/**
 * Sessions API
 */

vorpal
    .command('sessions list', 'Returns /sessions')
    .action(function(args, callback) {
        getData('/sessions');
        callback();
    });

vorpal
    .command('sessions set <sessionId>', 'Sets a session')
    .action(function(args, callback) {
        this.log(`Setting session to: ${args.sessionId}`);
        session.sessionId = args.sessionId;
        updatePrompt();
        callback();
    });


/**
 * Contexts API
 */

vorpal
    .command('list', 'Returns /contexts')
    .action(function(args, callback) {
        getData('/contexts');
        callback();
    });


/**
 * Init
 */

// Setting the initial prompt
vorpal
    .delimiter('Hit enter to start...')
    .show();

// Middleware to update the prompt on every command
vorpal.use((session) => {
    session.on('client_prompt_submit', () => {
        updatePrompt();
    });
});

updatePrompt();

// Start Vorpal
vorpal.show();
