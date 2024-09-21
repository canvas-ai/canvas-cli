

class Notes {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'notes';
        this.description = 'Notes command';
        this.help = 'Notes command help';
    }

    execute(args, options, data) {
        console.log('Notes command executed');
    }
}

module.exports = Notes;
