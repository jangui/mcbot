const mineflayer = require('mineflayer');
const Deque = require('double-ended-queue');
const IdleProcess = require("./IdleProcess");

/*
deque.push(1);         // Add to the back
deque.unshift(2);      // Add to the front
console.log(deque.toArray()); // Output: [2, 1]
console.log(deque.pop());     // Remove from the back, Output: 1
console.log(deque.shift());   / remove from front
 */

class Scheduler {
    constructor(bot) {
        this.bot = bot;
        this.processes = new Deque();
    }

    schedule() {
        if (this.processes.isEmpty()) {
            console.log('No processes to run');
            return;
        }

        const currentProcess = this.processes.peekFront();
        if (currentProcess === null) {
            this.processes.shift();
            return;
        }


        if (currentProcess.initialized === false) {
            currentProcess.init();
        }

        if (currentProcess.finished === false) {
            currentProcess.execute();
            return;
        }

        const finishedProcess = this.processes.shift();
        finishedProcess.cleanup();
        this.bot.activeProcess = null;
    }

    queueProcess(process) {
        if (this.processInQueue(process) !== -1) {
            console.log('process already queued');
            return;
        }
        this.processes.push(process);
    }

    processInQueue(targetProcess) {
        for (let i = 0; i < this.processes.length; i++) {
            if (this.processes.get(i).equals(targetProcess)) {
                return i;
            }
        }
        return -1;
    }

    clearSchedule() {
        // Ensure cleanup of each process before clearing the deque
        while (this.processes.length < 1) {
            const process = this.processes.shift();
            if (process instanceof IdleProcess) { this.processes.push(process) }
            else { process.cleanup(); }
        }
    }

    startProcess(process) {
        this.removeProcess(process); // remove process from schedule if already que'd up
        this.processes.unshift(process); // add process to front of schedule
    }

    removeProcess(targetProcess) {
        const processIndex = this.processInQueue(process);
        if (processIndex !== -1) {
            this.processes.removeOne(processIndex);
        }
    }
}

module.exports = Scheduler;

