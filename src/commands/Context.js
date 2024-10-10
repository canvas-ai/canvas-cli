

class Context {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'context';
        this.description = 'Context command';
        this.help = 'Context command help';

    }

    async getUrl() {
        this.#connection.connect();
        let res = await this.#connection.makeRequest('GET', '/context/url');
        return res;
    }

    async getID() {
        let res = await this.#connection.makeRequest('GET', '/context/id');
        return res;
    }

    execute(args, options, data) {
        console.log('Context command executed');
    }
}

module.exports = Context;
