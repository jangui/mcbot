const Vec3 = require('vec3').Vec3
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const minecraftData = require('minecraft-data');

class TravelProcess {
    constructor(bot, x, y, z, isAbsolute) {
        this.bot = bot;
        this.action = null;
        this.finished = false;
        this.initialized = false;
        this.terminated = false;
        this.paused = false;

        this.destination = new Vec3(x, y, z);
        this.isAbsolute = isAbsolute;
        this.setDestinationCoordinates()

    }

    // destination depends on coordinates being either absolute or relative offsets
    setDestinationCoordinates() {
        const currentPos = this.bot.entity.position;
        if (!this.isAbsolute) {
            this.destination = {
                x: currentPos.x + this.destination.x,
                y: currentPos.y + this.destination.y,
                z: currentPos.z + this.destination.z,
            };
        }
    }


    init() {
        this.bot.chat(`Starting travel to ${this.destination.x}, ${this.destination.y}, ${this.destination.z}`);

        // Ensure the pathfinder plugin is loaded
        this.bot.loadPlugin(pathfinder);

        // Initialize listeners
        this.initListeners();

        // Set movements based on the bot's version
        const mcData = minecraftData(this.bot.version);
        const defaultMove = new Movements(this.bot, mcData);
        this.bot.pathfinder.setMovements(defaultMove);

        this.goal = new goals.GoalBlock(this.destination.x, this.destination.y, this.destination.z);

        this.initialized = true;
        this.execute();
    }

    initListeners() {
        this.originalGoalListener = this.bot.listeners('goal_reached')[0];
        this.bot.removeAllListeners('goal_reached');
        this.bot.on('goal_reached', this.onGoal.bind(this));

        this.originalChatListener = this.bot.listeners('chat')[0];
        this.bot.removeAllListeners('chat');
        this.bot.on('chat', this.chatListener.bind(this));

    }

    onGoal() {
        this.bot.chat('Arrived at destination');
        this.finished = true;
    }

    chatListener(username, message) {
        const args = message.split(' ');
        if (args[0] === 'quit') {
            this.finished = true;
        }
    }


    execute() {
        if (!this.initialized) {
            this.init();
        }
        if (this.finished === false) {
            this.bot.pathfinder.setGoal(this.goal);
        }
    }

    cleanup() {
        this.bot.chat("cleaning up travel process");
        this.cleanListeners();
        this.bot.pathfinder.setGoal(null); // Clear the current pathfinding goal
    }

    cleanListeners() {
        this.bot.removeAllListeners('goal_reached');
        if (this.originalGoalListener) {
            this.bot.on('goal_reached', this.originalGoalListener);
        }
        this.bot.removeAllListeners('chat');
        if (this.originalChatListener) {
            this.bot.on('chat', this.originalChatListener);
        }
    }

    equals(otherProcess) {
        if ( otherProcess instanceof TravelProcess) {
            if (otherProcess.destination === this.destination) {
                return true;
            }
        }
        return false;
    }
}

module.exports = TravelProcess;
