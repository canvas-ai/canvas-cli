

class Tabs {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'tabs';
        this.description = 'Tabs command';
        this.help = 'Tabs command help';
    }

    execute(args, options, data) {
        console.log('Tabs command executed');
    }
}

module.exports = Tabs;
