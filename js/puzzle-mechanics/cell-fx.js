import { _onProgrammaticReveal } from '../combat/combat-class-projectiles-reveal.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// How long each cell-level effect class stays active (ms).
// Must stay in sync with the matching CSS animation durations.
// Ring colour per effect type, and how long the cascade waits between cells.
const CELL_FX_COLORS = { reveal: '#2ed573', mark: '#ffaa00', erase: '#ff3333', artifact: '#ffd700', unmark: '#ffe632' };
const CELL_FX_STAGGER_MS = 40;
const CELL_FX_STAGGER_MAX_MS = 600;

export const CELL_FX_DURATION = {
    reveal: 1700,
    mark: 1700,
    erase: 2100,
    artifact: 1900,
    unmark: 1500,
};

//------------------------------------------------------------------------
//-------------------CSS INJECTION HELPERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
// A unified lingering animation applied directly to grid cells
// touched by an item effect - independent of the overlay system.
//
// Types: 'reveal' (green pulse), 'mark' (orange pulse for placed ✕),
// 'erase' (red pulse for wiped filled tile), 'artifact' (gold burst),
// 'unmark' (yellow fade for cleared ✕ marks).
//
// Usage: _applyCellEffect(['g-3-2', 'g-3-5'], 'reveal');

// Injects all cell-effect keyframes + classes into <head> once.
// Guards with a sentinel style tag so it never runs twice.
export function _ensureCellEffectCSS() {
    if (document.getElementById('cell-effect-style')) return;

    const style = document.createElement('style');
    style.id = 'cell-effect-style';
    style.textContent = `
    /* Shared overlay layer - sits on top of the cell's real background
       instead of replacing it, so fading out never exposes whatever is
       behind the grid (e.g. the level background image). */
    .cell-fx-reveal,
    .cell-fx-mark,
    .cell-fx-erase,
    .cell-fx-artifact,
    .cell-fx-unmark {
        pointer-events: none;
    }
    .cell-fx-reveal::before,
    .cell-fx-mark::before,
    .cell-fx-erase::before,
    .cell-fx-artifact::before,
    .cell-fx-unmark::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    /* reveal: green glow sweeping in */
    @keyframes cellRevealPulse {
        0%   { background: rgba(190, 255, 215, 0.95); box-shadow: inset 0 0 0 2px #fff, inset 0 0 14px 4px #2ed573, 0 0 12px 2px #2ed573; }
        20%  { background: rgba(46, 213, 115, 0.85); box-shadow: inset 0 0 0 2px #2ed573, 0 0 8px #2ed573; }
        50%  { background: rgba(46, 213, 115, 0.55); box-shadow: inset 0 0 0 1px #2ed573, 0 0 3px #2ed573; }
        100% { background: rgba(46, 213, 115, 0.00); box-shadow: none; }
    }
    .cell-fx-reveal::before {
        animation: cellRevealPulse 1.6s ease-out var(--cfx-d, 0s) forwards;
    }

    /* mark: orange pulse (item placed a ✕) */
    @keyframes cellMarkPulse {
        0%   { background: rgba(255, 225, 160, 0.95); box-shadow: inset 0 0 0 2px #fff, inset 0 0 14px 4px #ffaa00, 0 0 12px 2px #ffaa00; }
        20%  { background: rgba(255, 165, 0, 0.80); box-shadow: inset 0 0 0 2px #ffaa00; }
        50%  { background: rgba(255, 165, 0, 0.45); box-shadow: inset 0 0 0 1px #ffaa00; }
        100% { background: rgba(255, 165, 0, 0.00); box-shadow: none; }
    }
    .cell-fx-mark::before {
        animation: cellMarkPulse 1.6s ease-out var(--cfx-d, 0s) forwards;
    }

    /* erase: red drain (cursed item wiped a filled tile) */
    @keyframes cellErasePulse {
        0%   { background: rgba(255, 170, 170, 0.95); box-shadow: inset 0 0 0 2px #fff, inset 0 0 14px 4px #ff3333, 0 0 12px 2px #ff3333; }
        15%  { background: rgba(220, 50, 50, 0.85); box-shadow: inset 0 0 0 2px #ff3333; }
        40%  { background: rgba(180, 20, 20, 0.65); box-shadow: inset 0 0 0 2px #cc0000; }
        70%  { background: rgba(220, 50, 50, 0.40); box-shadow: inset 0 0 0 1px #ff3333; }
        100% { background: rgba(220, 50, 50, 0.00); box-shadow: none; }
    }
    .cell-fx-erase::before {
        animation: cellErasePulse 2.0s ease-out var(--cfx-d, 0s) forwards;
    }

    /* artifact / primer: gold starburst */
    @keyframes cellArtifactPulse {
        0%   { background: rgba(255, 250, 200, 0.98); box-shadow: inset 0 0 0 2px #fff, inset 0 0 16px 5px #ffd700, 0 0 16px 3px #ffd700; }
        20%  { background: rgba(255, 215, 0, 0.90); box-shadow: inset 0 0 0 2px #ffd700, 0 0 10px #ffd700; }
        40%  { background: rgba(255, 215, 0, 0.60); box-shadow: inset 0 0 0 1px #ffd700, 0 0 5px #ffd700; }
        100% { background: rgba(255, 215, 0, 0.00); box-shadow: none; }
    }
    .cell-fx-artifact::before {
        animation: cellArtifactPulse 1.8s ease-out var(--cfx-d, 0s) forwards;
    }

    /* unmark: yellow fade (✕ marks cleared by cursedReveal) */
    @keyframes cellUnmarkPulse {
        0%   { background: rgba(255, 250, 170, 0.95); box-shadow: inset 0 0 0 2px #fff, inset 0 0 12px 3px #ffe632, 0 0 10px 2px #ffe632; }
        20%  { background: rgba(255, 230, 50, 0.75); box-shadow: inset 0 0 0 2px #ffe632; }
        60%  { background: rgba(255, 230, 50, 0.35); box-shadow: inset 0 0 0 1px #ffe632; }
        100% { background: rgba(255, 230, 50, 0.00); box-shadow: none; }
    }
    .cell-fx-unmark::before {
        animation: cellUnmarkPulse 1.4s ease-out var(--cfx-d, 0s) forwards;
    }

    /* A coloured ring that expands out of every touched cell, and a quick
       pop of the cell itself. Ring colour comes from the effect type. */
    .cell-fx-ring {
        position: absolute; inset: 0; pointer-events: none; z-index: 3;
        border: 2px solid var(--cfx-c, #fff); border-radius: 4px;
        box-shadow: 0 0 8px var(--cfx-c, #fff), inset 0 0 6px var(--cfx-c, #fff);
        opacity: 0;
        animation: cellFxRing 0.75s ease-out var(--cfx-d, 0s) forwards;
    }
    @keyframes cellFxRing {
        0%   { transform: scale(0.55); opacity: 0.95; }
        100% { transform: scale(1.55); opacity: 0; }
    }
    .cell-fx-reveal, .cell-fx-artifact { animation: cellFxPop 0.5s cubic-bezier(.3,1.6,.5,1) var(--cfx-d, 0s); }
    .cell-fx-mark, .cell-fx-erase, .cell-fx-unmark { animation: cellFxShake 0.4s ease-out var(--cfx-d, 0s); }
    @keyframes cellFxPop {
        0%   { transform: scale(1); }
        40%  { transform: scale(1.22); }
        100% { transform: scale(1); }
    }
    @keyframes cellFxShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-2px) rotate(-3deg); }
        40% { transform: translateX(2px) rotate(3deg); }
        60% { transform: translateX(-1px) rotate(-2deg); }
        80% { transform: translateX(1px) rotate(1deg); }
    }
`;
    document.head.appendChild(style);
}

