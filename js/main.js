import { Game } from './game.js';

function fitGameToViewport() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Natural height of the container (top bar + canvas + bottom bar)
    // Reset transform first to measure natural size
    container.style.transform = 'none';
    container.style.marginBottom = '0';
    const naturalH = container.offsetHeight;
    const naturalW = 1680;

    const scale = Math.min(vw / naturalW, vh / naturalH, 1);

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top center';
    // Compensate for transform not affecting layout flow
    const shrunkBy = naturalH * (1 - scale);
    container.style.marginBottom = `-${shrunkBy}px`;
}

document.addEventListener('DOMContentLoaded', () => {
    const canvases = {
        terrain: document.getElementById('terrain-canvas'),
        game: document.getElementById('game-canvas'),
        ui: document.getElementById('ui-canvas'),
        fx: document.getElementById('fx-canvas'),
        three: document.getElementById('three-canvas'),
    };

    const game = new Game(canvases);
    game.run();

    // Expose for debugging
    window.game = game;

    // Responsive scaling
    fitGameToViewport();
    window.addEventListener('resize', fitGameToViewport);
    window.addEventListener('orientationchange', () => {
        // Delay to let the browser settle after orientation change
        setTimeout(fitGameToViewport, 100);
    });
});
