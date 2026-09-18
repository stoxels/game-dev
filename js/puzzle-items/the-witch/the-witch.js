import { Audio_Manager } from '../../audio/audio.js';
import { subtractTimeSecs } from '../../puzzle-mechanics/timer-adjust.js';
import { t } from '../../translation/translations.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { FX_Z, PARTICLES, _fxGetPuzzleRect, _fxMakeIcon, _fxOverlay, _fxSpawnParticles } from '../../puzzle-mechanics/fx-helpers.js';
import { showToast } from '../../puzzle-mechanics/toasts-and-popups.js';

//------------------------------------------------------------------------
//-------------------THE WITCH----------------------
//------------------------------------------------------------------------

// theWitch - pays −10 min upfront in exchange for 60 s of full cursed
// immunity (makes subsequent cursed items downside-free for that window).
export function _useTheWitch(id, def) {
    subtractTimeSecs(600);

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
