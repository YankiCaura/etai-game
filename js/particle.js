import { MAX_PARTICLES } from './constants.js';
import { randRange } from './utils.js';

class Particle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.color = '#fff';
        this.size = 2;
        this.type = 'dot'; // dot, text, line, shard, crystal, star
        this.text = '';
        this.x2 = 0;
        this.y2 = 0;
        this.alpha = 1;
        this.gravity = 0;
        this.rotation = 0;
        this.rotSpeed = 0;
    }

    init(opts) {
        this.active = true;
        this.x = opts.x || 0;
        this.y = opts.y || 0;
        this.vx = opts.vx || 0;
        this.vy = opts.vy || 0;
        this.life = opts.life || 1;
        this.maxLife = this.life;
        this.color = opts.color || '#fff';
        this.size = opts.size || 2;
        this.type = opts.type || 'dot';
        this.text = opts.text || '';
        this.x2 = opts.x2 || 0;
        this.y2 = opts.y2 || 0;
        this.alpha = 1;
        this.gravity = opts.gravity || 0;
        this.rotation = opts.rotation || 0;
        this.rotSpeed = opts.rotSpeed || 0;
    }

    update(dt) {
        if (!this.active) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }
        this.alpha = this.life / this.maxLife;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.rotation += this.rotSpeed * dt;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = Array.from({ length: MAX_PARTICLES }, () => new Particle());
        this.activeCount = 0;
    }

    acquire(opts) {
        // Find an inactive particle
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                this.pool[i].init(opts);
                this.activeCount++;
                return this.pool[i];
            }
        }
        // Pool full - reuse oldest (index 0 for simplicity)
        this.pool[0].init(opts);
        return this.pool[0];
    }

    spawnExplosion(x, y, color) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + randRange(-0.2, 0.2);
            const spd = randRange(40, 100);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.3, 0.6),
                color,
                size: randRange(2, 4),
                gravity: 50,
            });
        }
    }

    spawnSpark(x, y, color, count = 3) {
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(20, 60);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.15, 0.3),
                color,
                size: randRange(1, 3),
            });
        }
    }

    spawnFloatingText(x, y, text, color) {
        this.acquire({
            x,
            y,
            vx: 0,
            vy: -40,
            life: 1.2,
            color,
            type: 'text',
            text,
            size: 14,
        });
    }

    spawnLightning(x1, y1, x2, y2) {
        this.acquire({
            x: x1,
            y: y1,
            x2,
            y2,
            vx: 0,
            vy: 0,
            life: 0.15,
            color: '#e0b0ff',
            type: 'line',
            size: 2,
        });
    }

    spawnMuzzleFlash(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(30, 80);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.08, 0.15),
                color,
                size: randRange(2, 4),
                type: 'star',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-10, 10),
            });
        }
    }

    spawnFrostBurst(x, y, count) {
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(20, 50);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.4, 0.8),
                color: '#aaddff',
                size: randRange(2, 4),
                type: 'crystal',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-6, 6),
            });
        }
    }

    spawnDust(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.acquire({
                x: x + randRange(-3, 3),
                y,
                vx: randRange(-8, 8),
                vy: randRange(-15, -30),
                life: randRange(0.3, 0.5),
                color: '#c8a96e',
                size: randRange(1, 2),
                type: 'dot',
            });
        }
    }

    spawnShatter(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + randRange(-0.3, 0.3);
            const spd = randRange(60, 140);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.4, 0.8),
                color,
                size: randRange(3, 6),
                type: 'shard',
                gravity: 120,
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-12, 12),
            });
        }
    }

    update(dt) {
        this.activeCount = 0;
        for (const p of this.pool) {
            if (p.active) {
                p.update(dt);
                if (p.active) this.activeCount++;
            }
        }
    }

    draw(ctx) {
        for (const p of this.pool) {
            if (!p.active) continue;

            ctx.globalAlpha = p.alpha;

            if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else if (p.type === 'line') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size;
                ctx.beginPath();
                // Jagged lightning
                const dx = p.x2 - p.x;
                const dy = p.y2 - p.y;
                const segs = 5;
                ctx.moveTo(p.x, p.y);
                for (let i = 1; i < segs; i++) {
                    const t = i / segs;
                    const jx = randRange(-8, 8);
                    const jy = randRange(-8, 8);
                    ctx.lineTo(p.x + dx * t + jx, p.y + dy * t + jy);
                }
                ctx.lineTo(p.x2, p.y2);
                ctx.stroke();
            } else if (p.type === 'shard') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                const s = p.size * p.alpha;
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.5, s * 0.4);
                ctx.lineTo(-s * 0.5, s * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'crystal') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                const s = p.size * p.alpha;
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.6, 0);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'star') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                const s = p.size * p.alpha;
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = (Math.PI / 2) * i;
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                    ctx.lineTo(Math.cos(a + 0.3) * s * 0.4, Math.sin(a + 0.3) * s * 0.4);
                    ctx.lineTo(0, 0);
                }
                ctx.fill();
                ctx.restore();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    reset() {
        for (const p of this.pool) {
            p.active = false;
        }
        this.activeCount = 0;
    }
}
