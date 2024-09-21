

class Sessions {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'sessions';
        this.description = 'Sessions command';
        this.help = 'Sessions command help';
    }

    execute(args, options, data) {
        console.log('Sessions command executed');
    }
}

module.exports = Sessions;
