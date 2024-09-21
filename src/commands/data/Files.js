

class Files {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'files';
        this.description = 'Files command';
        this.help = 'Files command help';
    }

    execute(args, options, data) {
        console.log('Files command executed');
    }
}

module.exports = Files;
