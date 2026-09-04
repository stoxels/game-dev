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
// Also enforces PoE-style hand rules (see _egCheckHandCompatibility):
//   - 2H weapons need weapon1 AND a free off-hand
//   - weapon2 accepts shields or 1H weapons only (dual-wield)
//   - two shields are impossible (weapon1 never accepts shields)
// Returns { ok: true } or { ok: false, missing: [...], handError }.
function _egCanEquipInSlot(item, slotId) {
    if (item && item.category === 'equip') {
        const handGate = _egCheckHandCompatibilityInSlot(item, slotId);
        if (!handGate.ok) return handGate;
    }
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
function _egShowRequirementsToast(context, missingOrGate, item) {
    const itemName = (item && item.name) || item || '?';
    // Hand-rule rejections carry their own message (no attribute list).
    // Callers pass the full gate ({ ok, missing, handError }) or the missing array.
    const handError = (missingOrGate && missingOrGate.handError)
        ? missingOrGate.handError
        : (item && item.handError ? item.handError : null);
    if (handError && typeof _egHandErrorMessage === 'function') {
        const msg = _egHandErrorMessage(handError, typeof item === 'object' ? item : { name: itemName });
        if (typeof showToast === 'function') showToast(msg, '#e74c3c');
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        return;
    }
    const missing = Array.isArray(missingOrGate) ? missingOrGate : (missingOrGate && missingOrGate.missing) || [];
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
        if (_egFindUnmetRequirements(equippedList).some(u => u.item === item)) return true;
        // Safety net: an equipped item in an illegal hand slot (normally
        // already repaired by the sheet-open migration) still flags red.
        try {
            const slotId = Object.keys(_egEquipped).find(k => _egEquipped[k] === item);
            if (slotId && typeof _egCheckHandCompatibilityInSlot === 'function'
                && !_egCheckHandCompatibilityInSlot(item, slotId).ok) return true;
        } catch (e) {}
        return false;
    }

    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return false; // no matching slot exists — not a requirements question
    const gate = _egCanEquipInSlot(item, target);
    if (gate.ok) return false;
    // A 2H weapon whose only obstacle is the occupied off-hand is NOT blocked:
    // equipping auto-unequips the off-hand (PoE-style). Still blocked when
    // freeing the off-hand would break other gear or requirements fail after.
    if (gate.handError === 'two_handed_blocks_offhand' && target === 'weapon1') {
        try {
            const offGate = _egCheckUnequipSlot('weapon2');
            if (offGate.ok) {
                const retry = _egCheckMoveAllowed(sim => {
                    Object.keys(sim).forEach(k => { if (sim[k] === item) delete sim[k]; });
                    delete sim.weapon2;
                    delete sim.weapon1;
                    sim.weapon1 = item;
                });
                if (retry.ok) return false;
            }
        } catch (e) {}
    }
    return true;
}


//------------------------------------------------------------------------
//-------------------WEAPON HAND RULES (PoE-STYLE)--------------------------
//------------------------------------------------------------------------
// Three legal setups:
//   1) single 2H weapon in weapon1, weapon2 empty   (offense, no block)
//   2) 1H weapon in weapon1 + shield in weapon2     (balanced, can block)
//   3) 1H weapon in weapon1 + 1H weapon in weapon2  (dual-wield, parry bonus)
// Blocking always requires a shield in weapon2 (enforced in combat).
// Two shields are impossible because weapon1 never accepts slotType 'shield'.

function _egGetWeaponHands(item) {
    if (!item || item.slotType !== 'weapon') return null;
    if (item.hands === 1 || item.hands === 2) return item.hands;
    if (typeof _egInferWeaponHands === 'function') {
        const inferred = _egInferWeaponHands(item);
        if (inferred === 1 || inferred === 2) return inferred;
    }
    return 1; // legacy fallback: old weapons were all effectively 1H
}

function _egIsTwoHandedWeapon(item) {
    return item && item.slotType === 'weapon' && _egGetWeaponHands(item) === 2;
}

function _egIsOneHandedWeapon(item) {
    return item && item.slotType === 'weapon' && _egGetWeaponHands(item) === 1;
}

// True when both hand slots hold 1H weapons (dual-wield parry bonus active).
function _egIsDualWielding(loadout) {
    const eq = loadout || (typeof _egEquipped !== 'undefined' ? _egEquipped : {});
    if (!eq) return false;
    return _egIsOneHandedWeapon(eq.weapon1) && _egIsOneHandedWeapon(eq.weapon2);
}

// True when a shield sits in the off-hand (the ONLY setup that can block).
function _egHasShieldEquipped(loadout) {
    const eq = loadout || (typeof _egEquipped !== 'undefined' ? _egEquipped : {});
    if (!eq) return false;
    return !!(eq.weapon2 && eq.weapon2.slotType === 'shield');
}

