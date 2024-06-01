const Process = require("./BotProcess.js");

class EchoProcess {
    constructor(bot) {
        this.bot = bot;
        this.action = null;
        this.finished = false;
        this.initialized = false;

        this.init = this.init.bind(this);
    }

    init() {
        console.log("echoProcess initializing");
        this.bot.chat("setting up echo process");
        this.originalChatListener = this.bot.listeners('chat')[0];
        this.bot.removeAllListeners('chat');
        this.bot.on('chat', this.chatListener.bind(this));
        this.initialized = true;
    }

    chatListener(username, message) {
        if (username === this.bot.username) return;
        if (message === 'quit') {
            this.finished = true;
            return;
        }
        this.bot.chat(message);
    }

    cleanup() {
        this.bot.chat("cleaning up echo process");
        this.bot.removeAllListeners('chat');
        if (this.originalChatListener) {
            this.bot.on('chat', this.originalChatListener);
        }
    }

    execute() {
        // if ongoing action perform it
        if (this.action != null) {
            this.action.execute();
            return;
        }
    }

    equals(otherProcess) {
        return otherProcess instanceof EchoProcess;
    }
}

module.exports = EchoProcess;
