const EventEmitter = require('eventemitter3');
const { Socket } = require('net');

module.exports = class banchoClient extends EventEmitter {
    // Constructor
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

        // Create socket
        this._socket = new Socket();
        this._socket.setMaxListeners(0);

        // Actually sending message
        this._send = (message) => {
            if (!message || message.startsWith("PONG ")) return;

            this._socket.write(message);
            console.debug(">" + message);
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
                if (message.type === 'QUIT') continue;
                if (message.source === 'PING') {
                    this.send('PONG ' + segment.slice(1).join(' '));
                    continue;
                }

                if (message.type === '001') {
                    // Connected and logged in to the server
                    this.emit('ready');

                    // Activate message processor
                    this._messageProcessorInterval = setInterval(this._messageProcessor, this._config.messageDelay);
                }

                if (message.type === 'JOIN') {
                    message.author = message.source.substring(1, message.source.indexOf('!'));
                    message.channel = message.args[0].substring(1);
                    this.emit('lobbyJoined', message);
                    continue;
                }

                if (message.type === 'PRIVMSG') {
                    // Handle private messages
                    message.author = message.source.substring(1, message.source.indexOf('!'));
                    message.channel = message.args.shift();
                    // remove the first ":"
                    message.args[0] = message.args[0].substring(1);
                    message.content = message.args.join(' ');
                    if (message.args[0] === this._username) {
                        this.emit('pm', message);
                        continue;
                    }

                    // we are only allowed to mesage to game lobby, spectator and private Message
                    // ignore all other channels
                    if (message.channel.startsWith("#mp_")) {
                        this.emit('multiplayer', message);
                        continue
                    }

                    if (message.channel.startsWith("#spectator")) {
                        this.emit('spectator', message);
                        continue
                    }
                    continue;
                }

                this.emit('message', message)
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
    login({ username, password }) {
        this._username = username;
        this._socket.connect(this._server, () => {
            this._socket.write(`PASS ${password}` + "\r\n");
            this._socket.write(`USER ${username} 0 * :${username}` + "\r\n");
            this._socket.write(`NICK ${username}` + "\r\n");
        });
    }

    // Terminate the connection
    close() {
        this._socket.destroy();
        this._socket.emit('close', false, "Terminate by user");
    }

    // Add a message to the queue
    send(message) {
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
    pm(user, message) {
        return this.send(`PRIVMSG ${user} :${message}`);
    }

    // Join a lobby
    join(channel) {
        if (!channel.startsWith('#')) channel+= '#' + channel;
        return this.send(`JOIN ${channel}`);
    }
}