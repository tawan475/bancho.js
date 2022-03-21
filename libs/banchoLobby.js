const EventEmitter = require('eventemitter3');

module.exports = class banchoLobby extends EventEmitter {
    // Constructor
    constructor(bancoClient, name) {
        super();

        // Add banchoClient to this class
        // so that we could use it's methods internally
        this.client = bancoClient;

        // make sure that channel start with '#'
        if (!name.startsWith('#')) name = '#' + name;
        this.name = name;
    }

    // Methods
    // Send message to this channel
    send(message) {
        return this.client.send(this.name, message);
    }

    // Leave channel
    leave() {
        return this.client.leave(this.name);
    }

    // Define getters
    // get channel name
    get name() {
        return this._name;
    }
}