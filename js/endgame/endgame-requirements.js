//------------------------------------------------------------------------
//-------------------ENDGAME EQUIPMENT REQUIREMENTS-----------------------
//------------------------------------------------------------------------
// Enforces gear stat requirements (Requires 10 Agi, etc.) on every
// equip/unequip path in the Endgame Hub.
//
// Design notes:
//   - Attribute totals are computed over the WHOLE simulated loadout
//     (base attributes + attribute bonuses from every equipped item).
//     This makes "self-carrying" work naturally: an item requiring
//     20 Agi that itself grants +10 Agi can be equipped when the player
//     otherwise has 15 Agi, because the final loadout totals 25.
//   - Every check runs against a SIMULATED final state (the loadout as
//     it would look after the pending equip/unequip), so chain-breaking
//     moves are blocked before any mutation happens.
//   - GRANDFATHER RULE: moves are only blocked when they increase the total
//     number of violated requirements. Loadouts built before enforcement
//     existed can always be dismantled/fixed instead of locking the player in.
//   - Player level: wired to the leveling system (endgame-leveling.js),
//     which keeps EG_PLAYER_BASE_ATTRIBUTES synced to STATE.playerLevel
//     and the allocated attribute points — level requirements therefore
//     enforce automatically.
//
// Dependencies (must be loaded before this file):
//   endgame-player-stats.js — EG_STAT_KEY_MAP, _egGetAllEquippedItems()
//
// Entry points:
//   _egCanEquipInSlot(item, slotId)      → { ok, missing[] } for equipping
//   _egCheckUnequipSlot(slotId)          → { ok, missing[] } for unequipping
//   _egGetUnmetRequirementsText(missing) → localized "5 Agi, 3 Str" string
//   _egComputeLoadoutAttributes(items)   → { str, agi, int } totals (tooltip)
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

// Character base attributes before any equipment bonuses.
// These must be >= the lowest tier of attribute requirements in
// endgame-equipment-base-items.js (~14 at item level 1), otherwise no gear
// could ever be equipped. Tune freely — 20/20/20 covers early gear outright
// and makes higher tiers a gear-investment / self-carry decision.
// `level: null` means no level system yet — level requirements are skipped.
const EG_PLAYER_BASE_ATTRIBUTES = {
    level: null,
    str: 20,
    agi: 20,
    int: 20,
};


//------------------------------------------------------------------------
//-------------------ATTRIBUTE TOTALS-------------------------------------
//------------------------------------------------------------------------

// Sums the flat strength/agility/intelligence bonuses granted by mods AND implicits on
// the given items. Only additive attribute mods count toward requirements.
function _egSumAttributeBonuses(items) {
    const totals = { str: 0, agi: 0, int: 0 };
    function collect(list) {
        (Array.isArray(list) ? list : []).forEach(mod => {
            (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
                const entry = typeof EG_STAT_KEY_MAP !== 'undefined' ? EG_STAT_KEY_MAP[stat.key] : null;
                if (!entry || entry.mode !== 'add' || stat.value == null) return;
                const val = Number(stat.value) || 0;
                if (entry.bucket === 'strength') totals.str += val;
                else if (entry.bucket === 'agility') totals.agi += val;
                else if (entry.bucket === 'intelligence') totals.int += val;
            });
        });
    }
    (items || []).forEach(item => {
        collect(item.mods);
        collect(item.implicits);
    });
    return totals;
}

// Total attributes available to satisfy requirements for a given set of
// items: base attributes plus every item's attribute bonus.
function _egComputeLoadoutAttributes(items) {
    if (typeof _egSyncBaseAttributes === 'function') {
        try { _egSyncBaseAttributes(); } catch (e) {}
    }
    const bonus = _egSumAttributeBonuses(items);
    return {
        str: EG_PLAYER_BASE_ATTRIBUTES.str + bonus.str,
        agi: EG_PLAYER_BASE_ATTRIBUTES.agi + bonus.agi,
        int: EG_PLAYER_BASE_ATTRIBUTES.int + bonus.int,
    };
}


//------------------------------------------------------------------------
//-------------------REQUIREMENT CHECKING---------------------------------
//------------------------------------------------------------------------

