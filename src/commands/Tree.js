

class Tree {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'tree';
        this.description = 'Tree command';
        this.help = 'Tree command help';
    }

    execute(args, options, data) {
        console.log('Tree command executed');
    }
}

module.exports = Tree;
