//------------------------------------------------------------------------
// PHASE 3 (step 9): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { playItemEffect } from './fx-dispatch.js';
import { FX_Z, _fxClock, _fxGetPuzzleRect, _fxMakeGoldTintFill, _fxOverlay } from './shared/fx-helpers.js';

//------------------------------------------------------------------------
//-------------------GOLDEN CLOCK----------------------
//------------------------------------------------------------------------

// goldenClock - halts the timer until 3 more mistakes are made.
export function _useGoldenClock(id, def) {
    window.STOX_FLAGS.goldenClockActive = true;
    window._goldenClockMistakesLeft = 3;
    playItemEffect(id);

    // Update the mistake display so the player immediately sees the limit
    globalThis._setMistakeCounterText(' 🕰️');

    return `${def.icon} ${t('itm_golden_clock_active')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// 🕰️ Golden Clock - clock effect + persistent golden tint.
export function _fxGoldenClock() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    // Reuse the standard clock visual, then layer a gold tint on top
    _fxClock();

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.base - 1};`);
    _fxMakeGoldTintFill(overlay, r);

    Audio_Manager.playSFX('golden_clock');
}