// Validates a pending equip against the simulated final loadout (the loadout
// as it would look after the move). Returns { ok:true } or
// { ok:false, handError:'two_handed_blocks_offhand' | 'offhand_blocked_by_two_hander'
//   | 'offhand_single_handed_only', missing: [] }.
function _egCheckHandCompatibilityInSlot(item, slotId) {
    if (!item || item.category !== 'equip') return { ok: true };
    if (typeof _egEquipped === 'undefined') return { ok: true };
    const sim = {};
    Object.keys(_egEquipped).forEach(k => { if (_egEquipped[k]) sim[k] = _egEquipped[k]; });
    // Mirror _egCanEquipInSlot simulation: item leaves any slot it occupies,
    // target occupant leaves, item enters.
    Object.keys(sim).forEach(k => { if (sim[k] === item) delete sim[k]; });
    delete sim[slotId];
    sim[slotId] = item;

    const main = sim.weapon1 || null;
    const off = sim.weapon2 || null;

    // weapon1 accepts melee weapons only (never shields → no dual shields).
    if (slotId === 'weapon1' && item.slotType === 'shield') {
        return { ok: false, handError: 'main_hand_no_shield', missing: [] };
    }
    // weapon2 accepts shields or ONE-handed weapons only.
    if (slotId === 'weapon2') {
        if (item.slotType !== 'shield' && !_egIsOneHandedWeapon(item)) {
            return { ok: false, handError: 'offhand_single_handed_only', missing: [] };
        }
    }
    // A 2H weapon needs a free off-hand.
    if (main && _egIsTwoHandedWeapon(main) && off) {
        return { ok: false, handError: 'two_handed_blocks_offhand', missing: [] };
    }
    // Nothing may enter the off-hand while a 2H weapon holds the main hand.
    if (slotId === 'weapon2' && main && _egIsTwoHandedWeapon(main)) {
        return { ok: false, handError: 'offhand_blocked_by_two_hander', missing: [] };
    }
    return { ok: true };
}

// Localized hand-error message (falls back to EN when t() lacks the key).
function _egHandErrorMessage(handError, item) {
    const name = (item && item.name) || '?';
    try {
        if (handError === 'two_handed_blocks_offhand' && typeof t === 'function') {
            const s = t('eg_cannot_equip_two_handed');
            if (s && s !== 'eg_cannot_equip_two_handed') return s.replace('{name}', name);
        }
        if ((handError === 'offhand_blocked_by_two_hander' || handError === 'offhand_single_handed_only') && typeof t === 'function') {
            const s = t('eg_cannot_equip_offhand');
            if (s && s !== 'eg_cannot_equip_offhand') return s.replace('{name}', name);
        }
        if (handError === 'main_hand_no_shield' && typeof t === 'function') {
            const s = t('eg_cannot_equip_main_shield');
            if (s && s !== 'eg_cannot_equip_main_shield') return s.replace('{name}', name);
        }
    } catch (e) {}
    if (handError === 'two_handed_blocks_offhand') return `⚠️ ${name} is two-handed — free the off-hand first`;
    if (handError === 'offhand_blocked_by_two_hander') return `⚠️ Cannot use the off-hand while a two-handed weapon is equipped`;
    if (handError === 'offhand_single_handed_only') return `⚠️ ${name} cannot go in the off-hand — one-handed weapons or shields only`;
    return `⚠️ ${name} cannot go into that slot`;
}

// Heals a legacy weapon item saved before the 1H/2H split (no `hands`).
// Mutates in place, returns true when changed.
function _egHealWeaponHands(item) {
    if (!item || item.category !== 'equip' || item.slotType !== 'weapon') return false;
    if (item.hands === 1 || item.hands === 2) return false;
    let hands = null;
    if (typeof EG_ALL_BASE_TYPES !== 'undefined' && Array.isArray(EG_ALL_BASE_TYPES) && item.baseId) {
        const base = EG_ALL_BASE_TYPES.find(b => b.id === item.baseId);
        if (base && (base.hands === 1 || base.hands === 2)) hands = base.hands;
    }
    if (hands == null && typeof _egInferWeaponHands === 'function') {
        try { hands = _egInferWeaponHands(item); } catch (e) { hands = null; }
    }
    if (hands !== 1 && hands !== 2) hands = 1;
    item.hands = hands;
    return true;
}

