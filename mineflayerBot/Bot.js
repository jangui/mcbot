const mineflayer = require('mineflayer');
const minecraftData = require('minecraft-data');
const Scheduler = require('./Scheduler');
const StripMineProcess = require('./StripMineProcess');
const IdleProcess = require('./IdleProcess');
const EchoProcess = require('./EchoProcess');
const TravelProcess = require('./TravelProcess');

class Bot {
    constructor(options) {
        this.bot = mineflayer.createBot(options);
        this.mcData = minecraftData(this.bot.version);
        this.scheduler = new Scheduler(this);
        this.tickCount = 0;
        this.activeProcess = null;

        this.lowHealthThreshold = 3;

        this.initListeners();
    }

    initListeners() {
        this.bot.on('spawn', this.onSpawn.bind(this));
        this.bot.on('chat', this.onChat.bind(this));
        this.bot.on('physicTick', this.onPhysicTick.bind(this));
        this.bot.on('health', this.onHealth.bind(this));
        // this.bot.on('blockUpdate', this.onBlockUpdate.bind(this)); // Add blockUpdate listener
        this.bot.on('error', this.onError.bind(this));
        this.bot.on('end', this.onEnd.bind(this));
    }

    onSpawn() {

        console.log("Bot spawned.");
        this.bot.chat("Hello World");
        this.scheduler.queueProcess(new EchoProcess(this.bot));
        this.scheduler.queueProcess(new IdleProcess(this.bot, this.scheduler));
    }

    onChat(username, message) {
        if (username === this.bot.username) return;

        const args = message.split(' ');
        if (args[0] === 'mine') {
            this.bot.chat('mining time!');
            //this.handleMineCommand(args);
        } else if (args[0] === 'idle') {
           this.initIdleProcess();
        }
    }

    initIdleProcess() {
        this.scheduler.queueProcess(new idleProcess(this.bot, this.scheduler));
    }

    initEchoProcess() {
        this.scheduler.queueProcess(new EchoProcess(this.bot));
    }

    handleMineCommand(args) {
        try {
            if (args.length < 4) {
                throw new Error("Invalid coordinates. Usage: mine <x> <y> <z> [absolute|relative]");
            }
            const x = parseInt(args[1]);
            const y = parseInt(args[2]);
            const z = parseInt(args[3]);
            this.isAbsolute = args[4] !== 'relative';

            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                throw new Error("Coordinates must be numbers.");
            }

            initMiningProcess(x, y, z);

        } catch (error) {
            console.error(error.message);
            this.bot.chat(error.message);
        }
    }

    initMiningProcess(x, y, z) {
        const stripMineProcess = StripMineProcess(this, x, y, z);
        this.scheduler.addProcess(stripMineProcess);
    }

    onPhysicTick() {
        if (this.activeProcess != null) {
            this.activeProcess.execute();
        }

        this.tickCount++;
        if (this.tickCount % 5 === 0) {
            this.querySurroundings();
            this.scheduler.schedule();
        }
    }

    querySurroundings() {
        // runs every 5 ticks
        // queries the blocks around the bot
    }

    onHealth() {
        const msg = `Bot took damage! Health: ${this.bot.health}`;
        console.log(msg);
        this.bot.chat(msg);
        // if (this.bot.health < this.lowHealthThreshold) {}
    }

    onError(err) {
        console.error(`Error: ${err.message}`);
    }

    onEnd() {
        console.log("Bot disconnected.");
    }

}

module.exports = Bot;
