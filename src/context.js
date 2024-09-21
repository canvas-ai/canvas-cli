'use strict';

// Utils
const path = require('path');
const debug = require('debug')('canvas:cli')
const chalk = require('chalk')
const {
    parseInput,
    print,
    readPromptTemplate,
    fillPromptTemplate,
    exit,
    EXIT_CODES,
} = require('./lib/utils');

// App Includes
const Config = require('./lib/Config');
const RestClient = require('./lib/RestClient');
const { device, user } = require('./lib/Context');

/**
 * Configuration
 */

const config = new Config(/** configPath: 'path/to/config' */).loadConfig();

/**
 * Transports
 */

const CANVAS_SERVER = new RestClient({
    sessionPath: path.join(config.user.home, 'var', 'canvas-cli.session.json'),
    connection: config.transports.rest
});

// TEST
const { Ollama } = require('ollama');
const ollama = new Ollama(config.ollama);

/**
 * Main
*/

const minimist = require('minimist')
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
    const parsed = await parseInput(input, parsedArgs);
    process.exitCode = await exec(parsed);
    exit(process.exitCode);
}

if (!process.stdin.isTTY) {
    let chunks = [];
    process.stdin.on('data', data => chunks.push(data));
    process.stdin.on('end', () => run(chunks.join('')));
} else { run(null); }


/**
 * Process input
 */

async function exec(execOptions) {
    const { command, args, options, data, contextArray, featureArray, filterArray } = execOptions;
    switch (command) {
        // Test
        case 'q' || 'query':
            try {
                const query = args.join(' ');
                const clientContext = {
                    OS: device.os,
                    IP: device.ip,
                    USERNAME: user.username,
                    USER_CWD: user.cwd,
                    DATETIME: user.localISOTime,
                    CONTEXT_URL: '/work/mb/dev/jira-1234'
                }
                const canvasContext = {}; //await getCanvasContext();
                const relevantDocuments = []; //await getRelevantDocuments(query);
                const promptTemplate = await readPromptTemplate(path.join(__dirname, 'promptTemplates/RAG_LLAMA3.1.md'));

                const context = { ...clientContext, ...canvasContext };
                const filledPrompt = fillPromptTemplate(promptTemplate, context, relevantDocuments, query);
                debug('Filled prompt:', filledPrompt);

                const response = await ollama.generate({
                    model: config.ollama?.model || config.ollama.defaultModel,
                    prompt: filledPrompt,
                    stream: false
                });

                print(response.response);
                return EXIT_CODES.SUCCESS;
            } catch (error) {
                console.error('Error processing query:', error);
                return EXIT_CODES.ERROR;
            }

        /**
         * Connection
         */

        case 'connect':
            print(CANVAS_SERVER.connect());
            return EXIT_CODES.SUCCESS;

        case 'disconnect':
            print(CANVAS_SERVER.disconnect());
            return EXIT_CODES.SUCCESS;

        case 'status':
            print(CANVAS_SERVER.status());
            return EXIT_CODES.SUCCESS;

        /**
         * Context
         */

        case 'set':

            return EXIT_CODES.SUCCESS;

        case 'id':

            return EXIT_CODES.SUCCESS;

        case 'url':

            return EXIT_CODES.SUCCESS;

        case 'paths':

            return EXIT_CODES.SUCCESS;

        case 'bitmaps':

            return EXIT_CODES.SUCCESS;

        case 'layers':

            return EXIT_CODES.SUCCESS;

        case 'filters':

            return EXIT_CODES.SUCCESS;

        // Tree command
        case 'tree':
            if (!args.length) {
                debug('Getting context tree');
                return EXIT_CODES.SUCCESS;
            }

            const Tree = require('./commands/Tree');
            const tree = new Tree(connection);
            return tree.execute(args, options, data);

        /**
         * Data
         */

        case 'files':
            const Files = require('./commands/Files');
            const files = new Files(connection);
            return files.execute(args, options, data);

        case 'notes':
            const Notes = require('./commands/Notes');
            const notes = new Notes(connection);
            return notes.execute(args, options, data);

        case 'tabs':
            const Tabs = require('./commands/Tabs');
            const tabs = new Tabs(connection);
            return tabs.execute(args, options, data);

        /**
         * Sessions
         */

        case 'sessions':
            const Sessions = require('./commands/Sessions');
            const sessions = new Sessions(connection);
            return sessions.execute(args, options, data);

        default:
            console.log(chalk.red(`Module "${command}" not found`));
            return EXIT_CODES.ERROR;
    }
}