// PoE-style: equipping a 2H weapon auto-unequips the off-hand into the stash.
// Returns true when the off-hand was freed (or was already empty), false when
// the move must stay blocked (e.g. freeing the off-hand would break other
// gear's requirements, or no stash space). Callers re-run _egCanEquipInSlot
// after a successful return.
function _egTryAutoUnequipOffhandForTwoHander() {    if (typeof _egEquipped === 'undefined' || !_egEquipped.weapon2) return true;
    // Chain safety: freeing the off-hand must not break remaining gear.
    try {
        const gate = _egCheckUnequipSlot('weapon2');
        if (!gate.ok) {
            _egShowRequirementsToast('unequip', gate, _egEquipped.weapon2.name || '?');
            return false;
        }
    } catch (e) {}
    const off = _egEquipped.weapon2;
    try {
        if (typeof _egFindFreeInvCell === 'function' && typeof _egInventory !== 'undefined' && _egInventory) {
            const pos = _egFindFreeInvCell();
            if (typeof _egEnsureInvRows === 'function') _egEnsureInvRows(pos.r + 1);
            _egInventory[pos.r][pos.c] = off;
            delete _egEquipped.weapon2;
            if (typeof _egRenderEquipSlot === 'function') _egRenderEquipSlot('weapon2');
            if (typeof _egRenderInventoryCell === 'function') _egRenderInventoryCell(pos.r, pos.c);
            if (typeof _egRenderInventory === 'function') _egRenderInventory();
            if (typeof _egUpdateInvCount === 'function') _egUpdateInvCount();
            if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
            if (typeof egSaveHubState === 'function') egSaveHubState();
            return true;
        }
    } catch (e) {}
    return false;
}


//------------------------------------------------------------------------
//-------------------LEGACY HAND MIGRATION--------------------------------
//------------------------------------------------------------------------
// One-time repair for saves made before the 1H/2H split: a 2H weapon plus an
// occupied off-hand (or any other illegal hand combo) can no longer stay
// equipped. Runs inside _egLoadHubState — i.e. on every character-sheet open,
// AFTER the hands heal — so the very next sheet visit after the update shows
// a legal, working loadout. Displaced items always land in the (unlimited)
// stash, so nothing is ever lost. Deliberately unconditional (no chain gate):
// legality is guaranteed and any newly-unmet requirements simply flag red,
// exactly as if the player had unequipped the item themselves.
// Returns an array of { slotId, item } moves ([] when nothing was illegal).
function _egMigrateIllegalHandsToStash() {
    const moved = [];
    try {
        if (typeof _egEquipped === 'undefined' || !_egEquipped) return moved;
        if (typeof _egInventory === 'undefined' || !Array.isArray(_egInventory)) return moved;
        // Heal hands first so classification below sees the truth.
        try {
            if (_egEquipped.weapon1) _egHealWeaponHands(_egEquipped.weapon1);
            if (_egEquipped.weapon2) _egHealWeaponHands(_egEquipped.weapon2);
        } catch (e) {}
        const moveSlotToStash = (slotId) => {
            const it = _egEquipped[slotId];
            if (!it) return false;
            // Unlimited stash: first free cell, grow by a row when full.
            // Written inline (no drag-drop dependency) so this also works at
            // script parse time, before later files have been evaluated.
            let pos = null;
            for (let r = 0; r < _egInventory.length && !pos; r++) {
                if (!Array.isArray(_egInventory[r])) continue;
                for (let c = 0; c < _egInventory[r].length; c++) {
                    if (!_egInventory[r][c]) { pos = { r, c }; break; }
                }
            }
            if (!pos) {
                try {
                    if (typeof _egEnsureInvRows === 'function') _egEnsureInvRows(_egInventory.length + 1);
                    else _egInventory.push(Array(typeof EG_INV_COLS !== 'undefined' ? EG_INV_COLS : 24).fill(null));
                } catch (e) { return false; }
                pos = { r: _egInventory.length - 1, c: 0 };
            }
            try {
                _egInventory[pos.r][pos.c] = it;
                delete _egEquipped[slotId];
                moved.push({ slotId, item: it });
                return true;
            } catch (e) { return false; }
        };
        // Pathological first: a shield in the main hand can never be legal.
        if (_egEquipped.weapon1 && _egEquipped.weapon1.slotType === 'shield') moveSlotToStash('weapon1');
        // Pathological: a 2H weapon in the off-hand can never be legal.
        if (_egEquipped.weapon2 && _egEquipped.weapon2.slotType === 'weapon'
            && !_egIsOneHandedWeapon(_egEquipped.weapon2)) moveSlotToStash('weapon2');
        // The pre-patch classic: 2H main hand plus an occupied off-hand.
        if (_egEquipped.weapon1 && _egIsTwoHandedWeapon(_egEquipped.weapon1) && _egEquipped.weapon2) {
            moveSlotToStash('weapon2');
        }
    } catch (e) {}
    return moved;
}
