const Vec3 = require('vec3').Vec3
const Process = require("./BotProcess.js");
const EchoProcess = require("./EchoProcess");

class StripMineProcess {
    constructor(bot, x, y, z) {
        this.bot = bot;
        this.action = null;
        this.finished = false;
        this.initialized = false;

        this.goalCoordinates = new Vec3(x, y, z);

    }

    init() {
        this.bot.chat(`starting strip mine process. goal coords: ${this.goalCoordinates}`);
        this.initialized = true;
    }

    cleanup() {
        this.bot.chat("cleaning up strip mine process");
    }

    execute() {
        // if ongoing action perform it
        if (this.action != null) {
           this.action.execute();
           return;
        }

        // find action to perform next
        const position = this.bot.entity.position;
        const yDif = Math.round(position.y - this.goalCoordinates.y);
        const xDif = Math.round(position.x - this.goalCoordinates.x);
        const zDif = Math.round(position.z - this.goalCoordinates.z);
        if (yDif > 0) {
            const block = this.bot.blockAt(this.currentLocation);
            if (block && block.diggable) {
                this.action = digging(block);
                /*
                this.bot.dig(block, (err) => {
                    if (err) {
                        console.log("Error digging block:", err);

                 */
            } else {
                this.action = moving(position.x, position.y-1, position.z);
                // Move to the next block
            }
        } else {
        }
    }

    equals(otherProcess) {
        if ( otherProcess instanceof StripMineProcess) {
            if (otherProcess.goalCoordinates === this.goalCoordinates) {
                return true;
            }
        }
        return false;
    }
}

module.exports = StripMineProcess;
