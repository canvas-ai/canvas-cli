'use strict';

// Includes
const fs = require('fs');
const os = require('os');
const path = require('path');

// Determine the user's home directory
const CANVAS_USER_HOME = os.platform() === 'win32' ?
    path.join(os.homedir(), 'Canvas') :
    path.join(os.homedir(), '.canvas');

// Runtime configuration
const CANVAS_USER_CONFIG = path.join(CANVAS_USER_HOME, 'config', 'canvas-cli.json');

// Default canvas-server connection configuration
const DEFAULT_CONFIG = {
    user: {
        home: CANVAS_USER_HOME,
    },
    transports: {
        ollama: {
            host: 'http://172.16.2.102:11434',
            defaultModel: 'llama3.1:latest',
        },
        rest: {
            protocol: 'http',
            host: '127.0.0.1',
            port: 8000,
            baseUrl: '/rest/v1',
            auth: {
                type: 'token',
                token: 'canvas-server-token',
            },
            timeout: 2000,
        },
    },
};

// Simple and stupid, please replace with Conf
class Config {

    constructor(options = {}) {
        this.configPath = options.configPath || CANVAS_USER_CONFIG;
        this.config = this.loadConfig();
    }

    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            this.saveConfig(DEFAULT_CONFIG);
            return DEFAULT_CONFIG;
        }

        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
            return this.config;
        } catch (error) {
            console.error('Error loading config:', error.message);
        }
    }

    saveConfig(config = this.config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving config:', error.message);
        }
    }

}

module.exports = Config;
