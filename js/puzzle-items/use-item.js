//------------------------------------------------------------------------
//-------------------USE ITEM — PIPELINE----------------------
//------------------------------------------------------------------------

// Item-use pipeline: dispatch table, achievement tracking, Frugal Use,
// consumption bookkeeping and the public useItem() entry point.
// The actual effects live in the per-item files (reveal.js, shield.js,
// cursed-*.js, ...) — this file only routes to them.

// Prefix-matched handler entries.  Each entry has:
//   prefix  — id must start with this string
//   handler — the function to call
//   exclude — exact ids that share the prefix but must NOT use this handler
const ITEM_PREFIX_HANDLERS = [
    { prefix: 'reveal', handler: _useReveal, exclude: ['cursedReveal'] },
    { prefix: 'markWrong', handler: _useMarkWrong, exclude: [] },
    { prefix: 'addTime', handler: _useAddTime, exclude: [] },
];


// Exact-id handler table.
const ITEM_EFFECT_HANDLERS = {
    freeze: _useFreeze,
    shield: _useShield,
    rowSolve: _useRowSolve,
    colSolve: _useColSolve,
    surveyScope: _useSurveyScope,
    mistakeEraser: _useMistakeEraser,
    mistakeEraser4: _useMistakeEraser,
    mistakeEraser6: _useMistakeEraser,
    mistakeEraserAll: _useMistakeEraser,
    artifactComplete: _useArtifactComplete,
    scoutPrimer: _useScoutPrimer,
    cursedReveal: _useCursedReveal,
    cursedTime: _useCursedTime,
    cursedShield: _useCursedShield,
    cursedRowSolve: _useCursedRowSolve,
    cursedColSolve: _useCursedColSolve,
    cursedRowCol: _useCursedRowCol,
    pearlOfHaste: _usePearlOfHaste,
    pearlOfSwiftness: _usePearlOfSwiftness,
    grandPearl: _useGrandPearl,
    theWitch: _useTheWitch,
    goldenClock: _useGoldenClock,
    shadowSeal: _useShadowSeal,
    chronoFracture: _useChronoFracture,
};


// Routes an item id to the correct handler, trying prefix matches first.
// Returns the localised result string (used as the toast message).
function _dispatchItemEffect(id, def) {
    for (const { prefix, handler, exclude } of ITEM_PREFIX_HANDLERS) {
        if (id.startsWith(prefix) && !exclude.includes(id)) {
            return handler(id, def);
        }
    }

    const handler = ITEM_EFFECT_HANDLERS[id];
    if (handler) return handler(id, def);

    return ''; // unknown item id — no effect
}


// Checks whether `id` is any variant of the mistakeEraser item.
function _isMistakeEraserItem(id) {
    return id === 'mistakeEraser'
        || id === 'mistakeEraser4'
        || id === 'mistakeEraser6'
        || id === 'mistakeEraserAll';
}


// Fires all relevant achievement and quest-stat calls for the used item.
function _trackItemAchievements(id, def) {
    // Universal — every item use
    trackAchStat('itemsUsed');
    if (def.rarity === 'cursed') trackAchStat('cursedItemsUsed');

    // Per-item-type achievements
    if (id === 'shield') trackAchStat('shieldsUsed');
    if (id === 'artifactComplete') trackAchStat('artifactUsed');
    if (id === 'freeze') trackAchStat('freezeUsed');
    if (_isMistakeEraserItem(id)) trackAchStat('eraserUsed');
    if (id === 'cursedReveal') trackAchStat('cursedLensUsed');
    if (id === 'cursedTime') trackAchStat('cursedClockUsed');
    if (id === 'cursedShield') trackAchStat('demonEyeUsed');
    if (id === 'cursedRowSolve') trackAchStat('tidalWaveUsed');
    if (id === 'cursedColSolve') trackAchStat('vortexUsed');
    if (id === 'cursedRowCol') trackAchStat('chaosGridUsed');
    if (id === 'scoutPrimer') trackAchStat('scoutPrimerUsed');
    if (id === 'rowSolve' || id === 'colSolve') trackAchStat('rowColSolved');
    if (id === 'pearlOfHaste' || id === 'pearlOfSwiftness' || id === 'grandPearl') trackAchStat('pearlsUsed');
    if (id === 'theWitch') trackAchStat('witchUsed');
    if (id === 'goldenClock') trackAchStat('goldenClockUsed');
    if (id === 'shadowSeal') trackAchStat('shadowSealUsed');

    // Time-added tracking (addTime items and cursedTime both add time)
    if (id.startsWith('addTime')) {
        const secs = parseInt(id.replace('addTime', '')) || 0;
        if (secs > 0) trackAchStat('timeAdded', secs);
    }
    if (id === 'cursedTime') trackAchStat('timeAdded', 1200);

    // Multi-item-use achievement (counts once per level, not once per use)
    if (itemsUsedThisLevel >= 3 && !window._threeItemsTrackedThisLevel) {
        window._threeItemsTrackedThisLevel = true;
        trackAchStat('threeItemsOneLevelCount');
    }

    // Cursed items used on a first-attempt level
    if (def.rarity === 'cursed' && !STATE.done.includes(cur.gIdx)) {
        trackAchStat('cursedFirstAttempts');
    }
}


// Returns the cumulative Frugal Use proc chance (0.0 – 0.17).
function _getFrugalUseChance() {
    return (ptHasSkill('frugal_use_1') ? 0.05 : 0)
        + (ptHasSkill('frugal_use_2') ? 0.05 : 0)
        + (ptHasSkill('frugal_use_3') ? 0.07 : 0);
}


function _consumeItem(idx, def, msg) {
    // Only null means "no effect, don't consume". '' means an effect
    // happened but the item's own handler already showed its toast.
    if (msg === null) return;

    // Character banter: prefer an item-specific line for this exact item
    // (chance-gated). Falls back internally to the generic rarity-based
    // line when no item-specific lines exist.
    if (typeof triggerItemBanter === 'function') {
        triggerItemBanter(def.id, def.rarity);
    } else if (typeof triggerBanter === 'function') {
        triggerBanter(def.rarity === 'cursed' ? 'item_used_cursed' : 'item_used_generic');
    }

    const frugalChance = _getFrugalUseChance();

    if (frugalChance > 0 && Math.random() < frugalChance) {
        // Frugal Use proc — the item is NOT removed from inventory
        itemsUsedThisLevel++;
        _trackItemAchievements(def.id, def);
        updateQuestStats('itemUsed', { defId: def.id, rarity: def.rarity });
        save();
        if (msg) showToast(msg + t('itm_not_consumed'));
        buildInventoryPanel();
        return;
    }

    // Normal path — remove item, track, save, toast
    STATE.inventory.splice(idx, 1);
    itemsUsedThisLevel++;
    _trackItemAchievements(def.id, def);
    updateQuestStats('itemUsed', { defId: def.id, rarity: def.rarity });
    save();
    if (msg) showToast(msg);
    buildInventoryPanel();
}


function useItem(uid) {
    // Items are disabled in dead state and Ironman mode
    if (dead || curMods.ironman) return;

    const idx = STATE.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return;

    const item = STATE.inventory[idx];
    const def = ITEM_DEFS[item.defId];
    if (!def) return;

    const msg = _dispatchItemEffect(def.id, def);

    _consumeItem(idx, def, msg);
}
