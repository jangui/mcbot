const Bot = require('./Bot');
require('events').EventEmitter.defaultMaxListeners = 20; // Increase max listeners

const options = {
    host: 'localhost', // The Minecraft server address
    username: 'test',  // The bot's username
    auth: 'offline',   // Authentication method
    port: '25600',     // The Minecraft server port
    version: '1.19.3'  // Specify the Minecraft version (replace '1.16.4' with your server's version)
};

const botInstance = new Bot(options);

// Start the viewer
botInstance.startViewer();

// Initialize the strip mining process once the bot spawns
botInstance.bot.on('spawn', () => {
    botInstance.stripMine();
});

// The bot will now run indefinitely, and you can stop it using Ctrl+C
