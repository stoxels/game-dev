import { Audio_Manager } from '../../audio/audio.js';
import { t } from '../../translation/translations.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { _resolveCursedBlackoutDownside } from '../shared/cursed-downside.js';
import { CHAOS_BLAST_COLOURS, FX_Z, PARTICLES, _fxGetPuzzleRect, _fxMakeElement, _fxMakeIcon, _fxOverlay, _fxSpawnParticles } from '../../puzzle-mechanics/fx-helpers.js';
import { solveCols, solveRows } from '../../puzzle-mechanics/grid-actions.js';
import { _trackWitchImmuneCursedUse } from '../shared/quest-tracking.js';

//------------------------------------------------------------------------
//-------------------CURSED ROW COL - CHAOS GRID---------------------------
//------------------------------------------------------------------------

// cursedRowCol - solves 4 rows and 4 cols; downside blacks out column
// clues for 45 s (before reductions/immunity). Unlike the erase/downside
// items, no pre-solve snapshot is needed: the blackout targets clue
// headers, not tiles, and _applyBlackoutDownside no-ops itself when the
// duration resolves to 0 (immunity / Curse Embrace / Veil of Purity).
export function _useCursedRowCol(id, def) {
    _trackWitchImmuneCursedUse();

    const rowsRevealed = solveRows(4, 'item');
    const colsRevealed = solveCols(4, 'item');

    // Arguments are (durationMs, blackoutRows, blackoutCols) - cols only.
    _resolveCursedBlackoutDownside(45000, false, true);

    playItemEffect(id);
    globalThis.checkWin();
    return `💥 ${t('item_cursed_rowcol_both').replace('{r}', rowsRevealed).replace('{c}', colsRevealed)}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: detonates one explosion blast + shrapnel at a random grid position.
// Blast colour is drawn from CHAOS_BLAST_COLOURS so each detonation differs.
export function _fxDetonateBlast(container, r) {
    const blastColor = CHAOS_BLAST_COLOURS[Math.floor(Math.random() * CHAOS_BLAST_COLOURS.length)];
    const blast = _fxMakeElement(container, `
        position:absolute;
        left:${r.left + Math.random() * r.width}px;
        top:${r.top + Math.random() * r.height}px;
        --blast-color:${blastColor};
        animation:fx-chaos-explode 0.5s ease-out forwards;
    `, 'fx-chaos-blast');

    // Shrapnel particles radiating from the blast origin
    _fxSpawnParticles({
        ...PARTICLES.chaosShrapnel,
        colors: [blastColor, '#fff'],
        count: 8, sizeMin: 8, sizeMax: 16,
        container,
        startX: parseFloat(blast.style.left),
        startY: parseFloat(blast.style.top),
        spreadX: 50, spreadY: 50,
        duration: 600, cssClass: 'fx-chaos-shard',
    });
}

// 💥 Chaos Grid - multicolour explosions detonate across the entire grid.
export function _fxChaosGrid() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2200, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // Eight blasts staggered across ~1.4 s
    for (let i = 0; i < 8; i++) {
        setTimeout(() => _fxDetonateBlast(overlay, r), i * 180);
    }
    // Icon reuses the artifact-icon keyframe (same pop-and-fade shape).
    _fxMakeIcon(r.wrap, '💥', cx, cy, 80,
        `z-index:${FX_Z.supreme}; animation:fx-artifact-icon 1.2s ease-out forwards;`, 1600);

    Audio_Manager.playSFX('chaos_grid');
}
