import { COLS, ROWS, CELL, CELL_TYPE, WAYPOINTS, BLOCKED_CELLS } from './constants.js';
import { gridToWorld } from './utils.js';

// Simple deterministic hash for procedural decoration
function seedRand(x, y, i) {
    let h = (x * 374761 + y * 668265 + i * 982451) & 0x7fffffff;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    return (h & 0xffff) / 0xffff;
}

export class GameMap {
    constructor() {
        this.grid = [];
        this.path = [];        // world-coordinate waypoints
        this.pathCells = new Set(); // "x,y" strings for fast lookup
        this.buildGrid();
    }

    buildGrid() {
        // Initialize all cells as buildable
        this.grid = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => CELL_TYPE.BUILDABLE)
        );

        // Carve path between waypoints
        for (let i = 0; i < WAYPOINTS.length - 1; i++) {
            const a = WAYPOINTS[i];
            const b = WAYPOINTS[i + 1];
            this.carveLine(a.x, a.y, b.x, b.y);
        }

        // Mark blocked cells
        for (const c of BLOCKED_CELLS) {
            if (c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS) {
                if (this.grid[c.y][c.x] !== CELL_TYPE.PATH) {
                    this.grid[c.y][c.x] = CELL_TYPE.BLOCKED;
                }
            }
        }

        // Build world-coordinate path
        this.path = WAYPOINTS.map(wp => gridToWorld(wp.x, wp.y));
    }

    carveLine(x0, y0, x1, y1) {
        // Carve a straight line (horizontal or vertical)
        const dx = Math.sign(x1 - x0);
        const dy = Math.sign(y1 - y0);
        let x = x0, y = y0;
        while (true) {
            if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
                this.grid[y][x] = CELL_TYPE.PATH;
                this.pathCells.add(`${x},${y}`);
            }
            if (x === x1 && y === y1) break;
            if (x !== x1) x += dx;
            else y += dy;
        }
    }

    isPath(gx, gy) {
        return this.pathCells.has(`${gx},${gy}`);
    }

    isBuildable(gx, gy) {
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
        return this.grid[gy][gx] === CELL_TYPE.BUILDABLE;
    }

    getCellType(gx, gy) {
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return CELL_TYPE.BLOCKED;
        return this.grid[gy][gx];
    }

    drawTerrain(ctx) {
        ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const px = x * CELL;
                const py = y * CELL;
                const type = this.grid[y][x];

                if (type === CELL_TYPE.PATH) {
                    this.drawPathCell(ctx, px, py, x, y);
                } else if (type === CELL_TYPE.BLOCKED) {
                    this.drawGrassCell(ctx, px, py, x, y);
                    this.drawObstacle(ctx, px, py, x, y);
                } else {
                    this.drawGrassCell(ctx, px, py, x, y);
                }
            }
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL, 0);
            ctx.lineTo(x * CELL, ROWS * CELL);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL);
            ctx.lineTo(COLS * CELL, y * CELL);
            ctx.stroke();
        }
    }

    drawGrassCell(ctx, px, py, gx, gy) {
        // Base grass with deterministic shade variation
        const shade = seedRand(gx, gy, 0);
        const g = Math.floor(140 + shade * 20 - 10); // 130-150
        const r = Math.floor(74 + shade * 10 - 5);
        ctx.fillStyle = `rgb(${r},${g},63)`;
        ctx.fillRect(px, py, CELL, CELL);

        // Grass blades (3-5 per cell)
        const bladeCount = 3 + Math.floor(seedRand(gx, gy, 1) * 3);
        ctx.strokeStyle = `rgba(${r + 15},${g + 20},80,0.5)`;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < bladeCount; i++) {
            const bx = px + seedRand(gx, gy, 10 + i) * (CELL - 4) + 2;
            const by = py + CELL - 2;
            const height = 4 + seedRand(gx, gy, 20 + i) * 6;
            const lean = (seedRand(gx, gy, 30 + i) - 0.5) * 6;

            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(bx + lean * 0.5, by - height * 0.6, bx + lean, by - height);
            ctx.stroke();
        }
    }

    drawPathCell(ctx, px, py, gx, gy) {
        // Base dirt color
        ctx.fillStyle = '#c8a96e';
        ctx.fillRect(px, py, CELL, CELL);

        // Dirt speckle texture
        const speckleCount = 4 + Math.floor(seedRand(gx, gy, 0) * 4);
        for (let i = 0; i < speckleCount; i++) {
            const sx = px + seedRand(gx, gy, 40 + i) * (CELL - 4) + 2;
            const sy = py + seedRand(gx, gy, 50 + i) * (CELL - 4) + 2;
            const shade = seedRand(gx, gy, 60 + i);
            ctx.fillStyle = shade > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
            const sw = 1 + seedRand(gx, gy, 70 + i) * 2;
            ctx.fillRect(sx, sy, sw, sw);
        }

        // Dark edge borders where path meets non-path
        const edgeW = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        // Check each neighbor
        if (!this.isPath(gx, gy - 1)) ctx.fillRect(px, py, CELL, edgeW);       // top
        if (!this.isPath(gx, gy + 1)) ctx.fillRect(px, py + CELL - edgeW, CELL, edgeW); // bottom
        if (!this.isPath(gx - 1, gy)) ctx.fillRect(px, py, edgeW, CELL);       // left
        if (!this.isPath(gx + 1, gy)) ctx.fillRect(px + CELL - edgeW, py, edgeW, CELL); // right
    }

    drawObstacle(ctx, px, py, gx, gy) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const seed = gx + gy;

        if (seed % 2 === 0) {
            // Rock — irregular polygon with 6 vertices
            const baseRadius = 9;
            ctx.fillStyle = '#6b7b7d';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 * i) / 6;
                const r = baseRadius * (0.7 + seedRand(gx, gy, i) * 0.5);
                const rx = cx + Math.cos(a) * r;
                const ry = cy + 2 + Math.sin(a) * r * 0.75;
                if (i === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.fill();

            // Highlight facet
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            const ha = (Math.PI * 2 * 0) / 6;
            const ha2 = (Math.PI * 2 * 1) / 6;
            const r0 = baseRadius * (0.7 + seedRand(gx, gy, 0) * 0.5);
            const r1 = baseRadius * (0.7 + seedRand(gx, gy, 1) * 0.5);
            ctx.moveTo(cx, cy + 2);
            ctx.lineTo(cx + Math.cos(ha) * r0, cy + 2 + Math.sin(ha) * r0 * 0.75);
            ctx.lineTo(cx + Math.cos(ha2) * r1, cy + 2 + Math.sin(ha2) * r1 * 0.75);
            ctx.closePath();
            ctx.fill();

            // Small accent stone
            const acx = cx + 7 * (seedRand(gx, gy, 7) > 0.5 ? 1 : -1);
            const acy = cy + 6;
            ctx.fillStyle = '#8a9a9c';
            ctx.beginPath();
            ctx.ellipse(acx, acy, 3, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Tree — shadow ellipse first
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(cx + 1, cy + 11, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trunk with bark lines
            ctx.fillStyle = '#5d4e37';
            ctx.fillRect(cx - 2, cy, 4, 12);
            // Bark texture
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 3; i++) {
                const ly = cy + 2 + i * 3;
                ctx.beginPath();
                ctx.moveTo(cx - 1.5, ly);
                ctx.lineTo(cx + 1.5, ly + 1);
                ctx.stroke();
            }

            // Layered canopy (3 circles, dark to light)
            const canopyColors = ['#1e8c3a', '#27ae60', '#2ecc71'];
            const offsets = [
                { x: -3, y: -3, r: 9 },
                { x: 2, y: -5, r: 8 },
                { x: 0, y: -7, r: 7 },
            ];
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = canopyColors[i];
                ctx.beginPath();
                ctx.arc(cx + offsets[i].x, cy + offsets[i].y, offsets[i].r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
