import { Audio_Manager } from '../../audio/audio.js';
import { revealTiles } from '../../puzzle-mechanics/grid-actions.js';
import { t } from '../../translation/translations.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { _resolveCursedBlackoutDownside } from '../../puzzle-mechanics/cursed-downside.js';
import { FX_Z, _fxGetPuzzleRect, _fxMakeElement, _fxMakeItemIcon, _fxOverlay, _fxShieldBorderAdd } from '../../puzzle-mechanics/fx-helpers.js';
import { _trackWitchImmuneCursedUse } from '../../puzzle-mechanics/quest-tracking.js';

//------------------------------------------------------------------------
//-------------------CURSED SHIELD - DEMON EYE-----------------------------
//------------------------------------------------------------------------

// cursedShield - activates shield and reveals 2 cells; downside blacks
// out row clues for 30 s (before reductions/immunity). Arguments of
// _resolveCursedBlackoutDownside are (durationMs, blackoutRows, blackoutCols).
// The shield flag is multi-writer game state (freeze item, plain shield,
// level reset) and is consumed via the shield-absorb intercepts, so it
// stays on the shared state object rather than a module-local.
export function _useCursedShield(id, def) {
    _trackWitchImmuneCursedUse();

    globalThis.shieldActive = true;
    revealTiles(2, 'item');
    playItemEffect(id);

    // Black out rows only - mirrors the col-only blackout of cursedRowCol.
    _resolveCursedBlackoutDownside(30000, true, false);

    return `👁️ ${t('item_cursed_shield_both')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: creates the dark-red scan lines that creep down the grid.
// Five bands, staggered top-to-bottom, timed to land after the eye opens.
export function _fxMakeEyeScanLines(container, r) {
    for (let i = 0; i < 5; i++) {
        _fxMakeElement(container, `
            position:absolute;
            left:${r.left}px; width:${r.width}px;
            top:${r.top + (r.height / 5) * i}px; height:${r.height / 5}px;
            animation:fx-scanline-darken 0.5s ease-in ${0.6 + i * 0.1}s forwards;
        `, 'fx-eye-scanline');
    }
}

// 👁️ Cursed Shield - demonic eye opens, then rows black out.
export function _fxCursedShield() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1600, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeEyeScanLines(overlay, r);
    _fxMakeItemIcon(r.wrap, 'cursedShield', '👁️', cx, cy, 80, 'animation:fx-eye-open 1.3s ease-out forwards;', 1800);

    _fxShieldBorderAdd();

    Audio_Manager.playSFX('demon_eye');
}
