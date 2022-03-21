// This is an example from an early prototype of TourneyBot
// https://github.com/tawan475/TourneyBot/blob/9aa02ce5fb503da167d9740594e6e3fce066264f/tourneyBot.js

require('dotenv').config();
const { banchoClient } = require('@tawan475/bancho.js');
const bancho = new banchoClient();

bancho.on('error', (err) => {
    // Don't forget to handle error correctly!
    console.error(err);
});

bancho.once('ready', () => {
    console.log('Connected and logged in to bancho.');
    // Ready to send messages
    bancho.join('#mp_98954523');
});

bancho.on('disconnect', () => {
    // Disconnected from bancho succesfully, you should kill the process or re-login 
    console.log('Disconnected from bancho.');
});

bancho.on('channelJoin', (message) => {
    console.log(`Joined lobby ${message.channel.name}`);
    if (message.channel.name === '#mp_98954523') {
        message.channel.send("Hello World!");
    }
});

bancho.on('channelLeave', (channel, err) => {
    if (err) {
        // This is considered soft error and
        // will not cause error event that make the bot to disconnect
        if (err.message === 'No such channel.') return console.log(`Left lobby ${channel}`);
    }
    console.log(`Left lobby ${channel}`);
});

bancho.on('message', (message) => {
    console.log("message " + message.raw);
});

bancho.on('pm', (message) => {
    console.log("pm " + message.raw);
});

bancho.on('multiplayer', (message) => {
    console.log("multiplayer " + message.raw);
});

bancho.on('sendMessage', (message) => {
    if (message.startsWith('PONG ')) return;
    console.log("> " + message);
})

bancho.login({
    username: process.env.BANCHO_USERNAME,
    password: process.env.BANCHO_PASSWORD,
});