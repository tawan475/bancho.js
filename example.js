require('dotenv').config();
const { banchoClient } = require('@tawan475/bancho.js');
const bancho = new banchoClient();

bancho.once('ready', () => {
    console.log('Connected and logged in to bancho.');
    // Ready to send messages
});

bancho.on('message', (message) => {
    console.log(message.raw);
});

bancho.on('pm', (message) => {
    console.log("pm " + message.raw);
    if (message.content.startsWith("!ping")) {
        message.channel.send("pong!");
    }
});

// Get your IRC username and password here, https://osu.ppy.sh/p/irc
// THIS IS NOT THE SAME WITH YOUR OSU ACCOUNT
bancho.login({
    username: process.env.BANCHO_USERNAME,
    password: process.env.BANCHO_PASSWORD,
});