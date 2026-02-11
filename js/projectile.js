import { CELL, TOWER_TYPES } from './constants.js';
import { distance, angle } from './utils.js';

export class Projectile {
    constructor(tower, target) {
        this.x = tower.x;
        this.y = tower.y;
        this.targetId = target.id;
        this.target = target;
        this.lastKnownX = target.x;
        this.lastKnownY = target.y;
        this.speed = tower.projSpeed;
        this.damage = tower.damage;
        this.towerType = tower.type;
        this.alive = true;

        // Special properties inherited from tower
        this.splashRadius = tower.splashRadius;
        this.slowFactor = tower.slowFactor;
        this.slowDuration = tower.slowDuration;
        this.chainCount = tower.chainCount;
        this.chainRange = tower.chainRange;
        this.chainDecay = tower.chainDecay;
        this.critChance = tower.critChance;
        this.critMulti = tower.critMulti;
        this.burnDamage = tower.burnDamage;
        this.burnDuration = tower.burnDuration;

        // Visual
        this.angle = angle(this, target);
        this.trail = [];
    }

    update(dt, game) {
        if (!this.alive) return;

        // Update target position if target still alive
        if (this.target && this.target.alive) {
            this.lastKnownX = this.target.x;
            this.lastKnownY = this.target.y;
        }

        // Home toward target or last known position
        const dx = this.lastKnownX - this.x;
        const dy = this.lastKnownY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.angle = Math.atan2(dy, dx);

        const move = this.speed * dt;
        if (move >= dist) {
            // Hit
            this.x = this.lastKnownX;
            this.y = this.lastKnownY;
            this.onHit(game);
        } else {
            this.x += (dx / dist) * move;
            this.y += (dy / dist) * move;
        }

        // Trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();
    }

    onHit(game) {
        this.alive = false;

        // Crit check
        let dmg = this.damage;
        let isCrit = false;
        if (this.critChance > 0 && Math.random() < this.critChance) {
            dmg *= this.critMulti;
            isCrit = true;
        }

        if (this.splashRadius > 0) {
            // Splash damage
            this.doSplash(dmg, game);
            game.audio.playExplosion();
            game.particles.spawnExplosion(this.x, this.y, '#ff6600');
            game.triggerShake(3, 0.15);
        } else if (this.chainCount > 0) {
            // Chain lightning
            this.doChain(dmg, game);
        } else {
            // Single target
            if (this.target && this.target.alive) {
                const dealt = this.target.takeDamage(dmg);
                game.debug.onDamageDealt(dealt);
                if (this.slowFactor > 0) {
                    this.target.applySlow(this.slowFactor, this.slowDuration);
                    game.particles.spawnSpark(this.x, this.y, '#5bbaff', 3);
                }
                if (this.burnDamage > 0) {
                    this.target.applyBurn(this.burnDamage, this.burnDuration);
                }
                if (isCrit) {
                    game.particles.spawnFloatingText(this.x, this.y - 15, `CRIT!`, '#ff4444');
                    game.particles.spawnSpark(this.x, this.y, '#ff4444', 5);
                }
            }
        }

        game.particles.spawnSpark(this.x, this.y, this.getColor(), 3);
    }

    doSplash(dmg, game) {
        const splashPx = this.splashRadius * CELL;
        const enemies = game.enemies.enemies;
        for (const e of enemies) {
            if (!e.alive) continue;
            const dist = distance(this, e);
            if (dist <= splashPx) {
                // Falloff: 100% at center, 50% at edge
                const falloff = 1 - 0.5 * (dist / splashPx);
                const dealt = e.takeDamage(dmg * falloff);
                game.debug.onDamageDealt(dealt);
            }
        }
    }

    doChain(dmg, game) {
        const hit = new Set();
        let current = this.target;
        let currentDmg = dmg;

        for (let i = 0; i < this.chainCount; i++) {
            if (!current || !current.alive) break;
            hit.add(current.id);
            const dealt = current.takeDamage(currentDmg);
            game.debug.onDamageDealt(dealt);

            // Visual chain
            const nextTarget = this.findChainTarget(current, hit, game);
            if (nextTarget) {
                game.particles.spawnLightning(current.x, current.y, nextTarget.x, nextTarget.y);
            }

            currentDmg *= this.chainDecay;
            current = nextTarget;
        }

        game.audio.playShoot('lightning');
    }

    findChainTarget(from, hitSet, game) {
        const chainPx = this.chainRange * CELL;
        let best = null;
        let bestDist = Infinity;

        for (const e of game.enemies.enemies) {
            if (!e.alive || hitSet.has(e.id)) continue;
            const d = distance(from, e);
            if (d <= chainPx && d < bestDist) {
                bestDist = d;
                best = e;
            }
        }
        return best;
    }

    getColor() {
        const colors = {
            arrow: '#8bc34a',
            cannon: '#ff9800',
            frost: '#03a9f4',
            lightning: '#ba68c8',
            sniper: '#ef5350',
            firearrow: '#ff4500',
        };
        return colors[this.towerType] || '#fff';
    }
}

export class ProjectileManager {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
    }

    spawn(tower, target) {
        this.projectiles.push(new Projectile(tower, target));
    }

    update(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this.game);
            if (!p.alive) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    reset() {
        this.projectiles = [];
    }
}
