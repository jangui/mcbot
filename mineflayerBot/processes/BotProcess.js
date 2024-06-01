const echoProcess = require("./EchoProcess");

class Process {
    constructor(bot) {
        this.bot = bot;
        this.action = null;
        this.finished = false;
        this.initialized = false;
    }

    // To be implemented by child classes
    init() { this.running = true; this.initialized = true; }
    cleanup() { this.running = false; }
    execute() {}
    equals(otherProcess) { return otherProcess instanceof Process; }
}