// Returns an array of { item, stat, need, have } for every requirement
// violated by the given set of items. `stat` is 'level' | 'str' | 'agi' | 'int'.
// Self-carrying falls out automatically because attribute totals include
// all items in the set.
function _egFindUnmetRequirements(items) {
    const attrs = _egComputeLoadoutAttributes(items);
    const unmet = [];
    (items || []).forEach(item => {
        const req = item && item.requirements;
        if (!req) return;
        if (EG_PLAYER_BASE_ATTRIBUTES.level != null
            && (req.level || 0) > 0
            && EG_PLAYER_BASE_ATTRIBUTES.level < req.level) {
            unmet.push({ item, stat: 'level', need: req.level, have: EG_PLAYER_BASE_ATTRIBUTES.level });
        }
        if ((req.str || 0) > 0 && attrs.str < req.str) {
            unmet.push({ item, stat: 'str', need: req.str, have: attrs.str });
        }
        if ((req.agi || 0) > 0 && attrs.agi < req.agi) {
            unmet.push({ item, stat: 'agi', need: req.agi, have: attrs.agi });
        }
        if ((req.int || 0) > 0 && attrs.int < req.int) {
            unmet.push({ item, stat: 'int', need: req.int, have: attrs.int });
        }
    });
    return unmet;
}

// Builds the loadout that would result after applying mutateFn(simMap) to a
// copy of the currently equipped map, then returns its unmet requirements.
// The drag source slot is already empty at check time when dragging from a
// paperdoll slot (pickup clears the origin immediately), which matches the
// post-move reality — except for the displaced occupant, whose final resting
// place (source equip slot vs stash cell) does not change the loadout's
// total attribute pool.
function _egSimulateAndCheck(mutateFn) {
    if (typeof _egEquipped === 'undefined') return [];
    const sim = {};
    Object.keys(_egEquipped).forEach(k => { if (_egEquipped[k]) sim[k] = _egEquipped[k]; });
    mutateFn(sim);
    return _egFindUnmetRequirements(Object.values(sim).filter(Boolean));
}

// GRANDFATHER RULE: a move is only blocked when it increases the number of
// violated requirements compared to the current state. In a fully valid
// loadout this is strict enforcement (any violating move blocks). But if a
// saved character was built before enforcement existed (or otherwise ended
// up in an invalid state), the player can never be locked out — moves that
// keep or reduce violations are always allowed, so any broken build can be
// dismantled and fixed.
function _egCheckMoveAllowed(mutateFn) {
    const before = _egSimulateAndCheck(() => {});
    const after = _egSimulateAndCheck(mutateFn);
    return { ok: after.length <= before.length, missing: after };
}

// Checks whether `item` may be equipped into `slotId` given the current
// board state. Works for both drag-drop (origin already cleared) and
// right-click quick-equip (nothing mutated yet): in both cases the target
// slot's current occupant leaves the paperdoll and the new item enters.
// Returns { ok: true } or { ok: false, missing: [...] }.
function _egCanEquipInSlot(item, slotId) {
    return _egCheckMoveAllowed(sim => {
        // Remove the item from any slot it may already occupy so it is not
        // counted twice in the simulated attribute totals.
        Object.keys(sim).forEach(k => { if (sim[k] === item) delete sim[k]; });
        delete sim[slotId];
        sim[slotId] = item;
    });
}

// Checks whether removing whatever occupies `slotId` would leave the rest of
// the loadout self-consistent. Also works mid-drag (item already lifted off
// its slot) since deleting an absent key is a no-op.
// Returns { ok: true } or { ok: false, missing: [...] }.
function _egCheckUnequipSlot(slotId) {
    return _egCheckMoveAllowed(sim => {
        delete sim[slotId];
    });
}


//------------------------------------------------------------------------
//-------------------FEEDBACK TEXT----------------------------------------
//------------------------------------------------------------------------

// Formats one unmet entry as localized text, e.g. "10 Agi" or "Level 12".
function _egFormatRequirementPart(stat, need) {
    if (stat === 'level') return t('eg_req_level').replace('{n}', need);
    const attrKeys = { str: 'eg_attr_str', agi: 'eg_attr_agi', int: 'eg_attr_int' };
    return `${need} ${t(attrKeys[stat])}`;
}

// Joins unmet entries into a single localized list, e.g. "5 Agi, 3 Int".
function _egGetUnmetRequirementsText(missing) {
    const seen = {};
    const parts = [];
    (missing || []).forEach(m => {
        // Deduplicate identical deficits (several items lacking the same stat).
        const key = `${m.stat}:${m.need - m.have}`;
        if (seen[key]) return;
        seen[key] = true;
        parts.push(_egFormatRequirementPart(m.stat, m.need - m.have));
    });
    return parts.join(', ');
}

