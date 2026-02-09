import { TOWER_TYPES, TARGET_MODES, STATE } from './constants.js';

export class UI {
    constructor(game) {
        this.game = game;

        // Cache DOM elements
        this.elWave = document.getElementById('wave-info');
        this.elLives = document.getElementById('lives-info');
        this.elGold = document.getElementById('gold-info');
        this.elScore = document.getElementById('score-info');
        this.elRecord = document.getElementById('record-info');
        this.elTowerPanel = document.getElementById('tower-panel');
        this.elTowerInfo = document.getElementById('tower-info');
        this.elSpeedBtns = document.querySelectorAll('.speed-btn');
        this.elPauseBtn = document.getElementById('pause-btn');
        this.elMuteBtn = document.getElementById('mute-btn');
        this.elNextWaveBtn = document.getElementById('next-wave-btn');

        this.setupTowerPanel();
        this.setupControls();
    }

    setupTowerPanel() {
        const panel = this.elTowerPanel;
        panel.innerHTML = '';

        for (const [key, def] of Object.entries(TOWER_TYPES)) {
            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            btn.dataset.type = key;
            btn.innerHTML = `
                <span class="tower-icon" style="background:${def.color}"></span>
                <span class="tower-name">${def.name}</span>
                <span class="tower-cost">$${def.cost}</span>
            `;
            btn.title = `${def.name} Tower ($${def.cost}) - Press ${Object.entries({ arrow: 1, cannon: 2, frost: 3, lightning: 4, sniper: 5 })[Object.keys(TOWER_TYPES).indexOf(key)][1]}`;
            btn.addEventListener('click', () => {
                this.game.audio.ensureContext();
                this.game.input.selectTowerType(key);
                this.update();
            });
            panel.appendChild(btn);
        }
    }

    setupControls() {
        // Speed buttons
        this.elSpeedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.game.audio.ensureContext();
                this.game.setSpeed(parseInt(btn.dataset.speed));
            });
        });

        // Pause button
        this.elPauseBtn.addEventListener('click', () => {
            this.game.audio.ensureContext();
            if (this.game.state === STATE.MENU) {
                this.game.start();
            } else {
                this.game.togglePause();
            }
        });

        // Mute button
        this.elMuteBtn.addEventListener('click', () => {
            this.game.audio.toggleMute();
            this.elMuteBtn.textContent = this.game.audio.muted ? 'Unmute' : 'Mute';
        });

        // Next wave button
        this.elNextWaveBtn.addEventListener('click', () => {
            this.game.audio.ensureContext();
            if (this.game.state === STATE.MENU) {
                this.game.start();
            } else if (this.game.waves.betweenWaves && this.game.state === STATE.PLAYING) {
                this.game.waves.startNextWave();
            }
        });

        // Screen buttons
        document.getElementById('start-btn')?.addEventListener('click', () => {
            this.game.audio.ensureContext();
            this.game.start();
        });
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.game.restart();
        });
        document.getElementById('restart-btn-victory')?.addEventListener('click', () => {
            this.game.restart();
        });
    }

    update() {
        const game = this.game;
        const eco = game.economy;
        const waves = game.waves;

        // Top bar info
        this.elWave.textContent = `Wave: ${waves.currentWave}/20`;
        this.elLives.textContent = `Lives: ${eco.lives}`;
        this.elGold.textContent = `Gold: ${eco.gold}`;
        this.elScore.textContent = `Score: ${eco.score}`;
        this.elRecord.textContent = `Record: ${eco.record}`;

        // Speed buttons
        this.elSpeedBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.speed) === game.speed);
        });

        // Pause button
        this.elPauseBtn.textContent = game.state === STATE.PAUSED ? 'Resume' : 'Pause';

        // Next wave button
        if (waves.betweenWaves && game.state === STATE.PLAYING) {
            this.elNextWaveBtn.style.display = 'inline-block';
            this.elNextWaveBtn.textContent = `Next Wave (${waves.currentWave + 1})`;
        } else {
            this.elNextWaveBtn.style.display = 'none';
        }

        // Tower buttons affordability
        const towerBtns = this.elTowerPanel.querySelectorAll('.tower-btn');
        towerBtns.forEach(btn => {
            const type = btn.dataset.type;
            const def = TOWER_TYPES[type];
            const canAfford = eco.gold >= def.cost;
            btn.classList.toggle('disabled', !canAfford);
            btn.classList.toggle('selected', game.input.selectedTowerType === type);
        });
    }

    showTowerInfo(tower) {
        const info = this.elTowerInfo;
        const upgradeCost = tower.getUpgradeCost();
        const sellValue = tower.getSellValue();
        const targetMode = TARGET_MODES[tower.targetMode];

        let html = `
            <div class="tower-info-header">
                <span class="tower-info-name">${tower.name} Tower</span>
                <span class="tower-info-level">Lv.${tower.level + 1}</span>
            </div>
            <div class="tower-info-stats">
                <div>Damage: ${tower.damage}</div>
                <div>Range: ${tower.range.toFixed(1)}</div>
                <div>Fire Rate: ${(1 / tower.fireRate).toFixed(1)}/s</div>
                <div>Target: ${targetMode}</div>
            </div>
            <div class="tower-info-actions">
                <button id="target-btn" class="action-btn" title="Cycle targeting mode (T)">Target: ${targetMode}</button>
        `;

        if (upgradeCost !== null) {
            const canAfford = this.game.economy.canAfford(upgradeCost);
            html += `<button id="upgrade-btn" class="action-btn upgrade-btn${canAfford ? '' : ' disabled'}" title="Upgrade (U)">Upgrade $${upgradeCost}</button>`;
        } else {
            html += `<button class="action-btn disabled">MAX</button>`;
        }

        html += `
                <button id="sell-btn" class="action-btn sell-btn" title="Sell (S)">Sell $${sellValue}</button>
            </div>
        `;

        info.innerHTML = html;
        info.style.display = 'block';

        // Rebind action buttons
        document.getElementById('target-btn')?.addEventListener('click', () => {
            tower.cycleTargetMode();
            this.showTowerInfo(tower);
        });
        document.getElementById('upgrade-btn')?.addEventListener('click', () => {
            if (this.game.towers.upgradeTower(tower)) {
                this.showTowerInfo(tower);
                this.update();
            }
        });
        document.getElementById('sell-btn')?.addEventListener('click', () => {
            this.game.towers.sell(tower);
            this.game.input.selectedTower = null;
            this.hideTowerInfo();
            this.update();
        });
    }

    hideTowerInfo() {
        this.elTowerInfo.style.display = 'none';
    }

    showScreen(name) {
        // Hide all screens
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        // Show target
        const screen = document.getElementById(`${name}-screen`);
        if (screen) screen.classList.add('visible');

        // Populate score on end screens
        const eco = this.game.economy;
        const isNew = eco.score >= eco.record && eco.score > 0;
        const scoreText = `Score: ${eco.score}${isNew ? ' (New Record!)' : ''} | Record: ${eco.record}`;
        const goEl = document.getElementById('game-over-score');
        if (goEl) goEl.textContent = scoreText;
        const vicEl = document.getElementById('victory-score');
        if (vicEl) vicEl.textContent = scoreText;
    }

    hideAllScreens() {
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
    }
}
