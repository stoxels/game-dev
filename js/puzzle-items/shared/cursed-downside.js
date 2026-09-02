//------------------------------------------------------------------------
//-------------------SHARED — CURSED DOWNSIDE----------------------
//------------------------------------------------------------------------

// Centralised cursed-downside resolution: immunity (Witch / Cursed
// Ward), Curse Embrace, Veil of Purity, Dampened Curse reductions and
// the Blackout / Removal ward rolls.

// Returns the effective blackout duration (ms) for a cursed downside,
// after applying all passive reductions and immunity checks.
// Returns 0 when the downside should be fully suppressed.
function _cursedDownsideDuration(baseMs) {
    // Full immunity from The Witch or Cursed Ward
    if (window._cursedImmune) {
        questStat_curseBlocked();
        return 0;
    }

    // Curse Embrace keystone: cursed downsides are always suppressed
    if (ptHasSkill('keystone_curse_embrace')) {
        questStat_curseBlocked();
        return 0;
    }

    // Veil of Purity keystone: first use is immune; subsequent uses amplify
    if (ptHasSkill('keystone_veil_of_purity')) {
        if (!window._veiled_cursedUsed) {
            window._veiled_cursedUsed = true;
            showToast(t('itm_veil_prevented'));
            questStat_curseBlocked();
            return 0;
        }
        // Veil is now broken — curse is doubled as punishment
        showToast(t('itm_veil_broken'));
        return Math.round(baseMs * 2);
    }

    // Dampened Curse passive nodes reduce duration by 10% / 10% / 15%
    let mult = 1.0;
    if (ptHasSkill('dampened_curse_1')) mult -= 0.10;
    if (ptHasSkill('dampened_curse_2')) mult -= 0.10;
    if (ptHasSkill('dampened_curse_3')) mult -= 0.15;
    return Math.round(baseMs * Math.max(0, mult));
}


// Returns the effective erase count for a cursed downside (rows / cols
// erased), applying the same immunity and reduction checks as duration.
function _cursedDownsideCount(baseCount) {
    // Full immunity from The Witch or Cursed Ward
    if (window._cursedImmune) {
        questStat_curseBlocked();
        return 0;
    }

    // Curse Embrace keystone: cursed downsides are always suppressed
    if (ptHasSkill('keystone_curse_embrace')) {
        questStat_curseBlocked();
        return 0;
    }

    // Veil of Purity keystone: same first-use / subsequent logic as duration.
    // Note: the flag is set inside _cursedDownsideDuration, so we only need
    // to read it here without toggling it a second time.
    if (ptHasSkill('keystone_veil_of_purity')) {
        if (!window._veiled_cursedUsed) {
            // First use immunity — toast / flag handled by the duration call
            questStat_curseBlocked();
            return 0;
        }
        // Veil broken — double the erase count
        showToast(t('itm_veil_broken'));
        return Math.round(baseCount * 2);
    }

    // Derive the count multiplier from the duration multiplier so the two
    // always stay in sync when Dampened Curse nodes are active.
    const durationMult = _cursedDownsideDuration(1000) / 1000;
    return Math.max(0, Math.floor(baseCount * durationMult));
}


// Returns true if the Blackout Ward passive nodes block a blackout effect
// this trigger.  Chance accumulates across all three invested nodes.
function _blackoutWardBlocks() {
    let chance = 0;
    if (ptHasSkill('blackout_ward_1')) chance += 0.30;
    if (ptHasSkill('blackout_ward_2')) chance += 0.10;
    if (ptHasSkill('blackout_ward_3')) chance += 0.20;
    return chance > 0 && Math.random() < chance;
}


// Returns true if the Removal Ward passive nodes block a row / col
// erasure effect this trigger.  Chance accumulates across all three nodes.
function _removalWardBlocks() {
    let chance = 0;
    if (ptHasSkill('removal_ward_1')) chance += 0.30;
    if (ptHasSkill('removal_ward_2')) chance += 0.10;
    if (ptHasSkill('removal_ward_3')) chance += 0.20;
    return chance > 0 && Math.random() < chance;
}


// Shared helper: applies a blackout downside (row and/or col) and shows a
// ward-protection toast when the blackout is blocked.  Pass booleans to
// select which axes to black out.
function _applyBlackoutDownside(dur, blackoutRows, blackoutCols) {
    if (dur <= 0) return;

    if (_blackoutWardBlocks()) {
        showToast(t('itm_blackout_ward'));
        return;
    }

    if (blackoutRows) applyCursedRowBlackout(dur);
    if (blackoutCols) applyCursedColBlackout(dur);
}


// Shared helper: applies a row-erasure downside and shows a ward-
// protection toast when erasure is blocked.
// `preFilledSet` is the snapshot of filled rows taken before the item
// benefit fired so only pre-existing rows are targeted.
// Returns the number of rows actually erased.
function _applyRowErasureDownside(eraseCount, preFilledSet) {
    if (eraseCount <= 0) return 0;

    if (_removalWardBlocks()) {
        showToast(t('itm_removal_ward_rows'));
        return 0;
    }

    return unsolveRowsExcluding(eraseCount, preFilledSet);
}


// Shared helper: applies a column-erasure downside, with ward check.
// Returns the number of columns actually erased.
function _applyColErasureDownside(eraseCount, preFilledSet) {
    if (eraseCount <= 0) return 0;

    if (_removalWardBlocks()) {
        showToast(t('itm_removal_ward_cols'));
        return 0;
    }

    return unsolveColsExcluding(eraseCount, preFilledSet);
}


// Convenience wrapper combining duration scaling + blackout application.
// Used by cursed items whose downside is a clue blackout (cursedTime,
// cursedShield, cursedRowCol) so each handler doesn't repeat the pair.
function _resolveCursedBlackoutDownside(baseMs, blackoutRows, blackoutCols) {
    const dur = _cursedDownsideDuration(baseMs);
    _applyBlackoutDownside(dur, blackoutRows, blackoutCols);
}


// Convenience wrapper combining count scaling + row-erasure application.
// Used by cursedRowSolve. Returns the number of rows erased.
function _resolveCursedRowErasureDownside(baseCount, preFilledSet) {
    const eraseCount = _cursedDownsideCount(baseCount);
    return _applyRowErasureDownside(eraseCount, preFilledSet);
}


// Convenience wrapper combining count scaling + col-erasure application.
// Used by cursedColSolve. Returns the number of columns erased.
function _resolveCursedColErasureDownside(baseCount, preFilledSet) {
    const eraseCount = _cursedDownsideCount(baseCount);
    return _applyColErasureDownside(eraseCount, preFilledSet);
}
