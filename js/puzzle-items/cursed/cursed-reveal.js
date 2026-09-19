import { Audio_Manager } from '../../audio/audio.js';
import { revealTiles } from '../../puzzle-mechanics/grid-actions.js';
import { renderCell } from '../../grid.js';
import { questStat_revealItemUsed } from '../../inference/inference-stats.js';
import { t } from '../../translation/translations.js';
import { _applyCellEffect } from '../../puzzle-mechanics/cell-fx.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { _cursedDownsideSuppressed } from '../../puzzle-mechanics/cursed-downside.js';
import { FX_Z, PARTICLES, _fxGetPuzzleRect, _fxMakeElement, _fxMakeIcon, _fxOverlay, _fxSpawnParticles } from '../../puzzle-mechanics/fx-helpers.js';
import { _trackWitchImmuneCursedUse } from '../../puzzle-mechanics/quest-tracking.js';
import { cur } from '../../state.js';

//------------------------------------------------------------------------
//-------------------CURSED REVEAL - CURSED LENS---------------------------
//------------------------------------------------------------------------

// cursedReveal - reveals 6 cells; downside clears all wrong marks.
export function _useCursedReveal(id, def) {
    _trackWitchImmuneCursedUse();
    questStat_revealItemUsed();

    revealTiles(6, 'item');

    // Route the downside through the shared curse helpers so Witch immunity,
    // Curse Embrace and Veil of Purity apply here too. Full suppression means
    // the downside is skipped (the helper also handles the Veil-of-Purity
    // toast); the mark-clear itself is already maximal, so amplification
    // cannot grow it - only trigger the break toast.
    const protectedFromDownside = _cursedDownsideSuppressed();
    if (protectedFromDownside) {
        playItemEffect(id);
        return `☠️ ${t('itm_cursed_reveal_protected')}`;
    }

    // Downside: clear every wrong mark the player has placed, with the
    // yellow 'unmark' cell effect on each cleared cell.
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const unmarked = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (globalThis.userGrid[r][c] === 2) {
                globalThis.userGrid[r][c] = 0;
                renderCell(r, c);
                unmarked.push(`g-${r}-${c}`);
            }
        }
    }
    _applyCellEffect(unmarked, 'unmark');

    playItemEffect(id);
    return `☠️ ${t('item_cursed_reveal_both')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the sickly green tint rect over the grid.
// Must be created after _fxOverlay() - it anchors to the overlay.
export function _fxMakeCursedTint(container, r) {
    _fxMakeElement(container, `
        position:absolute;
        left:${r.left}px; top:${r.top}px;
        width:${r.width}px; height:${r.height}px;
    `, 'fx-cursed-tint');
}

// ☠️ Cursed Reveal - sickly green skull flash + ✕ marks dissolve.
export function _fxCursedReveal() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeCursedTint(overlay, r);
    _fxMakeIcon(r.wrap, '☠️', cx, cy, 72, 'animation:fx-skull-rise 1.1s ease-out forwards;', 1400);

    // Dissolving ✕ particles burst from the centre
    _fxSpawnParticles({
        ...PARTICLES.cursedCrosses,
        count: 16, sizeMin: 16, sizeMax: 26,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width, spreadY: r.height,
        duration: 900, cssClass: 'fx-cursed-cross',
    });

    Audio_Manager.playSFX('cursed_lens');
}
