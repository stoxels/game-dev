import { trackAchStat } from '../achievements/achievements.js';
import { save } from '../state.js';

//------------------------------------------------------------------------
//-------------------ENDGAME GOLD BALANCE--------------------------------
//------------------------------------------------------------------------
// Gold is the endgame's soft trade currency. Map completions and vendor
// sales move it in and out of a single persistent balance.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// The player's current gold, seeded from the saved game on load.
export let _egGoldAmount = (typeof globalThis.STATE !== 'undefined' && globalThis.STATE.egGold) || 0;

// Returns the current gold balance.
export function egGetGold() {
    return _egGoldAmount;
}

// Copies the live balance into the save and writes the game out.
export function _egSyncGoldToState() {
    if (typeof globalThis.STATE === 'undefined') return;
    globalThis.STATE.egGold = _egGoldAmount;
    if (typeof save === 'function') save();
}

// Adds gold to the balance (negative amounts are ignored) and records the earning.
export function _egAddGold(amount) {
    amount = Math.max(0, Math.round(amount));
    _egGoldAmount += amount;
    _egSyncGoldToState();
    if (typeof trackAchStat === 'function') try { trackAchStat('egGoldEarned', amount); } catch(e){}
}

// Attempts to spend `amount` gold. Returns false (without changing anything)
// when the balance is insufficient.
export function egSpendGold(amount) {
    amount = Math.round(amount);
    if (amount < 0 || _egGoldAmount < amount) return false;
    _egGoldAmount -= amount;
    _egSyncGoldToState();
    if (typeof trackAchStat === 'function') try { trackAchStat('egGoldSpent', amount); } catch(e){}
    return true;
}
