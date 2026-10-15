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

// The balance lives ONLY in the save (STATE.egGold). It used to be copied into
// a module variable once at import time, which went stale whenever a save slot
// was loaded or switched (STATE gets replaced): vendors then showed 0 and the
// next gold gain overwrote the saved balance with the tiny stale one.
function _goldNow() {
    const st = globalThis.STATE;
    return Math.max(0, Math.round(Number(st && st.egGold) || 0));
}

// Returns the current gold balance.
export function egGetGold() {
    return _goldNow();
}

// Writes the balance into the save and writes the game out.
function _setGold(value) {
    if (typeof globalThis.STATE === 'undefined' || !globalThis.STATE) return;
    globalThis.STATE.egGold = Math.max(0, Math.round(value));
    if (typeof save === 'function') save();
}

// Kept for callers that only want to persist the current balance.
export function _egSyncGoldToState() {
    _setGold(_goldNow());
}

// Adds gold to the balance (negative amounts are ignored) and records the earning.
export function _egAddGold(amount) {
    amount = Math.max(0, Math.round(amount));
    _setGold(_goldNow() + amount);
    if (typeof trackAchStat === 'function') try { trackAchStat('egGoldEarned', amount); } catch(e){}
}

// Attempts to spend `amount` gold. Returns false (without changing anything)
// when the balance is insufficient.
export function egSpendGold(amount) {
    amount = Math.round(amount);
    if (amount < 0 || _goldNow() < amount) return false;
    _setGold(_goldNow() - amount);
    if (typeof trackAchStat === 'function') try { trackAchStat('egGoldSpent', amount); } catch(e){}
    return true;
}
