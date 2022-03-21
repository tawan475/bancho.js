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
        this._name = name;
        this._users = [];
        this._isMultiplayer = false;
        if (this._name.startsWith("#mp_")){
            this._isMultiplayer = true;
            this._matchId = parseInt(this._name.substring(4))
        }

        // Add event listeners
        this._nameBuffer = '';
        this.client.on("_message", (message) => {
            if (!message.raw.includes(this._name)) return;
            // Multiplayer Id
            if (message.type === '332') {
                if (!this._isMultiplayer) return;
                let multiplayerId = parseInt(message.args[message.args.length - 1].substring(1))
                return this._multiplayerId = multiplayerId;
            }

            // Channel creation time
            if (message.type === '333') {
                let creationTime = parseInt(message.args[message.args.length - 1])
                return this._creationTime = creationTime;
            }

            // Recieve user list
            if (message.type === '353') {
                let userList = message.args.slice(3);
                userList[0] = userList[0].substring(1);
                this._nameBuffer = userList.join(' ');
            }

            // End of user list
            if (message.type === '366') {
                let users = this._nameBuffer.split(' ');
                this._users = users;
                return this.emit('users', users);
            }
        })
    }

    // Methods
    // Send message to this channel
    send(message) {
        return this.client.send(this._name, message);
    }

    // Leave channel
    leave() {
        return this.client.leave(this._name);
    }

    // Define getters
    // get channel name
    get name() {
        return this._name;
    }

    get isMultiplayer() {
        return this._isMultiplayer;
    }

    // get match Id
    get matchId() {
        return this._matchId;
    }

    // Get multilpayer Id
    get multiplayerId() {
        return this._multiplayerId;
    }

    // Get user list
    get users() {
        return this._users;
    }
}