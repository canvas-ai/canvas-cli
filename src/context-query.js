'use strict';

// Utils
const path = require('path');
const debug = require('debug')('canvas:cli')
const chalk = require('chalk')
const {
    print,
    readPromptTemplate,
    fillPromptTemplate,
    exit,
    EXIT_CODES,
} = require('./lib/utils');

const {
    device,
    user
} = require('./lib/env');

/**
 * Configuration
 */

const Config = require('./lib/Config');
const config = new Config(/** configPath: 'path/to/config' */).loadConfig();

const clientContext = [
    'client/app/canvas-cli',
    `client/id/${device.id}`,
    `client/os/${device.os}`,
    `client/os/arch/${device.arch}`,
    `client/os/user/${user.username}`,
    `client/network/subnet/${device.subnet}`,
]

/**
 * Transports
 */

const RestClient = require('./lib/RestClient');
const canvas = new RestClient({
    sessionPath: path.join(config.user.home, 'var', 'canvas-cli.session.json'),
    connection: config.transports.rest
});

const { Ollama } = require('ollama'); // TEST
const ollama = new Ollama(config.transports.ollama);

/**
 * Main
*/

const minimist = require('minimist');
const parsedArgs = minimist(process.argv.slice(2), {
    // Treat the following arguments as strings
    string: ['context', '_'],
    // Set default command line aliases
    alias: {
        c: 'context',
        f: 'feature',
        s: 'filter',
        //...aliases, for now no support for custom ones :)
    }
});

const run = async (input) => {
    const parsed = parseInput(input, parsedArgs);
    process.exitCode = await exec(parsed);
    exit(process.exitCode);
}

if (!process.stdin.isTTY) {
    let chunks = [];
    process.stdin.on('data', data => chunks.push(data));
    process.stdin.on('end', () => run(chunks.join('')));
} else { run(null); }


function parseInput(input, parsedArgs) {
    const query = parsedArgs['_'].join(' ');
    delete(parsedArgs['_'])
    const options = parsedArgs;
    const data = input || null;

    if (!query) {
        print(chalk.red('Error: Missing query'));
        exit(EXIT_CODES.ERROR);
    }

    debug('query:', query);
    debug('options:', options);
    debug('data:', data);

    return { query, options, data };
}

async function exec(execOptions) {
    const { query, options, data } = execOptions;
    try {
        const clientContext = {
            OS: device.os,
            IP: device.ip,
            USERNAME: user.username,
            USER_CWD: user.cwd,
            DATETIME: user.localISOTime,
            CONTEXT_URL: '/work/mb/dev/jira-1234',
            STDIN: data,
        }
        const canvasContext = {}; //await getCanvasContext();
        const relevantDocuments = []; //await getRelevantDocuments(query);
        const promptTemplate = await readPromptTemplate(path.join(__dirname, 'promptTemplates/RAG_LLAMA3.1.md'));

        const context = { ...clientContext, ...canvasContext };
        const filledPrompt = fillPromptTemplate(promptTemplate, context, relevantDocuments, query);
        debug('Filled prompt:', filledPrompt);

        const response = await ollama.generate({
            model: config.transports.ollama?.model || config.transports.ollama.defaultModel,
            prompt: filledPrompt,
            stream: false,
            options: {
                seed: 8613,
                temperature: 0
            }
        });

        print(response.response);
        return EXIT_CODES.SUCCESS;
    } catch (error) {
        console.error('Error processing query:', error);
        return EXIT_CODES.ERROR;
    }
}