import { trackAchStat } from '../../achievements/achievements.js';
import { Audio_Manager } from '../../audio/audio.js';
import { _startBlizzardEffect } from '../../classes/class-mathmagician-absolute-zero.js';
import { ptHasSkill } from '../../probability-tree/probability-tree-state-points.js';
import { t } from '../../translation/translations.js';
import { playItemEffect } from '../item-fx-dispatcher.js';
import { showToast } from '../../puzzle-mechanics/toasts-and-popups.js';
import { startTimerFreeze } from '../../timer/timer-freeze.js';

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
// The freeze state itself is owned by timer-freeze.js (flags, countdown
// overlay, Clock-guarded release); the item adds its own extras: the
// temporary shield, the clutch-freeze achievement and the end toast.
// Both shield flags are multi-writer game state (this item, the
// Mathmagician class, the Clock boss, the Stasis passive node), so they
// stay on the shared state objects rather than module-locals;
// shieldActive mirrors the plain shield item and is consumed by the
// shield-absorb intercepts. Null Hypothesis keystone skips the shield.
export function _useFreeze(id, def) {
    startTimerFreeze(FREEZE_DURATION_MS, { freezeActive: true, onEnd: () => {
        globalThis.shieldActive = false;
        showToast(t('item_freeze_ended'));
    } });
    if (!ptHasSkill('keystone_null_hypothesis')) globalThis.shieldActive = true;
    playItemEffect(id);

    // Tracked: clutch freezes (used with ≤ 10 s remaining) feed an achievement.
    if (globalThis.timerSecs <= 10) trackAchStat('freezeClutches');

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
