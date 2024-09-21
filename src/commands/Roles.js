

class Roles {

    #connection = null;

    constructor(connection) {
        this.#connection = connection;
        this.name = 'roles';
        this.description = 'Roles command';
        this.help = 'Roles command help';
    }

    execute(args, options, data) {
        console.log('Roles command executed');
    }
}

module.exports = Roles;
