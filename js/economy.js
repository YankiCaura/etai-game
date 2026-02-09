import { STARTING_GOLD, STARTING_LIVES } from './constants.js';

const RECORD_KEY = 'td_high_score';

export class Economy {
    constructor() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
        this.record = parseInt(localStorage.getItem(RECORD_KEY)) || 0;
    }

    canAfford(cost) {
        return this.gold >= cost;
    }

    spendGold(amount) {
        this.gold -= amount;
    }

    addGold(amount) {
        this.gold += amount;
    }

    addScore(points) {
        this.score += points;
        if (this.score > this.record) {
            this.record = this.score;
            localStorage.setItem(RECORD_KEY, this.record);
        }
    }

    loseLives(count) {
        this.lives = Math.max(0, this.lives - count);
    }

    reset() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
    }
}
