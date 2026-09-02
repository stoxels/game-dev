//------------------------------------------------------------------------
//-------------------SHARED — EFFECT MODIFIERS----------------------
//------------------------------------------------------------------------

// Computes the final count / multiplier for an item's positive effect,
// factoring in keystones and passive nodes (Stronger Light, Iron
// Doctrine, Curse Embrace, Countdown Crisis, Golden Clock, ...).

// Returns the final reveal count for a reveal item, including all passive
// and keystone bonuses / penalties.
function _calcRevealCount(baseCount) {
    let count = baseCount;

    // Passive: Stronger Light — +1 per node
    count += (ptHasSkill('stronger_light_1') ? 1 : 0)
        + (ptHasSkill('stronger_light_2') ? 1 : 0)
        + (ptHasSkill('stronger_light_3') ? 1 : 0);

    // Keystone: Blinding Truth — 50% more reveals (rounds up)
    if (ptHasSkill('keystone_blinding_truth')) count = Math.ceil(count * 1.5);

    // Keystone: Countdown Crisis — ×5 when timer is under 3 minutes
    if (ptHasSkill('keystone_countdown_crisis') && timerSecs < 180) count *= 5;

    // Keystone: Curse Embrace — non-cursed items are 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) count = Math.max(1, Math.floor(count * 0.5));

    // Keystone: Iron Doctrine — non-cursed items at 300% increased effectiveness (×4)
    if (ptHasSkill('keystone_iron_doctrine')) count = Math.ceil(count * 4);

    return count;
}


// Returns the final mark-wrong count for a markWrong item.
function _calcMarkWrongCount(baseCount) {
    let count = baseCount;

    // Passive: Stronger Marks — +1 per node
    count += (ptHasSkill('stronger_marks_1') ? 1 : 0)
        + (ptHasSkill('stronger_marks_2') ? 1 : 0)
        + (ptHasSkill('stronger_marks_3') ? 1 : 0);

    // Keystone: Curse Embrace — 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) count = Math.max(1, Math.floor(count * 0.5));

    // Keystone: Iron Doctrine — 300% increased effectiveness (×4)
    if (ptHasSkill('keystone_iron_doctrine')) count = Math.ceil(count * 4);

    return count;
}


// Returns the final time addition (seconds) for an addTime item.
// Also handles the Countdown Crisis inversion (caller checks and acts on
// the negative case).
function _calcAddTimeSecs(baseSecs) {
    let multiplier = 1.0;

    // Passive: Extended Hour — each node adds 10% / 15% / 10%
    if (ptHasSkill('extended_hour_1')) multiplier += 0.10;
    if (ptHasSkill('extended_hour_2')) multiplier += 0.15;
    if (ptHasSkill('extended_hour_3')) multiplier += 0.10;

    // Keystone: Golden Clock — timer items are 100% more effective while active
    if (window._goldenClockActive) multiplier += 1.0;

    // Keystone: Iron Doctrine — 300% effectiveness
    if (ptHasSkill('keystone_iron_doctrine')) multiplier += 3.0;

    // Keystone: Curse Embrace — 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) multiplier *= 0.5;

    // Active map run: "% less Time gained from Item and Ability effects"
    const mapTimeMult = (typeof _egMapTimeGainMult === 'function') ? _egMapTimeGainMult() : 1;

    return Math.round(baseSecs * multiplier * mapTimeMult);
}


// Returns the final mistake-reduction count for a mistakeEraser item.
// Pass isEraseAll=true for mistakeEraserAll (bypasses most modifiers since
// it always clears the full current count).
function _calcMistakeEraserCount(baseCount, isEraseAll) {
    if (isEraseAll) return baseCount; // eraseAll ignores all modifiers

    let count = baseCount;

    // Passive: Scholarly Aid — +1 per node
    count += (ptHasSkill('scholarly_aid_1') ? 1 : 0)
        + (ptHasSkill('scholarly_aid_2') ? 1 : 0)
        + (ptHasSkill('scholarly_aid_3') ? 1 : 0);

    // Keystone: Iron Doctrine — 300% increased effectiveness (×4)
    if (ptHasSkill('keystone_iron_doctrine')) count = Math.ceil(count * 4);

    // Keystone: Curse Embrace — 50% weaker
    if (ptHasSkill('keystone_curse_embrace')) count = Math.max(1, Math.floor(count * 0.5));

    return count;
}
