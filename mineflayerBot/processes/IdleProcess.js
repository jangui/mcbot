const {Vec3} = require("vec3");
const Process = require("./BotProcess.js");
const EchoProcess = require('./EchoProcess');
const TravelProcess = require('./TravelProcess');

class IdleProcess {
    constructor(bot, scheduler) {
        this.bot = bot;
        this.action = null;
        this.finished = false;
        this.initialized = false;

        this.scheduler = scheduler;
    }

    init() {
        this.bot.chat("starting idle process");
        this.originalChatListener = this.bot.listeners('chat')[0];
        this.bot.removeAllListeners('chat');
        this.bot.on('chat', this.chatListener.bind(this));
        this.initialized = true;
    }

    chatListener(username, message) {
        if (username === this.bot.username) return;

        const args = message.split(' ');
        if (args[0] === 'position') {
            const pos = this.bot.entity.position;
            this.bot.chat(`x: ${pos.x} y: ${pos.y} z: ${pos.z}`);
        } else if (args[0] === 'echo') {
            this.scheduler.startProcess(new EchoProcess(this.bot));
            this.bot.chat("Starting echo process..");
        } else if (args[0] === 'travel') {
            this.bot.chat("Starting travel process..");
            this.handleTravelCommand(args);
        } else if (args[0] === 'quit') {
            this.bot.chat("quitting all processes..");
            this.scheduler.clearSchedule();
        }
    }

    handleTravelCommand(args) {
        try {
            if (args.length < 4) {
                throw new Error("Invalid coordinates. Usage: travel <x> <y> <z> [ absolute | relative ]");
            }
            const x = parseInt(args[1]);
            const y = parseInt(args[2]);
            const z = parseInt(args[3]);
            this.isAbsolute = args[4] !== 'relative';

            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                throw new Error("Coordinates must be numbers.");
            }

            this.scheduler.startProcess(new TravelProcess(this.bot, x, y, z, this.isAbsolute));

        } catch (error) {
            console.error(error.message);
            this.bot.chat(error.message);
        }
    }

    cleanup() {
        this.bot.chat("cleaning up idle process");
        this.bot.removeAllListeners('chat');
        if (this.originalChatListener) {
            this.bot.on('chat', this.originalChatListener);
        }
    }

    execute() {
        // if ongoing action perform it
        //console.log('executing idle process');
        //this.bot.chat("idle...");
        if (this.action != null) {
            this.action.execute();
            return;
        }
    }

    equals(otherProcess) {
        return otherProcess instanceof IdleProcess;
    }
}

module.exports = IdleProcess;
