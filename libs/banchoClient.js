const EventEmitter = require('eventemitter3');
const { Socket } = require('net');

const banchoLobby = require('../libs/banchoLobby.js');

module.exports = class banchoClient extends EventEmitter {
    // Constructor
    /**
     * Creates an instance of banchoClient.
     * 
     * @param {Object} config - Configuration object
     * @param {String} config.host - The host of the bancho server
     * @param {Number} config.port - The port of the bancho server
     * @param {Number} config.messageDelay - The delay between each message sent
     * @param {Number} config.messageSize - The maximum size of a message
     */
    constructor(config = {
        host: 'irc.ppy.sh', port: 6667,
        messageDelay: 1000,
        messageSize: 449
    }) {
        super();

        this._config = config;
        this._config.messageDelay = config.messageDelay || 1000;
        this._config.messageSize = config.messageSize || 449;
        this._config.host = config.host || 'irc.ppy.sh';
        this._config.port = config.port || 6667;

        this._server = {
            host: this._config.host,
            port: this._config.port
        };

        this._messageQueue = [];
        this._messageProcessorInterval = null;
        this._messageProcessor = () => {
            let messageObj = this._messageQueue.shift();
            if (!messageObj || !messageObj?.message) return;
            let message = messageObj.message + "\r\n";

            this._send(message);
            // acknowledge the message
            messageObj.resolve();
        }

        // Create joined channel map
        this._channels = new Map();

        // Create socket
        this._socket = new Socket();
        this._socket.setMaxListeners(0);

        // Actually sending message
        this._send = (message) => {
            if (!message) return;

            this._socket.write(message);
            this.emit("sendMessage", message);
        }

        // Configure socket
        this._socket.setEncoding('utf8');
        this._socket.setKeepAlive(true);
        this._socket.setNoDelay(true);
        this._socket.setTimeout(10000, () => {
            this._socket.emit('error', new Error('Timed out.'));
        });

        // Configure events
        // Handle error
        
        this._socket.on('error', (err) => {
            this._socket.destroy();
            this.emit('error', err);
        });

        // Socket is connected
        this._socket.on('connect', () => {
            this.emit('connect');
        });

        // Recieve incoming data
        this._buffer = '';
        this._socket.on('data', (data) => {
            this.emit('data', data);
            this._buffer += data.toString().replace(/\r/g, "");
            let lines = this._buffer.split('\n');

            // if the last line is not complete, then we need carry over and wait for the next data event
            if (!lines[lines.length - 1].endsWith('\n')) {
                this._buffer = lines.pop();
            }

            // emit each line separately
            for (let line of lines) {
                let segment = line.split(' ');
                let message = {
                    source: segment[0],
                    type: segment[1],
                    args: segment.slice(2),
                    raw: line
                };

                // Examples
                // source               type    args...
                // :cho.ppy.sh          001     tawan475 :Welcome to the osu!Bancho.
                // :tawan475!cho@ppy.sh PRIVMSG #mp_98953873 :a
                // :cho.ppy.sh          333     tawan475 #mp_98953873 BanchoBot!BanchoBot@cho.ppy.sh 1647835975

                // Unfiltered message
                // Internally comunicate with every banchoLobby class
                // If you was thinking of using this, use "message" for filtered message
                this.emit("_message", message)

                // Refer to https://datatracker.ietf.org/doc/html/rfc2812#section-5
                // 332 multiplayer id
                // 333 unix server time
                // 353 prob userlist
                // 366 end of list
                // 372 motd
                // 376 end of motd
                // 403 no such channel
                // 464 bad auth

                if (message.type === 'QUIT') continue;
                if (message.source === 'PING') {
                    this._sendMessage('PONG ' + segment.slice(1).join(' '));
                    continue;
                }

                if (message.type === '464') {
                    this._socket.destroy();
                    this.emit('error', new Error("Bad auth."));
                }

                if (message.type === '001') {
                    // Connected and logged in to the server
                    this.emit('ready');
                    // Activate message processor
                    this._messageProcessorInterval = setInterval(this._messageProcessor, this._config.messageDelay);
                }

                if (message.type === 'JOIN') {
                    message.author = message.source.substring(1, message.source.indexOf('!'));
                    message.destination = message.args[0].substring(1);
                    this._channels.set(message.destination, new banchoLobby(this, message.destination));
                    message.channel = this._channels.get(message.destination);

                    this.emit('channelJoin', message);
                    continue;
                }

                if (message.type === 'PART') {
                    message.author = message.source.substring(1, message.source.indexOf('!'));
                    message.destination = message.args[0].substring(1);
                    if (this._channels.has(message.destination)) this._channels.delete(message.destination);

                    this.emit('channelLeave', message.destination);
                    continue;
                }

                if (message.type === 'PRIVMSG') {
                    // Handle private messages
                    message.author = message.source.substring(1, message.source.indexOf('!'));
                    message.destination = message.args.shift();
                    // Remove the first ":"
                    message.args[0] = message.args[0].substring(1);
                    message.content = message.args.join(' ');

                    // Get channel object
                    if (!this._channels.has(message.destination)) {
                        this._channels.set(message.destination, new banchoLobby(this, message.destination));
                    }
                    message.channel = this._channels.get(message.destination);

                    // If the message is coming to our username
                    // It is a private message
                    if (message.channel.name === this._username) {
                        this.emit('pm', message);
                        continue;
                    }

                    // We are only allowed to mesage to game lobby, spectator and private Message
                    // Ignore all other channels
                    if (message.channel.name.startsWith("#mp_")) {
                        this.emit('multiplayer', message);
                        continue
                    }

                    if (message.channel.name === "#spectator") {
                        this.emit('spectator', message);
                        continue
                    }
                    continue;
                }

                // Example
                //   author   type   args ----
                // :cho.ppy.sh 403 tawan475 #mp_98943277 :No such channel #mp_98943277
                if (message.type === '403') {
                    message.args.shift(); // our name, this._username
                    message.destination = message.args.shift();
                    // Remove the first ":"
                    message.args[0] = message.args[0].substring(1);
                    // Delete the channel from the map if it exist
                    if (this._channels.has(message.destination)) this._channels.delete(message.destination);
                    this.emit('channelLeave', message.destination, new Error("No such channel."));
                    continue;
                }

                if (message.type === '401') {
                    message.args.shift(); // our name, this._username
                    message.destination = message.args.shift();
                    // Remove the first ":"
                    message.args[0] = message.args[0].substring(1);
                    this.emit('pm', message.destination, new Error("No such nick."));
                    continue;
                }

                this.emit('message', message);
            }
        });

        // Socket is half close
        this._socket.on('end', () => {
            this.emit('end');

            // Terminate the message processor
            clearInterval(this._messageProcessorInterval);
        });

        // Socket is closed
        this._socket.on('close', (hadError, reason) => {
            this.emit('close', hadError, reason);

            // Terminate the message processor
            clearInterval(this._messageProcessor);
        });
    }

    // Connect & login to the server
    // remove from constructor to void and not save the credentials
    // improve security
    /**
     * Login to to bancho server
     * 
     * @param {Object} config - Configuration object
     * @param {String} config.username - Username
     * @param {String} config.password - Password
     */
    login({ username, password }) {
        this._username = username;
        this._socket.connect(this._server, () => {
            this._socket.write(`PASS ${password}` + "\r\n");
            this._socket.write(`USER ${username} 0 * :${username}` + "\r\n");
            this._socket.write(`NICK ${username}` + "\r\n");
        });
    }

    // Terminate the connection
    /**
     * Disconnect and Terminate the connection
     * 
     */
    disconnect() {
        this._socket.emit('close', false, "Terminate by user");
    }

    // Send a message to a channel
    /**
     * Send a message to a specific channel
     * 
     * @param {String} channel - Channel to send to
     * @param {String} message - Message to send
     * @returns A promise, Resolve when the message is processed.
     */
    send(channel, message) {
        if (!channel) throw new Error("Channel is required.");
        if (!message) throw new Error("Message is required.");
        return this._sendMessage(`PRIVMSG ${channel} :${message}`);
    }

    // Add a message to the queue,
    // DO NOT USE THIS UNLESS YOU KNOW WHAT ARE YOU DOING.
    _sendMessage(message) {
        return new Promise((resolve, reject) => {
            // // not needed due to the message processor only process message when it is connected and ready
            // if (!this._socket || this._socket.readyState !== 'open') {
            //     reject(new Error('Socket is not connected.'));
            // }

            if (message.length > this._config.messageSize) {
                reject(new Error('Message is too big.'));
            }

            this._messageQueue.push({ message, resolve, reject });
        });
    }

    // Send a private message to a user
    /**
     * Send a message to a specific user, same as BanchoClient.send()
     * 
     * @param {String} username - Username to send to
     * @param {String} message - Message to send
     * @returns A promise, Resolve when the message is processed.
     */
    pm(username, message) {
        return this._sendMessage(`PRIVMSG ${username} :${message}`);
    }

    // Create Multiplayer lobby
    // We want to create and let it join internally
    // If we wait for "Created the tournament match" in BanchoBot's pm
    // there might be an occasions where multiplayerId and stuff
    // have not been fetch by "!mp settings" yet
    /**
     * Create a multiplayer lobby
     * 
     * @param {String} title - Name of the lobby
     * @returns A promise, resolve with BanchoChannel when the channel is created.
     */
    createMultiplayer(title) {
        return new Promise((resolve, reject) => {
            this.pm("BanchoBot", `!mp make ${title}`);
            const listener = (channel) => {
                if (channel.title === title) {
                    resolve(channel);
                    this.emit("multiplayerCreated", channel)
                }
                this.removeListener(`_MP_ACKNOWLEDGED-${title}`, listener);
            }
            this.on(`_MP_ACKNOWLEDGED-${title}`, listener);
        });
    }

    // Join the channel
    /**
     * Join a channel
     *
     * @param {String} channel - Channel name to join
     * @returns A promise, Resolve when the message is processed.
     */
    join(channel) {
        if (!channel.startsWith('#')) channel = '#' + channel;
        return this._sendMessage(`JOIN ${channel}`);
    }

    // Leave the channel
    /**
     * Leave a channel
     *
     * @param {String} channel - Channel name to leave
     * @returns A promise, Resolve when the message is processed.
     */
    leave(channel) {
        if (!channel.startsWith('#')) channel = '#' + channel;
        return this._sendMessage(`PART ${channel}`);
    }

    // get channel
    /**
     * Get a joined channel
     * 
     * @param {String} name - Channel name to get the channel object
     * @returns A banchoLobby class, If the channel is not joined, return false.
     */
    getChannel(name) {
        if (this._channels.has(name)) return this._channels.get(name);
        return false;
    }

    // Random characters for anti-spam
    /**
     * Get random string for anti-spam
     *
     * @readonly
     */
    get random() {
        return Math.random().toString(36).substring(2);
    }

    /**
     * Get username of the bot
     *
     * @readonly
     */
    get username() {
        return this._username;
    }
}