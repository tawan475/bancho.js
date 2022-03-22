const EventEmitter = require('eventemitter3');
const banchoRegex = require('../libs/banchoRegex.js');

module.exports = class banchoLobby extends EventEmitter {
    // Constructor
    constructor(bancoClient, name, title) {
        super();

        // Add banchoClient to this class
        // so that we could use it's methods internally
        this.client = bancoClient;

        // make sure that channel start with '#'
        if (!name.startsWith('#')) name = '#' + name;
        this._name = name;
        this._users = []; // users connected to IRC
        this._matchSize = 16
        this._players = new Array(16).fill(null); // players in this match
        this._isMultiplayer = false;
        if (this._name.startsWith("#mp_")) {
            this._isMultiplayer = true;
            this._matchId = parseInt(this._name.substring(4));
            this._teamMode = null;
            this._winCondition = null;
            this._mods = {
                mods: [],
                freemod: null
            };
            this._playersAmount = null;
            this._beatmap = {
                mapName: null,
                beatmapId: null,
            }
            this._mode = null;
            this._referees = [];
            this._updateSettings();
        }
        if (title) this._title = title;

        // Add event listeners
        // Handle raw messages
        this._nameBuffer = '';
        this.client.on("message", (message) => {
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
                let users = this._nameBuffer.trim().split(' ');
                this._users = users;
                this._nameBuffer = '';
                return this.emit('users', users);
            }
        });

        // Count how many players have we processed
        this._playersProcessed = 0;
        // Handle multiplayer chat
        this.client.on("multiplayer", (message) => {
            if (message.destination !== this._name) return;
            // check for !mp settings result
            if (message.author === 'BanchoBot') {
                let regex = banchoRegex.match(message.content);
                if (!regex) return; // Not what we are looking for
                let player;
                switch (regex.name) {
                    case "roomTitle":
                        this.emit('roomTitle', regex.result);
                        this._title = regex.result.title;
                        if (this._matchId !== regex.result.id) this._matchId = regex.result.id
                        break;
                    case "refereeChangedTitle":
                        this.emit('refereeChangedTitle', regex.result);
                        this._title = regex.result.title;
                        break;
                    case "teamModeWinConditions":
                        this.emit('teamModeWinConditions', regex.result);
                        this._teamMode = regex.result.teamMode;
                        this._winCondition = regex.result.winCondition;
                        break;
                    case "activeMods":
                        this.emit('activeMods', regex.result);
                        this._mods = {
                            mods: regex.result.mods,
                            freemod: regex.result.freemod
                        }
                        break;
                    case "playersAmount":
                        this.emit('playersAmount', regex.result.playersAmount);
                        this._playersAmount = regex.result.playersAmount;
                        break;
                    case "playerChangedBeatmap":
                        this.emit('playerChangedBeatmap', regex.result);
                        this._beatmap = {
                            mapName: regex.result.mapName,
                            beatmapId: regex.result.beatmapId,
                        }
                        break;
                    case "playerChangedTeam":
                        this.emit('playerChangedTeam', regex.result);
                        player = this.getPlayerByName(regex.result.username);
                        if (!player) return;
                        this._players[player.slot].team = regex.result.team;
                        break;
                    case "refereeChangedBeatmap":
                        this.emit('refereeChangedBeatmap', regex.result);
                        this._beatmap = {
                            mapName: regex.result.mapName,
                            beatmapId: regex.result.beatmapId,
                        }
                        break;
                    case "refereeChangedMode":
                        this.emit('refereeChangedMode', regex.result.mode);
                        this._mode = regex.result.mode
                        break;
                    case "beatmapFromSettings":
                        this.emit('beatmapFromSettings', regex.result);
                        this._beatmap = {
                            mapName: regex.result.mapName,
                            beatmapId: regex.result.beatmapId,
                        }
                        break;
                    case "invalidBeatmapId":
                        this.emit('invalidBeatmapId');
                        break;
                    case "playerChangingBeatmap":
                        this.emit('playerChangingBeatmap');
                        break;
                    case "refereeChangedMods":
                        this.emit('refereeChangedMods', regex.result);
                        this._mods = {
                            mods: regex.result.mods,
                            freemod: regex.result.freemod
                        }
                        break;
                    case "playerJoined":
                        this.emit('playerJoined', regex.result);
                        playerObj = {
                            slot: regex.result.slot,
                            username: regex.result.username,
                            team: regex.result.team,
                        }
                        if (this._players[regex.result.slot]) {
                            Object.assign(this._players[regex.result.slot], playerObj);
                        } else {
                            this._players[regex.result.slot] = playerObj;
                        }
                        break;
                    case "playerMoved":
                        this.emit('playerMoved', regex.result);
                        let newSlot = regex.result.slot;
                        let oldSlot = this.getPlayerByName(regex.result.username);
                        if (oldSlot) {
                            this._players[newSlot] = oldSlot.player;
                            this._players[newSlot].slot = newSlot;
                            this._players[oldSlot.slot] = null;
                        } else {
                            this._players[newSlot] = {
                                slot: newSlot,
                                userId: null,
                                username: regex.result.username,
                                ishost: null,
                                team: null,
                                mods: null
                            }
                        }
                        break;
                    case "playerLeft":
                        this.emit('playerLeft', regex.result.username);
                        player = this.getPlayerByName(regex.result.username);
                        if (player) this._players[player.slot] = null;
                        break;
                    case "playerBecameTheHost":
                        this.emit('playerBecameTheHost', regex.result.username);
                        // remove old host
                        oldHost = this.host;
                        oldHost.isHost = false;

                        this._host = regex.result.username;
                        player = this.getPlayerByName(regex.result.username);
                        if (player) this._players[player.slot].isHost = true;
                        break;
                    case "allPlayersReady":
                        this.emit('allPlayersReady');
                        break;
                    case "matchStarted":
                        this.emit('matchStarted');
                        break;
                    case "matchAborted":
                        this.emit('matchAborted');
                        break;
                    case "playerFinished":
                        this.emit('playerFinished', regex.result);
                        break;
                    case "matchFinished":
                        this.emit('matchFinished');
                        break;
                    case "passwordRemoved":
                        this.emit('passwordRemoved');
                        break;
                    case "passwordChanged":
                        this.emit('passwordChanged');
                        break;
                    case "refereeAdded":
                        this.emit('refereeAdded', regex.result.username);
                        this._referees.push(regex.result.username);
                        break;
                    case "refereeRemoved":
                        this.emit('refereeRemoved', regex.result.username);
                        this._referees.splice(this._referees.indexOf(regex.result.username), 1);
                        break;
                    case "userNotFound":
                        this.emit('userNotFound');
                        break;
                    case "userNotFoundUsername":
                        this.emit('userNotFoundUsername', match.result.username);
                        break;
                    case "slotsLocked":
                        this.emit('slotsLocked');
                        break;
                    case "slotsUnlocked":
                        this.emit('slotsUnlocked');
                        break;
                    case "matchSize":
                        this.emit('matchSize', regex.result.matchSize);
                        this._matchSize = regex.result.matchSize;
                        break;
                    case "matchSettings":
                        this.emit('matchSettings', regex.result);
                        this.matchSize = regex.result.size;
                        this._teamMode = regex.result.teamMode;
                        this._winCondition = regex.result.winCondition;
                        break;
                    case "hostCleared":
                        this.emit('hostCleared');
                        break;
                    case "settingsPlayerData":
                        this.emit('settingsPlayerData', regex.result);
                        let attribute = regex.result.attribute.split("/ ");
                        let isHost = false;
                        let team = null;
                        let mods = [];
                        if (attribute[0] === "host") {
                            isHost = true;
                            attribute.shift();
                        }
                        if (attribute[0].startsWith("Team ")) {
                            team = attribute[0].split(" ")[1].toLowerCase();
                            attribute.shift();
                        }
                        if (attribute[0]) {
                            mods = attribute[0].split(", ");
                            attribute.shift();
                        }

                        let playerObj = {
                            slot: regex.result.slot,
                            userId: regex.result.userId,
                            username: regex.result.username,
                            ishost: isHost,
                            team: team,
                            mods: mods
                        }

                        if (this._players[regex.result.slot]) {
                            Object.assign(this._players[regex.result.slot], playerObj);
                        } else {
                            this._players[regex.result.slot] = playerObj;
                        }
                        break;
                    default:
                        break;
                }
            }
        });
    }

    // Methods
    // Update settings
    _updateSettings() {
        this.send("!mp settings " + this.client.random);
    }

    // Send message to this channel
    send(message) {
        return this.client.send(this._name, message);
    }

    // Leave channel
    leave() {
        return this.client.leave(this._name);
    }

    // Get player by name
    getPlayerByName(username) {
        if (!this._isMultiplayer) return null;
        let slot = this._players.findIndex(player => player?.username === username);
        if (slot === -1) return false;
        return {
            slot: slot,
            player: this._players[slot]
        }
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

    // Get player list
    get players() {
        if (!this._players.length) return this._players;
        return new Promise((resolve, reject) => {
            this.once('_playersUpdated', (players) => resolve(players));
        });
    }

    // Get host
    get host() {
        if (!this._isMultiplayer) return null;
        let slot = this._players.findIndex(player => player?.isHost === true);
        if (slot === -1) return false;
        return {
            slot: slot,
            player: this._players[slot]
        }
    }
}