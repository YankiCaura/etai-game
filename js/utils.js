import { CELL } from './constants.js';

export function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function angle(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

export function gridToWorld(gx, gy) {
    return {
        x: gx * CELL + CELL / 2,
        y: gy * CELL + CELL / 2,
    };
}

export function worldToGrid(wx, wy) {
    return {
        x: Math.floor(wx / CELL),
        y: Math.floor(wy / CELL),
    };
}

export function randRange(min, max) {
    return min + Math.random() * (max - min);
}

export function hexToGL(hex) {
    return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255,
    ];
}
