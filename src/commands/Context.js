

class Context {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'context';
        this.description = 'Context command';
        this.help = 'Context command help';
    }

    execute(args, options, data) {
        console.log('Context command executed');
    }
}

module.exports = Context;
