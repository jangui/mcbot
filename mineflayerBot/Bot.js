const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');
const readline = require('readline');

class Bot {
    constructor(options) {
        this.options = options;
        this.viewerServer = null;
        this.coordinates = {x: 0, y: 0, z: 0};
        this.isRunning = true;
        this.isDigging = false;

        this.miningState = {
            isMining: false,
            targetPos: null,
            currentPos: null,
            direction: 'x',
            step: 1
        };

        this.createBot();
        this.handleShutdownKeyPress();
    }

    createBot() {
        this.bot = mineflayer.createBot(this.options);
        this.bot.loadPlugin(pathfinder);

        this.bot.on('physicsTick', this.update.bind(this));
        this.bot.on('spawn', this.onSpawn.bind(this));
        this.bot.on('kicked', this.onKicked.bind(this));
        this.bot.on('error', this.onError.bind(this));
        this.bot.on('end', this.onEnd.bind(this));
    }

    update() {
        if (!this.isRunning) return;
        this.updateCoordinates();
        this.updateMining();
    }

    updateCoordinates() {
        if (this.bot.entity && this.bot.entity.position) {
            const {x, y, z} = this.bot.entity.position;
            this.coordinates = {x, y, z};
        }
    }

    getCoordinates() {
        return this.coordinates;
    }

    lookAtNearPlayer() {
        const playerFilter = (entity) => entity.type === 'player';
        const playerEntity = this.bot.nearestEntity(playerFilter);

        if (!playerEntity) {
            return;
        }

        const playerPos = playerEntity.position;
        this.bot.lookAt(playerPos);
    }

    onSpawn() {
        this.bot.chat("Hello, World!");
        this.stripMine();
    }

    checkLightLevel() {
        const lightLevel = this.bot.blockAt(this.bot.entity.position).light;
        return lightLevel;
    }

    async placeTorch() {
        const torch = this.bot.inventory.items().find(item => item.name === 'torch');
        if (!torch) {
            console.log('No torches in inventory.');
            return;
        }

        const oldYaw = this.bot.entity.yaw;
        const oldPitch = this.bot.entity.pitch;

        try {
            await this.bot.equip(torch, 'hand');

            const position = this.bot.entity.position.offset(0, -1, 0); // Position on the floor beneath the bot
            const blockBeneath = this.bot.blockAt(position);

            if (blockBeneath && blockBeneath.name !== 'air') {
                const referenceBlock = this.bot.blockAt(position);
                await this.bot.lookAt(referenceBlock.position, true);  // Look at the reference block before placing the torch

                const placeTorchPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Place torch timeout')), 5000);

                    this.bot.once('blockUpdate', (oldBlock, newBlock) => {
                        if (newBlock.position.equals(referenceBlock.position.offset(0, 1, 0)) && newBlock.name === 'torch') {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });

                    this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0)).catch(reject);
                });

                await placeTorchPromise;
                console.log('Torch placed.');

