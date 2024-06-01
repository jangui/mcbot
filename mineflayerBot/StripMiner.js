const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const minecraftData = require('minecraft-data');

class StripMiner {
    constructor(options) {
        this.bot = mineflayer.createBot(options);
        this.mcData = minecraftData(this.bot.version);

        this.targetCoords = null;
        this.isAbsolute = true;
        this.isMining = false;
        this.nearbyBlocks = {}; // Store the nearby block data
        this.lastUpdateTick = 0; // Track the last tick when blocks were updated
        this.lowHealthThreshold = 3;

        this.initListeners();
    }

    initListeners() {
        this.bot.on('spawn', this.onSpawn.bind(this));
        this.bot.on('chat', this.onChat.bind(this));
        this.bot.on('physicTick', this.onPhysicTick.bind(this));
        this.bot.on('health', this.onHealth.bind(this));
        this.bot.on('blockUpdate', this.onBlockUpdate.bind(this)); // Add blockUpdate listener
        this.bot.on('error', this.onError.bind(this));
        this.bot.on('end', this.onEnd.bind(this));
    }

    onSpawn() {
        console.log("Bot spawned.");
        this.bot.chat("Bot is online and ready.");
    }

    onChat(username, message) {
        if (username === this.bot.username) return;

        const args = message.split(' ');
        if (args[0] === 'mine') {
            this.handleMineCommand(args);
        }
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

            this.setTargetCoordinates(x, y, z);
        } catch (error) {
            console.error(error.message);
            this.bot.chat(error.message);
        }
    }

    setTargetCoordinates(x, y, z) {
        const currentPos = this.bot.entity.position;
        if (this.isAbsolute) {
            this.targetCoords = { x, y, z };
        } else {
            this.targetCoords = {
                x: currentPos.x + x,
                y: currentPos.y + y,
                z: currentPos.z + z,
            };
        }
        this.isMining = true;
        console.log(`Starting mining towards: ${this.targetCoords.x}, ${this.targetCoords.y}, ${this.targetCoords.z}`);
    }

    onPhysicTick() {
        if (!this.targetCoords || !this.isMining) return;

        const currentTick = this.bot.tickCounter;
        if (currentTick - this.lastUpdateTick >= 20) { // Update blocks every second (20 ticks)
            this.queryNearbyBlocks();
            this.lastUpdateTick = currentTick;
        }

        const botPos = this.bot.entity.position;
        const dx = this.targetCoords.x - Math.floor(botPos.x);
        const dy = this.targetCoords.y - Math.floor(botPos.y);
        const dz = this.targetCoords.z - Math.floor(botPos.z);

        // Move in x direction first
        if (dx !== 0) {
            this.moveInDirection(dx, 0, 0);
        }
        // Then move in y direction
        else if (dy !== 0) {
            this.moveInDirection(0, dy, 0);
        }
        // Then move in z direction
        else if (dz !== 0) {
            this.moveInDirection(0, 0, dz);
        }
        // If already at the target, stop mining
        else {
            this.isMining = false;
            this.onGoalReached();
        }
    }

    queryNearbyBlocks() {
        const botPos = this.bot.entity.position;
        const range = 3; // Define the range around the bot to query blocks
        const nearbyBlocks = {};

        for (let x = -range; x <= range; x++) {
            for (let y = -range; y <= range; y++) {
                for (let z = -range; z <= range; z++) {
                    const block = this.bot.blockAt(botPos.offset(x, y, z));
                    if (block && block.type !== this.mcData.blocksByName.air.id) {
                        nearbyBlocks[`${block.position.x},${block.position.y},${block.position.z}`] = block;
                    }
                }
            }
        }

        this.nearbyBlocks = nearbyBlocks; // Store the nearby block data
        console.log(`Nearby blocks: ${Object.keys(nearbyBlocks).length} blocks found.`);
    }

    moveInDirection(dx, dy, dz) {
        const direction = { x: dx ? Math.sign(dx) : 0, y: dy ? Math.sign(dy) : 0, z: dz ? Math.sign(dz) : 0 };
        const targetBlock = this.bot.blockAt(this.bot.entity.position.offset(direction.x, direction.y, direction.z));

        if (targetBlock && targetBlock.type !== this.mcData.blocksByName.air.id) {
            this.bot.dig(targetBlock, (err) => {
                if (err) {
                    console.error(`Error digging block: ${err.message}`);
                } else {
                    console.log(`Successfully dug block at: ${targetBlock.position}`);
                }
            });
        } else {
            this.bot.setControlState('forward', true);
            setTimeout(() => this.bot.setControlState('forward', false), 100); // Move forward briefly
        }
    }

    onBlockUpdate(oldBlock, newBlock) {
        const botPos = this.bot.entity.position;
        const range = 3; // Define the range around the bot to track block updates

        // Check if the block is within the specified range
        if (Math.abs(newBlock.position.x - botPos.x) <= range &&
            Math.abs(newBlock.position.y - botPos.y) <= range &&
            Math.abs(newBlock.position.z - botPos.z) <= range) {
            const key = `${newBlock.position.x},${newBlock.position.y},${newBlock.position.z}`;
            if (newBlock.type !== this.mcData.blocksByName.air.id) {
                this.nearbyBlocks[key] = newBlock;
            } else {
                delete this.nearbyBlocks[key];
            }
            console.log(`Block updated from ${oldBlock.name} to ${newBlock.name} at position ${newBlock.position}`);
        }
    }

    onHealth() {
        if (this.bot.health < this.lowHealthThreshold) {
            console.log("Health is low. Retreating to safe location.");
            this.bot.chat("Health is low. Retreating to safe location.");
            this.retreatToSafeLocation();
        }
    }

    retreatToSafeLocation() {
        this.isMining = false;
        const safePosition = { x: 0, y: 64, z: 0 }; // Example safe position
        console.log(`Retreating to safe location: ${safePosition.x}, ${safePosition.y}, ${safePosition.z}`);
        this.bot.chat(`Retreating to safe location.`);
        this.setTargetCoordinates(safePosition.x, safePosition.y, safePosition.z);
    }

    onGoalReached() {
        console.log("Reached target coordinates.");
        this.bot.chat("Reached target coordinates.");
    }

    onError(err) {
        console.error(`Error: ${err.message}`);
    }

    onEnd() {
        console.log("Bot disconnected.");
    }
}

module.exports = StripMiner;
