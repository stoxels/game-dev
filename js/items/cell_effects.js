//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// How long each cell-level effect class stays active (ms).
// Must stay in sync with the matching CSS animation durations.
const CELL_FX_DURATION = {
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
// touched by an item effect — independent of the overlay system.
//
// Types:
//   'reveal'   — green pulse  (tile revealed / row-col solved)
//   'mark'     — orange pulse (empty tile marked ✕ by item)
//   'erase'    — red pulse    (filled tile wiped by cursed item)
//   'artifact' — gold burst   (artifact / primer headstart)
//   'unmark'   — yellow fade  (✕ marks cleared by cursedReveal)
//
// Usage:
//   _applyCellEffect(['g-3-2', 'g-3-5'], 'reveal');

// Injects all cell-effect keyframes + classes into <head> once.
// Guards with a sentinel style tag so it never runs twice.
function _ensureCellEffectCSS() {
    if (document.getElementById('cell-effect-style')) return;

    const style = document.createElement('style');
    style.id = 'cell-effect-style';
    style.textContent = `
    /* Shared overlay layer — sits on top of the cell's real background
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
        0%   { background: rgba(46, 213, 115, 0.90); box-shadow: inset 0 0 0 2px #2ed573, 0 0 6px #2ed573; }
        50%  { background: rgba(46, 213, 115, 0.55); box-shadow: inset 0 0 0 1px #2ed573, 0 0 3px #2ed573; }
        100% { background: rgba(46, 213, 115, 0.00); box-shadow: none; }
    }
    .cell-fx-reveal::before {
        animation: cellRevealPulse 1.6s ease-out forwards;
    }

    /* mark: orange pulse (item placed a ✕) */
    @keyframes cellMarkPulse {
        0%   { background: rgba(255, 165, 0, 0.80); box-shadow: inset 0 0 0 2px #ffaa00; }
        50%  { background: rgba(255, 165, 0, 0.45); box-shadow: inset 0 0 0 1px #ffaa00; }
        100% { background: rgba(255, 165, 0, 0.00); box-shadow: none; }
    }
    .cell-fx-mark::before {
        animation: cellMarkPulse 1.6s ease-out forwards;
    }

    /* erase: red drain (cursed item wiped a filled tile) */
    @keyframes cellErasePulse {
        0%   { background: rgba(220, 50, 50, 0.85); box-shadow: inset 0 0 0 2px #ff3333; }
        40%  { background: rgba(180, 20, 20, 0.65); box-shadow: inset 0 0 0 2px #cc0000; }
        70%  { background: rgba(220, 50, 50, 0.40); box-shadow: inset 0 0 0 1px #ff3333; }
        100% { background: rgba(220, 50, 50, 0.00); box-shadow: none; }
    }
    .cell-fx-erase::before {
        animation: cellErasePulse 2.0s ease-out forwards;
    }

    /* artifact / primer: gold starburst */
    @keyframes cellArtifactPulse {
        0%   { background: rgba(255, 215, 0, 0.95); box-shadow: inset 0 0 0 2px #ffd700, 0 0 10px #ffd700; }
        40%  { background: rgba(255, 215, 0, 0.60); box-shadow: inset 0 0 0 1px #ffd700, 0 0 5px #ffd700; }
        100% { background: rgba(255, 215, 0, 0.00); box-shadow: none; }
    }
    .cell-fx-artifact::before {
        animation: cellArtifactPulse 1.8s ease-out forwards;
    }

    /* unmark: yellow fade (✕ marks cleared by cursedReveal) */
    @keyframes cellUnmarkPulse {
        0%   { background: rgba(255, 230, 50, 0.75); box-shadow: inset 0 0 0 2px #ffe632; }
        60%  { background: rgba(255, 230, 50, 0.35); box-shadow: inset 0 0 0 1px #ffe632; }
        100% { background: rgba(255, 230, 50, 0.00); box-shadow: none; }
    }
    .cell-fx-unmark::before {
        animation: cellUnmarkPulse 1.4s ease-out forwards;
    }

    @keyframes fx-shadow-seal-veil {
        0%   { background: rgba(0,0,0,0);    }
        60%  { background: rgba(0,0,0,0.55); }
        100% { background: rgba(0,0,0,0);    }
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
function _applyCellEffect(cellIds, type) {
    if (!cellIds.length) return;
    _ensureCellEffectCSS();

    const cls = `cell-fx-${type}`;
    const duration = CELL_FX_DURATION[type] || 1800;

    // Add class (reflow trick restarts animation if already running)
    cellIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove(cls);
        void el.offsetWidth; // force reflow
        el.classList.add(cls);
    });

    // Clean up after animation completes
    setTimeout(() => {
        cellIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove(cls);
        });
    }, duration);
}