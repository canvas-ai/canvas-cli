'use strict';

import Conf from 'conf';
import os from 'os';
import path from 'path';
import pkg from 'node-machine-id';
const { machineIdSync } = pkg;
import debugInstance from 'debug';
const debug = debugInstance('canvas:cli:config');


/**
 * Constants
 */

const MACHINE_ID = machineIdSync(true);
const APP_ID = 'canvas-cli';

const USER_HOME = process.env.CANVAS_USER_HOME || getUserHome();

function getUserHome() {
    const SERVER_MODE = process.env.SERVER_MODE || 'user';
    const SERVER_HOME = process.env.SERVER_HOME || process.cwd();

    if (SERVER_MODE === 'user') {
        const homeDir = os.homedir();
        if (process.platform === 'win32') {
            return path.join(homeDir, 'Canvas');
        } else {
            return path.join(homeDir, '.canvas');
        }
    }

    return path.join(SERVER_HOME, 'users');
}

const CANVAS_USER_HOME = USER_HOME;
const CANVAS_USER_CONFIG = path.join(CANVAS_USER_HOME, 'config');
const DEFAULT_CONFIG = {
    server: {
        url: 'http://localhost:8001/rest/v2',
        auth: {
            type: 'token',
            token: 'canvas-server-token',
        },
    },
    session: {
        context: {
            id: 'default',
            clientArray: generateClientContextArray(),
        }
    },
    connectors: {
        ollama: {
            driver: 'ollama',
            host: 'http://localhost:11434',
            model: 'qwen2.5-coder:latest',
            defaultModel: 'qwen2.5-coder:latest',
        },
        docker: {
            driver: 'docker',
            host: 'unix:///var/run/docker.sock',
        },
        anthropic: {
            driver: 'anthropic',
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: 'claude-3-5-sonnet-20241022',
            defaultModel: 'claude-3-5-sonnet-20241022',
            maxTokens: 4096,
        },
        openai: {
            driver: 'openai',
            apiKey: process.env.OPENAI_API_KEY || '',
            model: 'gpt-4o',
            defaultModel: 'gpt-4o',
            maxTokens: 4096,
        },
    },
    ai: {
        defaultConnector: 'anthropic',
        priority: ['anthropic', 'openai', 'ollama'],
        contextTemplate: 'canvas-assistant',
    }
}

const CLIENT_CONTEXT_ARRAY = generateClientContextArray();

const EXIT_CODES = {
    ERROR: 87, // https://xkcd.com/221/
    FAILED: 1,
    SUCCESS: 0,
}

const config = new Conf({
    projectName: 'canvas',
    configName: 'canvas-cli',
    cwd: CANVAS_USER_CONFIG,
    defaults: DEFAULT_CONFIG,
    configFileMode: 0o600, // Secure file permissions
});

export default config;
export {
    MACHINE_ID,
    APP_ID,
    CANVAS_USER_HOME,
    CANVAS_USER_CONFIG,
    CLIENT_CONTEXT_ARRAY,
    EXIT_CODES,
};

/**
 * Utils
 */

function generateClientContextArray() {
    const networkCidr = getNetworkCidr();

    return [
        `client/app/${APP_ID}`,
        `client/device/${MACHINE_ID}`,
        `client/os/platform/${os.platform()}`,
        `client/os/arch/${os.machine()}`,
        `client/os/hostname/${os.hostname()}`,
        `client/os/user/${os.userInfo().username}`,
        `client/network/cidr/${networkCidr}`,
        `client/ephemeral/timezone/${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
        `client/ephemeral/datetime/${new Date().toISOString()}`
    ];
}

function getNetworkCidr() {
    return Object.values(os.networkInterfaces())
        .flat()
        .find(({ family, internal }) => family === 'IPv4' && !internal)?.cidr || 'unknown';
}
