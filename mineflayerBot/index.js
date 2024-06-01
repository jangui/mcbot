const Bot = require('./Bot.js');
const StripMiner = require('./StripMiner');

require('events').EventEmitter.defaultMaxListeners = 20; // Increase max listeners

const botOptions = {
    host: 'localhost', // Minecraft server IP
    port: 25565,       // Minecraft server port
    username: 'Bot',   // Bot username
    version: '1.19.3',
    auth: 'offline'
};

const bot = new Bot(botOptions);
