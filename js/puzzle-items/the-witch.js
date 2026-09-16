//------------------------------------------------------------------------
// PHASE 3 (step 9): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { Audio_Manager } from '../audio/audio.js';
import { _trackTimerDelta, updTimer } from '../timer.js';
import { t } from '../translation/translations.js';
import { playItemEffect } from './fx-dispatch.js';
import { FX_Z, PARTICLES, _fxGetPuzzleRect, _fxMakeIcon, _fxOverlay, _fxSpawnParticles } from './shared/fx-helpers.js';
import { showToast } from './toasts-and-popups.js';

//------------------------------------------------------------------------
//-------------------THE WITCH----------------------
//------------------------------------------------------------------------

// theWitch - pays −10 min upfront in exchange for 60 s of full cursed
// immunity (makes subsequent cursed items downside-free for that window).
export function _useTheWitch(id, def) {
    const before = globalThis.timerSecs;
    globalThis.timerSecs = Math.max(0, globalThis.timerSecs - 600);
    _trackTimerDelta(before, globalThis.timerSecs);
    updTimer();

    window.STOX_FLAGS.cursedImmune = true;
    playItemEffect(id);
    showToast(`🧙 ${t('itm_witch_immunity')}`);

    setTimeout(() => {
        window.STOX_FLAGS.cursedImmune = false;
        showToast(`🧙 ${t('itm_witch_faded')}`);
    }, 60000);

    return ''; // toast was already shown above
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// 🧙 The Witch - purple smoky swirl of arcane particles.
export function _fxTheWitch() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 2000, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxSpawnParticles({
        ...PARTICLES.witchSmoke,
        count: 24, sizeMin: 12, sizeMax: 22,
        container: overlay,
        startX: cx, startY: cy,
        spreadX: r.width * 0.9, spreadY: r.height * 0.9,
        duration: 1400, cssClass: 'fx-artifact-star',
    });

    _fxMakeIcon(r.wrap, '🧙', cx, cy, 80, 'animation:fx-skull-rise 1.2s ease-out forwards;', 1600);

    Audio_Manager.playSFX('the_witch');
}