                // Restore old orientation
                await this.bot.look(oldYaw, oldPitch, true);
            } else {
                console.log('Cannot place torch at the current position.');
            }
        } catch (err) {
            console.error(`Error placing torch: ${err.message}`);
        }
    }

    onKicked(reason, loggedIn) {
        console.log(`Kicked: ${reason}, Logged In: ${loggedIn}`);
        this.isRunning = false;
    }

    onError(err) {
        console.log(`Error: ${err}`);
        this.isRunning = false;
    }

    onEnd() {
        console.log('Bot ended, reconnecting...');
        if (this.isRunning) {
            setTimeout(() => this.createBot(), 5000); // Reconnect after 5 seconds
        }
    }

    startViewer(port = 3007, firstPerson = true) {
        if (!this.viewerServer) {
            this.viewerServer = mineflayerViewer(this.bot, {port, firstPerson});
            console.log(`Viewer started on http://localhost:${port}`);
        } else {
            console.log('Viewer is already running.');
        }
    }

    stopViewer() {
        if (this.viewerServer) {
            this.viewerServer.close();
            this.viewerServer = null;
            console.log('Viewer stopped.');
        } else {
            console.log('Viewer is not running.');
        }
    }

    moveTo(x, y, z) {
        const goal = new goals.GoalBlock(x, y, z);
        this.bot.pathfinder.setGoal(goal);
    }

    moveInDirection(dx, dy, dz) {
        const {x, y, z} = this.coordinates;
        this.moveTo(x + dx, y + dy, z + dz);
    }

    detectNearbyEntities(range = 10) {
        const nearbyEntities = Object.values(this.bot.entities).filter(entity => {
            const distance = this.bot.entity.position.distanceTo(entity.position);
            return distance <= range && entity.type === 'player';
        });
        return nearbyEntities;
    }

    detectNearbyBlocks(range = 10) {
        const blocks = [];
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                for (let dz = -range; dz <= range; dz++) {
                    const block = this.bot.blockAt(this.bot.entity.position.offset(dx, dy, dz));
                    if (block && block.type !== 0) { // Ignore air blocks
                        blocks.push(block);
                    }
                }
            }
        }
        return blocks;
    }

    quit() {
        this.isRunning = false;
        this.stopViewer();
        this.bot.end();
        console.log('Bot has quit.');
    }

    // Inventory Management Methods

    listInventory() {
        return this.bot.inventory.items();
    }

    equipItem(itemName, destination) {
        const item = this.bot.inventory.items().find(item => item.name === itemName);
        if (item) {
            this.bot.equip(item, destination);
        } else {
            console.log(`Item ${itemName} not found in inventory.`);
        }
    }

    unequipItem(destination) {
        this.bot.unequip(destination);
    }

    craftItem(itemName, amount) {
        const mcData = require('minecraft-data')(this.bot.version);
        const itemId = mcData.itemsByName[itemName].id;
        const recipe = this.bot.recipesFor(itemId, null, 1, this.bot.inventory)[0];

        if (recipe) {
            this.bot.craft(recipe, amount, null, (err) => {
                if (err) {
                    console.log(`Error crafting ${itemName}:`, err);
                } else {
                    console.log(`Crafted ${amount} ${itemName}`);
                }
            });
        } else {
            console.log(`No recipe found for ${itemName}`);
        }
    }

    useItem() {
        this.bot.activateItem();
    }

    getCurrentlyHeldItem() {
        const item = this.bot.heldItem;
        if (item) {
            return {name: item.name, count: item.count};
        } else {
            return null;
        }
    }

    isInventoryFull() {
        return this.bot.inventory.emptySlotCount() === 0;
    }

    searchInventory(itemName, count = 1) {
        let foundCount = 0;
        for (const item of this.bot.inventory.items()) {
            if (item.name === itemName) {
                foundCount += item.count;
                if (foundCount >= count) {
                    return true;
                }
            }
        }
        return false;
    }

    // Strip Mine Method

    stripMine() {
        const startPos = this.bot.entity.position.clone();
        const targetPos = startPos.offset(50, 0, 0);

        this.miningState = {
            isMining: true,
            currentPos: startPos,
            targetPos: targetPos,
            direction: 'x',
            step: 1
        };

        // Orient the bot to face positive X direction
        this.bot.lookAt(startPos.offset(1, 0, 0), true);
    }

    async equipPickaxe() {
        const heldItem = this.bot.heldItem;
        if (heldItem && heldItem.name.includes('pickaxe')) {
            console.log('Pickaxe already equipped.');
            return;
        }

        const pickaxe = this.bot.inventory.items().find(item => item.name.includes('pickaxe'));
        if (pickaxe) {
            try {
                await this.bot.equip(pickaxe, 'hand');
                console.log('Equipped pickaxe.');
            } catch (err) {
                console.error(`Error equipping pickaxe: ${err.message}`);
            }
        } else {
            console.log('No pickaxe found in inventory.');
        }
    }

    isPathClear(nextPos) {
        const blockAtFeet = this.bot.blockAt(new Vec3(nextPos.x, nextPos.y, nextPos.z));
        const blockAtHead = this.bot.blockAt(new Vec3(nextPos.x, nextPos.y + 1, nextPos.z));

        return (blockAtFeet.type === 0 && blockAtHead.type === 0); // Check if both positions are air
    }

    async mineBlock(block) {
        if (block && block.type !== 0) {
            await this.bot.dig(block, true);
        }
    }

    moveToNextPosition(nextPos) {
        const goal = new goals.GoalBlock(nextPos.x, nextPos.y, nextPos.z);
        this.bot.pathfinder.setGoal(goal);

        // Ensure only one 'goal_reached' listener is active
        this.bot.removeAllListeners('goal_reached');

        this.bot.once('goal_reached', () => {
            this.miningState.currentPos = nextPos;
            // Continue mining after reaching the next position
            this.updateMining();
        });
    }


    async updateMining() {
        if (!this.miningState.isMining || this.isDigging) return;

        const { currentPos, targetPos, direction, step } = this.miningState;

        if (currentPos[direction] >= targetPos[direction]) {
            this.miningState.isMining = false;
            console.log('Finished strip mining.');
            return;
        }

        const nextPos = currentPos.clone().offset(step, 0, 0);

        if (this.isPathClear(nextPos)) {
            // Path is clear, move to the next position
            this.moveToNextPosition(nextPos);
        } else {
            // Path is not clear, need to mine
            const blockAtFeet = this.bot.blockAt(new Vec3(nextPos.x, nextPos.y, nextPos.z));
            const blockAtHead = this.bot.blockAt(new Vec3(nextPos.x, nextPos.y + 1, nextPos.z));

            try {
                this.isDigging = true;

                // Equip pickaxe before digging
                await this.equipPickaxe();

                // Look at the next position to ensure proper orientation
                await this.bot.lookAt(nextPos, true);

                // Mine the blocks at feet and head level
                await this.mineBlock(blockAtFeet);
                await this.mineBlock(blockAtHead);

                this.isDigging = false;

                // Check light level after digging
                const lightThreshold = 4;
                if (this.checkLightLevel() < lightThreshold) {
                    await this.placeTorch();
                }

                // Move to the next position after mining
                this.moveToNextPosition(nextPos);

            } catch (err) {
                console.error(`Error while digging: ${err.message}`);
                this.isDigging = false;
                return;
            }
        }
    }

    handleShutdownKeyPress() {
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);

        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                console.log('Shutdown key press detected.');
                this.quit();
                process.exit();
            }
        });
    }
}

module.exports = Bot;
