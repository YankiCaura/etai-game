import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS, TOWER_TYPES, TARGET_MODES } from './constants.js';
import { angle } from './utils.js';

export class Renderer {
    constructor(canvases, game) {
        this.game = game;
        this.terrainCtx = canvases.terrain.getContext('2d');
        this.gameCtx = canvases.game.getContext('2d');
        this.uiCtx = canvases.ui.getContext('2d');

        // Set canvas sizes
        for (const c of [canvases.terrain, canvases.game, canvases.ui]) {
            c.width = CANVAS_W;
            c.height = CANVAS_H;
        }
    }

    drawTerrain() {
        this.game.map.drawTerrain(this.terrainCtx);
        // Draw tower bases on terrain layer
        for (const tower of this.game.towers.towers) {
            this.drawTowerBase(this.terrainCtx, tower);
        }
    }

    drawTowerBase(ctx, tower) {
        const x = tower.gx * CELL;
        const y = tower.gy * CELL;
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;

        // Platform
        ctx.fillStyle = '#555';
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = '#666';
        ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);

        // Color accent ring
        const accentColors = {
            arrow: '#4a7c3f',
            cannon: '#8b5e3c',
            frost: '#5b9bd5',
            lightning: '#9b59b6',
            sniper: '#c0392b',
        };
        ctx.strokeStyle = accentColors[tower.type] || '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Corner bolt details
        ctx.fillStyle = '#888';
        const boltOffset = 5;
        const corners = [
            [x + boltOffset, y + boltOffset],
            [x + CELL - boltOffset, y + boltOffset],
            [x + boltOffset, y + CELL - boltOffset],
            [x + CELL - boltOffset, y + CELL - boltOffset],
        ];
        for (const [bx, by] of corners) {
            ctx.beginPath();
            ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFrame(interpolation) {
        const ctx = this.gameCtx;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Apply screen shake
        const shakeX = this.game.shakeOffsetX;
        const shakeY = this.game.shakeOffsetY;
        if (shakeX !== 0 || shakeY !== 0) {
            ctx.save();
            ctx.translate(shakeX, shakeY);
        }

        // Draw enemies
        this.drawEnemies(ctx);

        // Draw tower turrets (rotatable part)
        this.drawTowerTurrets(ctx);

        // Draw projectiles
        this.drawProjectiles(ctx);

        // Draw particles
        this.game.particles.draw(ctx);

        // Restore screen shake
        if (shakeX !== 0 || shakeY !== 0) {
            ctx.restore();
        }

        // Draw UI overlay
        this.drawUIOverlay();
    }

    // ── Enemy Shape Helpers ──────────────────────────────────

    drawPentagon(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    drawDiamond(ctx, x, y, r) {
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r * 0.7, y);
        ctx.lineTo(x, y + r * 1.2);
        ctx.lineTo(x - r * 0.7, y);
        ctx.closePath();
    }

    drawRoundedSquare(ctx, x, y, r) {
        const s = r * 0.85;
        const cr = r * 0.25;
        ctx.beginPath();
        ctx.moveTo(x - s + cr, y - s);
        ctx.lineTo(x + s - cr, y - s);
        ctx.quadraticCurveTo(x + s, y - s, x + s, y - s + cr);
        ctx.lineTo(x + s, y + s - cr);
        ctx.quadraticCurveTo(x + s, y + s, x + s - cr, y + s);
        ctx.lineTo(x - s + cr, y + s);
        ctx.quadraticCurveTo(x - s, y + s, x - s, y + s - cr);
        ctx.lineTo(x - s, y - s + cr);
        ctx.quadraticCurveTo(x - s, y - s, x - s + cr, y - s);
        ctx.closePath();
    }

    drawCross(ctx, x, y, r) {
        const w = r * 0.4;
        ctx.beginPath();
        ctx.moveTo(x - w, y - r);
        ctx.lineTo(x + w, y - r);
        ctx.lineTo(x + w, y - w);
        ctx.lineTo(x + r, y - w);
        ctx.lineTo(x + r, y + w);
        ctx.lineTo(x + w, y + w);
        ctx.lineTo(x + w, y + r);
        ctx.lineTo(x - w, y + r);
        ctx.lineTo(x - w, y + w);
        ctx.lineTo(x - r, y + w);
        ctx.lineTo(x - r, y - w);
        ctx.lineTo(x - w, y - w);
        ctx.closePath();
    }

    drawHexagon(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    drawTriangle(ctx, x, y, r, angle) {
        ctx.beginPath();
        // Point in movement direction
        ctx.moveTo(x + Math.cos(angle) * r * 1.2, y + Math.sin(angle) * r * 1.2);
        ctx.lineTo(x + Math.cos(angle + 2.4) * r, y + Math.sin(angle + 2.4) * r);
        ctx.lineTo(x + Math.cos(angle - 2.4) * r, y + Math.sin(angle - 2.4) * r);
        ctx.closePath();
    }

    drawEnemyShape(ctx, e, x, y, r) {
        switch (e.type) {
            case 'grunt':
                this.drawPentagon(ctx, x, y, r);
                break;
            case 'runner':
                this.drawDiamond(ctx, x, y, r);
                break;
            case 'tank':
                this.drawRoundedSquare(ctx, x, y, r);
                break;
            case 'healer':
                this.drawCross(ctx, x, y, r);
                break;
            case 'boss':
                this.drawHexagon(ctx, x, y, r);
                break;
            case 'swarm':
                this.drawTriangle(ctx, x, y, r, e.angle);
                break;
            default:
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                break;
        }
    }

    drawEnemies(ctx) {
        for (const e of this.game.enemies.enemies) {
            // Skip enemies that reached the end
            if (e.reached) continue;

            const isDying = e.deathTimer >= 0;

            // Death animation: scale down + fade
            let scale = 1;
            let alpha = 1;
            if (isDying) {
                const t = Math.min(e.deathTimer / 0.35, 1);
                scale = 1 - t;
                alpha = 1 - t;
                if (scale <= 0) continue;
            }

            // Walk bob
            const bob = e.alive && !isDying ? Math.sin(e.walkPhase) * 1.5 : 0;
            const drawX = e.x;
            const drawY = e.y + bob;
            const r = e.radius * scale;

            ctx.globalAlpha = alpha;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(drawX + 2, e.y + 2 + e.radius * 0.3, r, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Boss glow ring
            if (e.type === 'boss' && !isDying) {
                ctx.strokeStyle = 'rgba(255,215,0,0.2)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Body shape
            ctx.fillStyle = e.color;
            this.drawEnemyShape(ctx, e, drawX, drawY, r);
            ctx.fill();

            // Type-specific overlays
            if (e.type === 'tank' && !isDying) {
                // Armor cross-hatch
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 0.7;
                const s = r * 0.5;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(drawX - s, drawY + i * s * 0.7);
                    ctx.lineTo(drawX + s, drawY + i * s * 0.7);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(drawX + i * s * 0.7, drawY - s);
                    ctx.lineTo(drawX + i * s * 0.7, drawY + s);
                    ctx.stroke();
                }
            } else if (e.type === 'healer' && !isDying) {
                // White inner cross
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                const cw = r * 0.25;
                const ch = r * 0.6;
                ctx.fillRect(drawX - cw, drawY - ch, cw * 2, ch * 2);
                ctx.fillRect(drawX - ch, drawY - cw, ch * 2, cw * 2);
            } else if (e.type === 'boss' && !isDying) {
                // Crown motif — three gold triangles on top
                ctx.fillStyle = '#ffd700';
                const crownY = drawY - r * 0.6;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(drawX + i * r * 0.35, crownY - 4);
                    ctx.lineTo(drawX + i * r * 0.35 - 2, crownY + 2);
                    ctx.lineTo(drawX + i * r * 0.35 + 2, crownY + 2);
                    ctx.closePath();
                    ctx.fill();
                }
            } else if (e.type === 'runner' && !isDying) {
                // Speed lines behind
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 0.8;
                const backAngle = e.angle + Math.PI;
                for (let i = -1; i <= 1; i++) {
                    const off = i * 3;
                    const sx = drawX + Math.cos(backAngle) * r * 0.8;
                    const sy = drawY + Math.sin(backAngle) * r * 0.8 + off;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + Math.cos(backAngle) * 5, sy + Math.sin(backAngle) * 5);
                    ctx.stroke();
                }
            }

            // Damage flash overlay
            if (e.damageFlashTimer > 0 && !isDying) {
                ctx.fillStyle = `rgba(255,255,255,${e.damageFlashTimer / 0.1 * 0.6})`;
                this.drawEnemyShape(ctx, e, drawX, drawY, r);
                ctx.fill();
            }

            // Healer glow
            if (e.healRate > 0 && !isDying) {
                ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(drawX, drawY, e.healRadius * CELL, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Slow effect indicator
            if (e.slowTimer > 0 && !isDying) {
                ctx.strokeStyle = 'rgba(91, 155, 213, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 3, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Health bar (skip for dying enemies)
            if (!isDying && e.alive) {
                const barW = e.radius * 2.5;
                const barH = 3;
                const barX = drawX - barW / 2;
                const barY = drawY - e.radius - 8;
                const hpPct = e.hp / e.maxHP;
                const displayPct = e.displayHP / e.maxHP;

                // Background
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barW, barH);

                // Orange trailing bar (recent damage)
                if (displayPct > hpPct) {
                    ctx.fillStyle = '#e67e22';
                    ctx.fillRect(barX, barY, barW * displayPct, barH);
                }

                // Current HP bar
                ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f1c40f' : '#e74c3c';
                ctx.fillRect(barX, barY, barW * hpPct, barH);

                // Border outline
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(barX, barY, barW, barH);
            }

            ctx.globalAlpha = 1;
        }
    }

    drawTowerTurrets(ctx) {
        for (const tower of this.game.towers.towers) {
            const cx = tower.x;
            const cy = tower.y;

            // Pulsing glow for frost and lightning
            if (tower.type === 'frost' || tower.type === 'lightning') {
                const glowAlpha = 0.1 + Math.sin(tower.glowPhase) * 0.06;
                ctx.fillStyle = tower.type === 'frost'
                    ? `rgba(91,155,213,${glowAlpha})`
                    : `rgba(155,89,182,${glowAlpha})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                ctx.fill();
            }

            // Recoil offset
            const recoilAmount = tower.recoilTimer > 0 ? (tower.recoilTimer / 0.12) * 4 : 0;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tower.turretAngle);

            // Apply recoil (shift barrel backward)
            const recoilShift = -recoilAmount;

            switch (tower.type) {
                case 'arrow':
                    this.drawArrowTurret(ctx, recoilShift);
                    break;
                case 'cannon':
                    this.drawCannonTurret(ctx, recoilShift);
                    break;
                case 'frost':
                    this.drawFrostTurret(ctx, recoilShift);
                    break;
                case 'lightning':
                    this.drawLightningTurret(ctx, recoilShift);
                    break;
                case 'sniper':
                    this.drawSniperTurret(ctx, recoilShift, tower);
                    break;
                default:
                    // Fallback generic turret
                    ctx.fillStyle = tower.color;
                    ctx.fillRect(-6, -4, 12, 8);
                    ctx.fillRect(4 + recoilShift, -2, 10, 4);
                    break;
            }

            ctx.restore();

            // Level indicator
            if (tower.level > 0) {
                ctx.fillStyle = '#ffd700';
                for (let i = 0; i < tower.level; i++) {
                    ctx.beginPath();
                    ctx.arc(cx - 8 + i * 8, cy + 12, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    drawArrowTurret(ctx, recoil) {
        // Crossbow body
        ctx.fillStyle = '#4a7c3f';
        ctx.fillRect(-5, -4, 10, 8);

        // Crossbow arms (arc strokes)
        ctx.strokeStyle = '#3a6030';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, -1.2, -0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0.3, 1.2);
        ctx.stroke();

        // Bolt barrel
        ctx.fillStyle = '#5a8c4f';
        ctx.fillRect(4 + recoil, -1.5, 10, 3);

        // Arrowhead tip
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(14 + recoil, 0);
        ctx.lineTo(11 + recoil, -2.5);
        ctx.lineTo(11 + recoil, 2.5);
        ctx.closePath();
        ctx.fill();
    }

    drawCannonTurret(ctx, recoil) {
        // Wide squat body
        ctx.fillStyle = '#8b5e3c';
        ctx.fillRect(-7, -5, 12, 10);

        // Wide barrel
        ctx.fillStyle = '#7a4e2c';
        ctx.fillRect(3 + recoil, -4, 10, 8);

        // Muzzle ring
        ctx.strokeStyle = '#5a3e1c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(13 + recoil, 0, 4.5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Rivet details
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(-4, -3, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-4, 3, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFrostTurret(ctx, recoil) {
        // Diamond body
        ctx.fillStyle = '#5b9bd5';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();

        // Inner facet
        ctx.fillStyle = '#8ac4ff';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 4);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fill();

        // Barrel with frost lines
        ctx.fillStyle = '#5b9bd5';
        ctx.fillRect(5 + recoil, -1.5, 8, 3);

        // Frost emanation lines at tip
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 0.8;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(13 + recoil, i * 1.5);
            ctx.lineTo(16 + recoil, i * 2.5);
            ctx.stroke();
        }
    }

    drawLightningTurret(ctx, recoil) {
        // Central orb
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dda0dd';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Two extending prongs
        ctx.fillStyle = '#7b3ba6';
        ctx.fillRect(5 + recoil, -5, 8, 3);
        ctx.fillRect(5 + recoil, 2, 8, 3);

        // Jittery mini-arcs between prongs
        ctx.strokeStyle = '#e0b0ff';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            const sx = 7 + recoil + i * 3;
            ctx.beginPath();
            ctx.moveTo(sx, -3);
            const jx = (Math.random() - 0.5) * 3;
            ctx.lineTo(sx + jx, 0);
            ctx.lineTo(sx, 3);
            ctx.stroke();
        }
    }

    drawSniperTurret(ctx, recoil, tower) {
        // Body
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-5, -3, 10, 6);

        // Long thin barrel
        ctx.fillStyle = '#a93226';
        ctx.fillRect(4 + recoil, -1.5, 14, 3);

        // Scope circle
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(2, -5, 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(2, -5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle flash during recoil
        if (tower.recoilTimer > 0.06) {
            ctx.fillStyle = 'rgba(255,235,59,0.7)';
            ctx.beginPath();
            ctx.arc(18 + recoil, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawProjectiles(ctx) {
        for (const p of this.game.projectiles.projectiles) {
            if (!p.alive) continue;

            const color = p.getColor();

            // Trail
            if (p.trail.length > 1) {
                const trailWidth = p.towerType === 'cannon' ? 2
                    : p.towerType === 'lightning' ? 1.5
                    : p.towerType === 'sniper' ? 0.5
                    : 1;

                ctx.strokeStyle = color;
                ctx.lineWidth = trailWidth;
                ctx.globalAlpha = 0.4;

                if (p.towerType === 'lightning') {
                    // Jittery trail
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        const jx = (Math.random() - 0.5) * 4;
                        const jy = (Math.random() - 0.5) * 4;
                        ctx.lineTo(p.trail[i].x + jx, p.trail[i].y + jy);
                    }
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        ctx.lineTo(p.trail[i].x, p.trail[i].y);
                    }
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // Projectile body per type
            switch (p.towerType) {
                case 'arrow':
                    this.drawArrowProjectile(ctx, p, color);
                    break;
                case 'cannon':
                    this.drawCannonProjectile(ctx, p, color);
                    break;
                case 'frost':
                    this.drawFrostProjectile(ctx, p, color);
                    break;
                case 'lightning':
                    this.drawLightningProjectile(ctx, p, color);
                    break;
                case 'sniper':
                    this.drawSniperProjectile(ctx, p, color);
                    break;
                default:
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
    }

    drawArrowProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Shaft
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(1, -2.5);
        ctx.lineTo(1, 2.5);
        ctx.closePath();
        ctx.fill();

        // Fletching
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-4, -2);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-4, 2);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    drawCannonProjectile(ctx, p, color) {
        // Motion blur ellipse
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = 'rgba(80,50,20,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Dark circle
        ctx.fillStyle = '#4a3520';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x - 1, p.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFrostProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Diamond crystal
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(0, -3);
        ctx.lineTo(-4, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();

        // Inner facet
        ctx.fillStyle = '#cceeff';
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(0, -1.5);
        ctx.lineTo(-2, 0);
        ctx.lineTo(0, 1.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawLightningProjectile(ctx, p, color) {
        // Electric glow halo
        ctx.fillStyle = 'rgba(186, 104, 200, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Zigzag bolt shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(1, -3);
        ctx.lineTo(2, -1);
        ctx.lineTo(-2, -2);
        ctx.lineTo(-1, 1);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-1, 3);
        ctx.lineTo(-2, 1);
        ctx.lineTo(2, 2);
        ctx.lineTo(1, -1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawSniperProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Gradient streak
        const grad = ctx.createLinearGradient(-8, 0, 3, 0);
        grad.addColorStop(0, 'rgba(239,83,80,0)');
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        ctx.fillRect(-8, -1, 11, 2);

        // Bright tip dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(3, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawUIOverlay() {
        const ctx = this.uiCtx;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        const input = this.game.input;

        // Hover cell highlight
        if (input.hoverGx >= 0 && input.hoverGy >= 0) {
            const hx = input.hoverGx * CELL;
            const hy = input.hoverGy * CELL;

            if (input.selectedTowerType) {
                // Placement preview
                const canPlace = this.game.towers.canPlace(input.hoverGx, input.hoverGy);
                const def = TOWER_TYPES[input.selectedTowerType];
                ctx.fillStyle = canPlace ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)';
                ctx.fillRect(hx, hy, CELL, CELL);

                if (canPlace) {
                    // Range preview
                    const range = def.levels[0].range * CELL;
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(hx + CELL / 2, hy + CELL / 2, range, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(hx, hy, CELL, CELL);
            }
        }

        // Selected tower
        if (input.selectedTower) {
            const tower = input.selectedTower;
            const tx = tower.gx * CELL;
            const ty = tower.gy * CELL;

            // Selection box
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx, ty, CELL, CELL);

            // Range circle
            ctx.strokeStyle = 'rgba(255,215,0,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range * CELL, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}
