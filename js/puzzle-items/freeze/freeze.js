import { trackAchStat } from '../../achievements/achievements.js';
import { Audio_Manager } from '../../audio/audio.js';
import { _startBlizzardEffect } from '../../classes/class-mathmagician.js';
import { ptHasSkill } from '../../passive-tree/passive-tree-state-points.js';
import { updTimer } from '../../timer.js';
import { t } from '../../translation/translations.js';
import { playItemEffect } from '../fx-dispatch.js';
import { showToast } from '../../puzzle-mechanics/toasts-and-popups.js';

//------------------------------------------------------------------------
//-------------------FREEZE - TIME FREEZE---------------------------------
//------------------------------------------------------------------------

// CONSTANTS & STATE

// Freeze duration shared with add-time.js (Countdown Crisis branch shows the
// freeze countdown overlay with this duration). Top-level so the module
// converter can export it - add-time.js read the old function-local const
// across files, which threw ReferenceError whenever that branch ran.
export const FREEZE_DURATION_MS = 2000;

// MAIN ENTRY POINTS

// freeze - freezes the timer for 2 s and activates a temporary shield.
// Both freeze flags are multi-writer game state (this item, the Mathmagician
// class, the Clock boss's 30 s freeze, the Stasis passive node), so they stay
// on the shared state objects rather than module-locals. shieldActive likewise
// mirrors the plain shield item and is consumed by the shield-absorb
// intercepts; Null Hypothesis keystone skips the shield grant.
export function _useFreeze(id, def) {
    globalThis.timerFrozen = true;
    window._freezeActive = true;
    // Null Hypothesis keystone skips the shield grant
    if (!ptHasSkill('keystone_null_hypothesis')) globalThis.shieldActive = true;
    updTimer();
    playItemEffect(id);

    // Tracked: clutch freezes (used with ≤ 10 s remaining) feed an achievement.
    if (globalThis.timerSecs <= 10) trackAchStat('freezeClutches');

    // Countdown ticker shown in the timer element
    let remaining = 2;
    const freezeTick = setInterval(() => {
        remaining--;
        const el = document.getElementById('timer-val');
        if (el) el.textContent = `❄️ ${remaining}s`;
        if (remaining <= 0) clearInterval(freezeTick);
    }, 1000);

    // Freeze release: the Clock boss's Time Freeze holds the timer for its whole
    // window - this item's 2 s freeze must never cut that freeze short.
    setTimeout(() => {
        if (typeof window === 'undefined' || !window._egClockTimeFreezeActive) {
            globalThis.timerFrozen = false;
        }
        window._freezeActive = false;
        globalThis.shieldActive = false;
        clearInterval(freezeTick);
        updTimer();
        showToast(t('item_freeze_ended'));
    }, FREEZE_DURATION_MS);

    return `${def.icon} ${t('item_freeze_msg')}`;
}

//------------------------------------------------------------------------
//-------------------ITEM VISUAL EFFECT-----------------------------------
//------------------------------------------------------------------------

// ❄️ Freeze - icy blizzard creeps in from the edges.
// Delegates to the shared blizzard system defined in class.js.
export function _fxFreeze() {
    _startBlizzardEffect(2200);
    Audio_Manager.playSFX('time_freeze');
}
