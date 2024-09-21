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
const {
    device,
    user,
    generateContextArray
} = require('./lib/Context');

/**
 * Configuration
 */

const config = new Config(/** configPath: 'path/to/config' */).loadConfig();
const clientContext = generateContextArray();

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
    if (!command) {
        console.log(chalk.red('No command provided'));
        return EXIT_CODES.ERROR;
    }

    const connection = canvas.connect();
    const Context = require('./commands/Context');
    const context = new Context(connection);
    let res = null;

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

        /**
         * Connection
         */

        case 'connect':
            res = await canvas.connect(clientContext);
            if (!res) { return EXIT_CODES.ERROR; }
            print(res);
            return EXIT_CODES.SUCCESS;

        case 'disconnect':
            print(canvas.disconnect());
            return EXIT_CODES.SUCCESS;

        case 'status':
            print(canvas.status());
            return EXIT_CODES.SUCCESS;

        /**
         * Context
         */

        case 'set':
            res = await context.set(args.join('/'));
            if (!res) { return EXIT_CODES.ERROR; }
            print(res);
            return EXIT_CODES.SUCCESS;

        case 'id':
            res = await context.getID();
            if (!res) { return EXIT_CODES.ERROR; }
            print(res);
            return EXIT_CODES.SUCCESS;

        case 'url':
            res = await context.getUrl();
            if (!res) { return EXIT_CODES.ERROR; }
            print(res);
            return EXIT_CODES.SUCCESS;

        case 'paths':
            res = await context.getPaths();
            if (!res) { return EXIT_CODES.ERROR; }
            print(res);
            return EXIT_CODES.SUCCESS;

        case 'bitmaps':
            res = await context.getBitmaps();
            if (!res) { return EXIT_CODES.ERROR; }
            print(res);
            return EXIT_CODES.SUCCESS;

        /**
         * Context Tree
         */

        case 'tree':
            if (!args.length) {
                res = await context.getTree();
                if (!res) { return EXIT_CODES.ERROR; }
                print(res);
                return EXIT_CODES.SUCCESS;
            }

            const Tree = require('./commands/Tree');
            const tree = new Tree(connection);
            return tree.execute(args, options, data);

        /**
         * Data
         */

        case 'files':
            const Files = require('./commands/data/Files');
            const files = new Files(connection);
            return files.execute(args, options, data);

        case 'notes':
            const Notes = require('./commands/data/Notes');
            const notes = new Notes(connection);
            return notes.execute(args, options, data);

        case 'tabs':
            const Tabs = require('./commands/data/Tabs');
            const tabs = new Tabs(connection);
            return tabs.execute(args, options, data);

        /**
         * Sessions
         */

        case 'sessions':
            const Sessions = require('./commands/Sessions');
            const sessions = new Sessions(connection);
            return sessions.execute(args, options, data);

        /**
         * Roles
         */

        case 'roles':
            const Roles = require('./commands/Roles');
            const roles = new Roles(connection);
            return roles.execute(args, options, data);

        default:
            console.log(chalk.red(`Module "${command}" not found`));
            return EXIT_CODES.ERROR;
    }
}
