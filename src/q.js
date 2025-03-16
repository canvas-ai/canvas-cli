'use strict';

// Utils
import path from 'path';
import debugInstance from 'debug';
const debug = debugInstance('canvas:cli');
import chalk from 'chalk';

/**
 * Configuration
 */

import config from './utils/config.js';
import {
    CLIENT_CONTEXT_ARRAY,
    EXIT_CODES,
} from './utils/config.js';

/**
 * Utils
 */

import {
    parseInput,
    readPromptTemplate,
    fillPromptTemplate,
    exit,
} from './utils/common.js';

/**
 * Transports
 */

import { Ollama } from 'ollama';
const ollama = new Ollama(config.get('connectors.ollama'));

/**
 * Main
*/

import minimist from 'minimist';
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
    const parsed = parsedArgs // parseInput(input, parsedArgs);
    process.exitCode = await exec(parsed);
    exit(process.exitCode);
}

if (!process.stdin.isTTY) {
    let chunks = [];
    process.stdin.on('data', data => chunks.push(data));
    process.stdin.on('end', () => run(chunks.join('')));
} else { run(null); }


async function exec(execOptions) {
    debug('Exec options:', execOptions);
    const query = execOptions['_'];
    const context = [];
    const options = {};
    const data = null;
    try {

        debug('Query:', query.join(' '));
        debug('Options:', options);
        debug('Data:', data);

        const clientContext = CLIENT_CONTEXT_ARRAY;
        const canvasContext = {}; //await getCanvasContext();
        const relevantDocuments = []; //await getRelevantDocuments(query);
        const promptTemplate = await readPromptTemplate(path.join('src/roles/ollama', 'promptTemplates/RAG_LLAMA3.1.md'));

        const context = { ...clientContext, ...canvasContext };
        const filledPrompt = fillPromptTemplate(promptTemplate, context, relevantDocuments, query.join(' '));
        debug('Filled prompt:', filledPrompt);

        const response = await ollama.generate({
            model: config.get('connectors.ollama.model'),
            prompt: filledPrompt,
            stream: false,
            options: {
                seed: 8613,
                temperature: 0
            }
        });

        console.log(response.response);
        return EXIT_CODES.SUCCESS;
    } catch (error) {
        console.error('Error processing query:', error);
        return EXIT_CODES.ERROR;
    }
}
