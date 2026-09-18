import { Audio_Manager } from '../../audio/audio.js';
import { _egMapTimeGainMult } from '../../endgame/endgame-map-launch.js';
import { addTimeSecs } from '../../puzzle-mechanics/timer-adjust.js';
import { t } from '../../translation/translations.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { _resolveCursedBlackoutDownside } from '../shared/cursed-downside.js';
import { FX_Z, _fxGetPuzzleRect, _fxMakeElement, _fxMakeIcon, _fxOverlay } from '../../puzzle-mechanics/fx-helpers.js';
import { _trackWitchImmuneCursedUse } from '../shared/quest-tracking.js';

//------------------------------------------------------------------------
//-------------------CURSED TIME - CURSED CLOCK---------------------------
//------------------------------------------------------------------------

// cursedTime - adds 20 min to the timer; downside blacks out all clues for
// 30 s (before reductions/immunity). Arguments of _resolveCursedBlackoutDownside
// are (durationMs, blackoutRows, blackoutCols) - here both axes at once.
// The timer is multi-writer game state (pause, tick, other time items), so the
// update goes through globalThis.timerSecs with _trackTimerDelta bookkeeping.
export function _useCursedTime(id, def) {
    _trackWitchImmuneCursedUse();

    const mapTimeMult = (typeof _egMapTimeGainMult === 'function') ? _egMapTimeGainMult() : 1;
    addTimeSecs(Math.round(1200 * mapTimeMult));
    playItemEffect(id);

    // Black out every clue axis - the harshest cursed downside of the family.
    _resolveCursedBlackoutDownside(30000, true, true);
    return `💀 ${t('item_cursed_time_both')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// Helper: spawns dark fog tendrils blooming from each corner.
// One tendril per corner (4 total), each delayed by 0.15 s so they cascade.
function _fxMakeFogTendrils(container, r) {
    const corners = [
        { top: r.top, left: r.left },
        { top: r.top, left: r.right },
        { top: r.bottom, left: r.left },
        { top: r.bottom, left: r.right },
    ];
    corners.forEach((pos, i) => {
        _fxMakeElement(container, `
            position:absolute;
            left:${pos.left}px; top:${pos.top}px;
            animation:fx-fog-bloom 1.2s ease-out ${i * 0.15}s forwards;
        `, 'fx-cursed-fog');
    });
}

// 💀 Cursed Time - dark miasma + clock hands spin wildly.
export function _fxCursedTime() {
    const r = _fxGetPuzzleRect();
    if (!r) return;

    const overlay = _fxOverlay(r.wrap, 1800, `z-index:${FX_Z.above};`);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    _fxMakeFogTendrils(overlay, r);
    _fxMakeIcon(r.wrap, '💀', cx, cy, 68, 'animation:fx-skull-rise 0.9s ease-out forwards;', 1400);

    Audio_Manager.playSFX('cursed_clock');
}
