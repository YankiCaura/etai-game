export class Audio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.3;
        }
    }

    playTone(type, freqStart, freqEnd, duration, volume = 0.3) {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), now + duration);

        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    playNoise(duration, volume = 0.1) {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * volume;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(gain);
        gain.connect(this.masterGain);

        source.start(now);
    }

    playShoot(towerType) {
        switch (towerType) {
            case 'arrow':
                // Triangle wave pitch sweep
                this.playTone('triangle', 800, 200, 0.1, 0.15);
                break;
            case 'cannon':
                // Sawtooth boom + noise
                this.playTone('sawtooth', 150, 30, 0.2, 0.2);
                this.playNoise(0.15, 0.08);
                break;
            case 'frost':
                // Dual sine shimmer with beat frequency
                this.playTone('sine', 440, 440, 0.2, 0.1);
                this.playTone('sine', 445, 445, 0.2, 0.1);
                break;
            case 'lightning':
                this.playLightningZap();
                break;
            case 'sniper':
                // Sharp crack
                this.playTone('square', 2000, 100, 0.06, 0.2);
                break;
            case 'firearrow':
                // Crackling fire sound
                this.playTone('sawtooth', 400, 150, 0.15, 0.12);
                this.playTone('triangle', 600, 200, 0.1, 0.08);
                break;
            case 'deepfrost':
                // Deep resonant pulse — low sine sweep + noise burst
                this.playTone('sine', 120, 60, 0.25, 0.15);
                this.playTone('sine', 200, 100, 0.15, 0.08);
                this.playNoise(0.1, 0.04);
                break;
        }
    }

    playLightningZap() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        lfo.type = 'square';
        lfo.frequency.value = 30;
        lfoGain.gain.value = 400;

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + 0.15);
        lfo.stop(now + 0.15);
    }

    playExplosion() {
        this.playTone('sine', 100, 20, 0.3, 0.2);
        this.playNoise(0.25, 0.1);
    }

    playPlace() {
        this.playTone('sine', 300, 500, 0.1, 0.1);
    }

    playWaveStart() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        // Ascending 4-note fanfare
        const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
        const now = this.ctx.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.25);
        });
    }

    playGameOver() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;
        // Descending sad notes
        const notes = [392, 330, 262, 196];
        const now = this.ctx.currentTime;
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.2);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.2 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.4);
        });
    }

    playVictory() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;
        const notes = [262, 330, 392, 523, 659, 784];
        const now = this.ctx.currentTime;
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.35);
        });
    }
}