//------------------------------------------------------------------------
//-------------------CORE LOGIC (MAIN ENTRY POINT)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies the named cell-effect class to each listed cell id,
// then strips the class once the animation finishes.
// Forces a DOM reflow before re-adding the class so rapid
// reuse on the same cell always restarts the animation cleanly.
export function _applyCellEffect(cellIds, type, source, projectileOpts) {
    if (!cellIds.length) return;
    _ensureCellEffectCSS();

    // Programmatic reveals (items, passives, class abilities) feed the
    // endgame projectile system - guarded, so it is a no-op outside endgame.
    // `projectileOpts` (optional) goes along to the volley; { skip: true }
    // shows the glow without shooting (a friend's fill that should not hit).
    if (type === 'reveal' && typeof _onProgrammaticReveal === 'function' && !(projectileOpts && projectileOpts.skip)) {
        _onProgrammaticReveal(cellIds, source, projectileOpts);
    }

    const cls = `cell-fx-${type}`;
    const duration = CELL_FX_DURATION[type] || 1800;

    // Several cells at once ripple one after another instead of all together.
    const step = Math.min(CELL_FX_STAGGER_MS, CELL_FX_STAGGER_MAX_MS / Math.max(1, cellIds.length));
    const color = CELL_FX_COLORS[type] || '#fff';
    const rings = [];

    // Add class (reflow trick restarts animation if already running)
    cellIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove(cls);
        void el.offsetWidth; // force reflow
        el.style.setProperty('--cfx-d', (i * step / 1000).toFixed(3) + 's');
        el.style.setProperty('--cfx-c', color);
        el.classList.add(cls);
        const ring = document.createElement('i');
        ring.className = 'cell-fx-ring';
        el.appendChild(ring);
        rings.push(ring);
    });

    // Clean up after animation completes
    setTimeout(() => {
        rings.forEach(ring => ring.remove());
        cellIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove(cls);
            el.style.removeProperty('--cfx-d');
            el.style.removeProperty('--cfx-c');
        });
    }, duration + cellIds.length * step);
}
