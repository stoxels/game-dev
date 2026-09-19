import { ptHasSkill } from '../passive-tree/passive-tree-state-points.js';
import { questStat_curseBlocked } from '../inference/inference-stats.js';
import { t } from '../translation/translations.js';
import { showToast } from './toasts-and-popups.js';
import { applyCursedColBlackout, applyCursedRowBlackout } from './clue-blackout.js';
import { unsolveColsExcluding, unsolveRowsExcluding } from './grid-actions.js';

//------------------------------------------------------------------------
//-------------------SHARED - CURSED DOWNSIDE-----------------------------
//------------------------------------------------------------------------
// Centralised cursed-downside resolution for the cursed item family:
// immunity (The Witch / Cursed Ward), Curse Embrace, Veil of Purity,
// Dampened Curse reductions and the Blackout / Removal ward rolls.
//------------------------------------------------------------------------

// The shared gate every downside runs through. Returns the multiplier the
// downside applies (0 = fully suppressed, 1 = unchanged, 2 = Veil broken).
// The first Veil-of-Purity use sets the level flag and toasts; every later
// use doubles the downside as punishment.
function _curseGateMult() {
    // Full immunity from The Witch or the Cursed Ward passive
    if (window.LEVEL_FLAGS.cursedImmune) {
        questStat_curseBlocked();
        return 0;
    }

    // Curse Embrace keystone: cursed downsides are always suppressed
    if (ptHasSkill('keystone_curse_embrace')) {
        questStat_curseBlocked();
        return 0;
    }

    // Veil of Purity keystone: first use is immune, later uses double.
    // The flag/toggle branch and the doubling branch both toast, so the
    // caller never repeats the veil messaging.
    if (ptHasSkill('keystone_veil_of_purity')) {
        if (!window.LEVEL_FLAGS.veiledCursedUsed) {
            window.LEVEL_FLAGS.veiledCursedUsed = true;
            showToast(t('itm_veil_prevented'));
            questStat_curseBlocked();
            return 0;
        }
        showToast(t('itm_veil_broken'));
        return 2;
    }

    // Dampened Curse passive nodes reduce the downside by 10% / 10% / 15%
    let mult = 1.0;
    if (ptHasSkill('dampened_curse_1')) mult -= 0.10;
    if (ptHasSkill('dampened_curse_2')) mult -= 0.10;
    if (ptHasSkill('dampened_curse_3')) mult -= 0.15;
    return Math.max(0, mult);
}

// Returns the effective blackout duration (ms) for a cursed downside, after
// all passive reductions and immunity checks. Returns 0 when the downside
// should be fully suppressed.
function _cursedDownsideDuration(baseMs) {
    return Math.round(baseMs * _curseGateMult());
}

// True when the curse gate fully suppresses a downside right now (Witch
// immunity, Cursed Ward, Curse Embrace, or the first Veil-of-Purity use).
// Runs the same gate (toasts + flag side effects included) as the scaling
// helpers - items whose downside cannot scale use this instead of the
// duration/count math.
export function _cursedDownsideSuppressed() {
    return _curseGateMult() === 0;
}

// Returns the effective erase count for a cursed downside (rows / cols
// erased), applying the same immunity and reduction checks as the duration.
function _cursedDownsideCount(baseCount) {
    return Math.floor(baseCount * _curseGateMult());
}

// Returns true if the Blackout Ward passive nodes block a blackout effect
// this trigger. Chance accumulates across all three invested nodes.
function _blackoutWardBlocks() {
    let chance = 0;
    if (ptHasSkill('blackout_ward_1')) chance += 0.30;
    if (ptHasSkill('blackout_ward_2')) chance += 0.10;
    if (ptHasSkill('blackout_ward_3')) chance += 0.20;
    return chance > 0 && Math.random() < chance;
}

// Returns true if the Removal Ward passive nodes block a row / col erasure
// effect this trigger. Chance accumulates across all three nodes.
function _removalWardBlocks() {
    let chance = 0;
    if (ptHasSkill('removal_ward_1')) chance += 0.30;
    if (ptHasSkill('removal_ward_2')) chance += 0.10;
    if (ptHasSkill('removal_ward_3')) chance += 0.20;
    return chance > 0 && Math.random() < chance;
}

// Applies a blackout downside (row and/or col) and shows a ward-protection
// toast when the blackout is blocked. Pass booleans to select which axes
// to black out; no-ops when the duration resolved to 0 (immunity etc.).
function _applyBlackoutDownside(dur, blackoutRows, blackoutCols) {
    if (dur <= 0) return;

    if (_blackoutWardBlocks()) {
        showToast(t('itm_blackout_ward'));
        return;
    }

    if (blackoutRows) applyCursedRowBlackout(dur);
    if (blackoutCols) applyCursedColBlackout(dur);
}

// Applies a row-erasure downside and shows a ward-protection toast when
// erasure is blocked. `preFilledSet` is the snapshot of filled rows taken
// before the item benefit fired, so only pre-existing rows are targeted.
// Returns the number of rows actually erased.
function _applyRowErasureDownside(eraseCount, preFilledSet) {
    if (eraseCount <= 0) return 0;

    if (_removalWardBlocks()) {
        showToast(t('itm_removal_ward_rows'));
        return 0;
    }

    return unsolveRowsExcluding(eraseCount, preFilledSet);
}

// Applies a column-erasure downside, with ward check.
// Returns the number of columns actually erased.
function _applyColErasureDownside(eraseCount, preFilledSet) {
    if (eraseCount <= 0) return 0;

    if (_removalWardBlocks()) {
        showToast(t('itm_removal_ward_cols'));
        return 0;
    }

    return unsolveColsExcluding(eraseCount, preFilledSet);
}

//------------------------------------------------------------------------
//-------------------MAIN ENTRY POINTS------------------------------------
//------------------------------------------------------------------------

// Convenience wrapper combining duration scaling + blackout application.
// Used by cursed items whose downside is a clue blackout (cursedTime,
// cursedShield, cursedRowCol) so each handler doesn't repeat the pair.
export function _resolveCursedBlackoutDownside(baseMs, blackoutRows, blackoutCols) {
    const dur = _cursedDownsideDuration(baseMs);
    _applyBlackoutDownside(dur, blackoutRows, blackoutCols);
}

// Convenience wrapper combining count scaling + row-erasure application.
// Used by cursedRowSolve. Returns the number of rows erased.
export function _resolveCursedRowErasureDownside(baseCount, preFilledSet) {
    const eraseCount = _cursedDownsideCount(baseCount);
    return _applyRowErasureDownside(eraseCount, preFilledSet);
}

// Convenience wrapper combining count scaling + col-erasure application.
// Used by cursedColSolve. Returns the number of columns erased.
export function _resolveCursedColErasureDownside(baseCount, preFilledSet) {
    const eraseCount = _cursedDownsideCount(baseCount);
    return _applyColErasureDownside(eraseCount, preFilledSet);
}
