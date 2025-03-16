'use strict';

import Conf from 'conf';
import os from 'os';
import path from 'path';
import pkg from 'node-machine-id';
const { machineIdSync } = pkg;
import debugInstance from 'debug';
const debug = debugInstance('canvas:cli:config');
import ip from 'ip';

/**
 * Constants
 */

const MACHINE_ID = machineIdSync(true);
const APP_ID = 'canvas-cli';

const CANVAS_USER_HOME = os.platform() === 'win32' ?
    path.join(os.homedir(), 'Canvas') :
    path.join(os.homedir(), '.canvas');

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
            id: `canvas-cli.${MACHINE_ID}`,
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
    }
}

const CLIENT_CONTEXT_ARRAY = generateClientContextArray();

const EXIT_CODES = {
    ERROR: 87, // https://xkcd.com/221/
    FAILED: 1,
    SUCCESS: 0,
}

const config = new Conf({
    configName: 'canvas-cli',
    cwd: CANVAS_USER_CONFIG
});

if (config.get('server')) {
    config.set(DEFAULT_CONFIG);
}

if (config.get('session')) {
    config.set('session', DEFAULT_CONFIG.session);
}

if (config.get('connectors')) {
    config.set('connectors', DEFAULT_CONFIG.connectors);
}

export default config;
export {
    MACHINE_ID,
    APP_ID,
    CANVAS_USER_HOME,
    CANVAS_USER_CONFIG,
    CLIENT_CONTEXT_ARRAY,
    EXIT_CODES,
};

console.log(config.get('connectors'));

/**
 * Utils
 */

function generateClientContextArray() {
    // TODO: Remove the ip dependency
    const publicIp = ip.address('public');
    const networkCidr =
        Object.values(os.networkInterfaces())
            .flat()
            .find(({ family, address, cidr }) => family === 'IPv4' && (address === publicIp ))?.cidr || 'unknown';

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
