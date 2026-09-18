import { Audio_Manager } from '../../audio/audio.js';
import { t } from '../../translation/translations.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { FX_Z, _fxClock, _fxGetPuzzleRect, _fxMakeGoldTintFill, _fxOverlay } from '../../puzzle-mechanics/fx-helpers.js';
import { _trackWitchImmuneCursedUse } from '../shared/quest-tracking.js';

//------------------------------------------------------------------------
//-------------------CHRONO FRACTURE--------------------------------------
//------------------------------------------------------------------------

// chronoFracture - speeds up time itself: the level timer drains 3 extra
// seconds per tick and every ability cooldown ticks down twice as fast.
// The flag lives on `window` because the level-reset code in
// class-abilities.js clears it (and several sibling flags) on every new level.
export function _useChronoFracture(id, def) {
    window._chronoFractureActive = true;
    _trackWitchImmuneCursedUse();
    playItemEffect(id);
    return `${def.icon} ${t('itm_chronofracture_active')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// ⏰ Chrono Fracture - standard clock burst with an extra gold tint layer.
// Reuses the golden-clock SFX (both items are "time distorted" themed).
export function _fxChronoFracture() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    // Reuse the standard clock visual, then layer a gold tint on top
    _fxClock();

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.base - 1};`);
    _fxMakeGoldTintFill(overlay, r);

    Audio_Manager.playSFX('golden_clock');
}
