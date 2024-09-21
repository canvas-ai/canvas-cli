const debug = require('debug')('canvas:cli:utils');
const fs = require('fs');
const exit = (code) => { process.exit(code); };

async function parseInput(input, parsedArgs) {
    // Parse the args array "_" to get the CLI "action"
    const command = parsedArgs['_'][0] || null; //'list' or help
    const args = parsedArgs['_'].shift() && parsedArgs['_'] || null;
    const options = delete(parsedArgs['_']) && parsedArgs || null;
    const data = input || null;

    debug('command:', command);
    debug('args:', args);
    debug('options:', options);
    debug('data:', data);

    // Parse the context array
    // Providing context as a parameter won't change the global context
    let contextArray = [];
    if (parsedArgs['context']) {
        contextArray = (typeof parsedArgs['context'] === 'string') ?
            [parsedArgs['context']] :
            parsedArgs['context'];
    }

    // Parse the "features" array
    // Features are populated by the runtime itself when adding objects
    // Useful to specify an undetected feature or create a custom one.
    let featureArray = [];
    if (parsedArgs['feature']) {
        featureArray = (typeof parsedArgs['feature'] === 'string') ?
            [parsedArgs['feature']] :
            parsedArgs['feature'];
    }

    // Parse the "filters" array
    // Example: $0 notes -s datetime/today -s name/regexp/^foo/
    let filterArray = [];
    if (parsedArgs['filter']) {
        filterArray = (typeof parsedArgs['filter'] === 'string') ?
            [parsedArgs['filter']] :
            parsedArgs['filter'];
    }

    debug('contextArray:', contextArray);
    debug('featureArray:', featureArray);
    debug('filterArray:', filterArray);

    return { command, args, options, data, contextArray, featureArray, filterArray };
}

function readPromptTemplate(templatePath) {
    return fs.readFileSync(templatePath, { encoding: 'utf8' });
}

function fillPromptTemplate(template, context, documents = [], query) {
    let filledTemplate = template;
    for (const [key, value] of Object.entries(context)) {
        filledTemplate = filledTemplate.replace(`{${key}}`, value);
    }

    const formattedDocuments = documents.map(doc =>
        `Document ${doc.id}:\n${doc.content}\n`
    ).join('\n');

    filledTemplate = filledTemplate.replace('{RETRIEVED_DOCUMENTS}', formattedDocuments);
    filledTemplate = filledTemplate.replace('{USER_QUERY}', query);

    return filledTemplate;
}

module.exports = {
    parseInput,
    print: console.log, // For testing purposes
    exit,
    readPromptTemplate,
    fillPromptTemplate,
    // Parts of the CLI logic taken from https://github.com/shelljs
    // Copied from shx.js / shell.js
    EXIT_CODES: {
        ERROR: 87, // https://xkcd.com/221/
        FAILED: 1,
        SUCCESS: 0,
    },
};

