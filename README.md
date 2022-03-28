# bancho.js
 Interact with osu!'s IRC bancho
<div>
<p>
<img src="https://img.shields.io/npm/v/@tawan475/bancho.js" />
<img src="https://img.shields.io/npm/dt/@tawan475/bancho.js" />
<img src="https://img.shields.io/librariesio/release/npm/@tawan475/bancho.js" />
</p>
</div>
 
## Installation
```sh-session
npm install @tawan475/bancho.js
```

## Authentication
### **YOUR IRC ACCOUNT **DOES NOT** USE THE SAME USERNAME AND PASSWORD AS YOUR OSU ACCOUNT**

Get your IRC username and password here

[https://osu.ppy.sh/p/irc](https://osu.ppy.sh/p/irc)

## Documentation
[Github Wiki Link](https://github.com/tawan475/bancho.js/wiki)

## Example usage

Install bancho.js and dotenv

```sh-session
npm install @tawan475/bancho.js
npm install dotenv
```

Basic message reciever and Ping Pong command!

```js
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
```