// Shows the standard rejection feedback: red toast explaining what is missing.
// `context` is 'equip' or 'unequip'; `item` is the item object (or its name)
// being equipped/unequipped. For equips blocked by a chain-break (the swap
// displaces an item whose bonuses other gear relies on) a dedicated message
// explains that instead of the generic "missing" one.
// Also mirrors the message into the stash center overlay (endgame-hub.js) so
// the player sees WHY the action was blocked without having to catch a toast.
function _egShowRequirementsToast(context, missing, item) {
    const itemName = (item && item.name) || item || '?';
    const list = _egGetUnmetRequirementsText(missing);
    let msg;
    const chain = context === 'equip' ? _egGetSwapChainBreak(item) : null;
    if (chain) {
        msg = t('eg_cannot_equip_chainbreak')
            .replace('{name}', itemName)
            .replace('{equipped}', chain.occupant.name || '?')
            .replace('{list}', list);
    } else {
        msg = context === 'unequip'
            ? t('eg_cannot_unequip').replace('{name}', itemName).replace('{list}', list)
            : t('eg_cannot_equip').replace('{name}', itemName).replace('{list}', list);
    }
    if (typeof showToast === 'function') showToast(msg, '#e74c3c');
    if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
}


//------------------------------------------------------------------------
//-------------------WEARABILITY DISPLAY HELPER---------------------------
//------------------------------------------------------------------------

// Attribute totals as the equip gate would see them after equipping `item`.
//   - Equipped item: unchanged live loadout.
//   - Stash item: the occupant of the target slot is already removed and the
//     item's own bonuses are included (self-carrying) — matching exactly what
//     _egCanEquipInSlot will validate, so tooltips never show "requirements
//     met" for an equip that the gate would reject (or vice versa).
function _egPreviewEquipAttributes(item) {
    const equipped = _egGetAllEquippedItems();
    if (equipped.includes(item)) return _egComputeLoadoutAttributes(equipped);
    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return _egComputeLoadoutAttributes(equipped);
    const sim = equipped.filter(i => i !== _egEquipped[target]);
    return _egComputeLoadoutAttributes(sim.concat(item));
}

// Explains WHY a stash item is blocked even though its own requirements are
// met after the swap: equipping it displaces the current occupant of the
// target slot, and that occupant may be carrying attribute bonuses that
// OTHER equipped items rely on ("chain-break"). Returns null unless the item
// is blocked purely for that reason:
//   { occupant, broken: [{ item, stat, need, have }] }
function _egGetSwapChainBreak(item) {
    if (!item || item.category !== 'equip' || !item.requirements) return null;
    if (typeof _egEquipped === 'undefined') return null;

    const equippedList = Object.values(_egEquipped).filter(Boolean);
    if (equippedList.includes(item)) return null;

    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return null;

    const gate = _egCanEquipInSlot(item, target);
    if (gate.ok) return null;
    // If the new item itself misses a requirement, the regular
    // "Missing:" display already covers it — not a chain-break.
    if ((gate.missing || []).some(u => u.item === item)) return null;

    const broken = (gate.missing || []).filter(u => u.item !== item && equippedList.includes(u.item));
    const occupant = _egEquipped[target];
    if (!broken.length || !occupant) return null;
    return { occupant, broken };
}


// True when the item should be flagged red as "unwearable" in the UI.
//   - Equipped items: red while the item itself currently violates its
//     requirements against the live loadout.
//   - Stash items: red when equipping it right now would be rejected by the
//     requirement gate (grandfather rule included — matches what the game
//     would actually do on right-click / drop).
// Non-equipment items and items with no requirements are never blocked.
function _egIsItemBlocked(item) {
    if (!item || item.category !== 'equip' || !item.requirements) return false;
    if (typeof _egEquipped === 'undefined') return false;

    const equippedList = Object.values(_egEquipped).filter(Boolean);
    if (equippedList.includes(item)) {
        return _egFindUnmetRequirements(equippedList).some(u => u.item === item);
    }

    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return false; // no matching slot exists — not a requirements question
    return !_egCanEquipInSlot(item, target).ok;
}
