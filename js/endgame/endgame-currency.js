//------------------------------------------------------------------------
//-------------------ENDGAME CURRENCY (PoE-STYLE ORBS)--------------------
//------------------------------------------------------------------------
// Defines currency orbs that drop from monsters, stack in the currency
// strip, and can be applied to equipment items via right-click-then-
// left-click ("use mode").
//
// Load AFTER endgame-equipment-generator.js (needs _egGetModTable,
// _egRollModCounts, _egRollMods, _egBuildItemName, _egBuildModPool,
// _egPickModFromPool, _egPickTier, _egBuildRolledStats, EG_MOD_CAPS)
// and AFTER endgame-hub-drag-and-drop.js (needs egAddCurrency,
// _egCurrencyStash, render helpers).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------ORB DEFINITIONS----------------------------------
//------------------------------------------------------------------------

// Rerolls an item's mods entirely at the given rarity/counts.
function _egRerollItemMods(item, rarity, prefixCount, suffixCount) {
    const modTable = _egGetModTable(item);
    const mods = modTable ? _egRollMods(prefixCount, suffixCount, modTable, item.itemLevel || 1, item.defenses) : [];
    const name = _egBuildItemName(item.baseName || item.name, rarity, mods);
    return { ...item, rarity, mods, name };
}

// Adds ONE new mod (prefix or suffix, whichever has room) to an item,
// respecting the mod caps of the given rarity. Returns the item unchanged
// if no eligible mod/slot was found.
function _egAddOneModToItem(item, rarityForCaps) {
    const modTable = _egGetModTable(item);
    if (!modTable) return item;

    const existing = item.mods || [];
    const chosenFamilyIds = new Set(existing.map(m => m.familyId));
    const prefixCount = existing.filter(m => m.type === 'prefix').length;
    const suffixCount = existing.filter(m => m.type === 'suffix').length;
    const cap = EG_MOD_CAPS[rarityForCaps];

    const sections = [];
    if (prefixCount < cap.maxPre) sections.push({ type: 'prefix', pool: modTable.prefixes });
    if (suffixCount < cap.maxSuf) sections.push({ type: 'suffix', pool: modTable.suffixes });
    if (sections.length === 0) return item;

    const chosen = sections[Math.floor(Math.random() * sections.length)];
    const pool = _egBuildModPool(chosen.pool, item.itemLevel || 1, chosenFamilyIds, item.defenses);
    const entry = _egPickModFromPool(pool);
    if (!entry) return item;

    const tier = _egPickTier(entry.tiers);
    const newMod = {
        familyId: entry.familyId,
        type: chosen.type,
        tier: tier.tier,
        rolledStats: _egBuildRolledStats(entry.family, tier),
    };

    return { ...item, mods: [...existing, newMod] };
}

// Re-rolls the numeric VALUES of every modifier within its existing tier
// (Divine Orb semantics). Families, tiers and rarity are kept untouched.
function _egRerollItemModValues(item, modTable) {
    if (!modTable) return item;
    const mods = (item.mods || []).map(mod => {
        const section = mod.type === 'prefix' ? modTable.prefixes : modTable.suffixes;
        const family = section && (section[mod.familyId]
            || Object.values(section).find(f => f.id === mod.familyId));
        const tierObj = family && family.tiers.find(tr => tr.tier === mod.tier);
        if (!family || !tierObj) return mod; // unknown family/tier — keep as-is
        return { ...mod, rolledStats: _egBuildRolledStats(family, tierObj) };
    });
    return { ...item, mods };
}

// Removes ONE random modifier from an item (Annulment semantics).
// Rarity is kept untouched, even if fewer mods than the cap remain.
function _egRemoveOneModFromItem(item) {
    const existing = item.mods || [];
    if (existing.length === 0) return item;
    const index = Math.floor(Math.random() * existing.length);
    const mods = existing.filter((_, i) => i !== index);
    const name = _egBuildItemName(item.baseName || item.name, item.rarity, mods);
    return { ...item, mods, name };
}

const EG_CURRENCY_DEFS = {

    orb_transmutation: {
        id: 'orb_transmutation', name: t('eg_orb_transmutation'), icon: '🔷',
        description: t('eg_orb_transmutation_desc'),
        canApply(item) { return item.rarity === 'common'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollItemMods(item, 'uncommon', prefixCount, suffixCount);
        },
    },

    orb_alteration: {
        id: 'orb_alteration', name: t('eg_orb_alteration'), icon: '🔵',
        description: t('eg_orb_alteration_desc'),
        canApply(item) { return item.rarity === 'uncommon'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('uncommon');
            return _egRerollItemMods(item, 'uncommon', prefixCount, suffixCount);
        },
    },

    orb_augmentation: {
        id: 'orb_augmentation', name: t('eg_orb_augmentation'), icon: '🔹',
        description: t('eg_orb_augmentation_desc'),
        canApply(item) { return item.rarity === 'uncommon' && (item.mods || []).length === 1; },
        apply(item) {
            const updated = _egAddOneModToItem(item, 'uncommon');
            const name = _egBuildItemName(updated.baseName || updated.name, updated.rarity, updated.mods);
            return { ...updated, name };
        },
    },

    orb_regal: {
        id: 'orb_regal', name: t('eg_orb_regal'), icon: '🟣',
        description: t('eg_orb_regal_desc'),
        canApply(item) { return item.rarity === 'uncommon'; },
        apply(item) {
            const updated = _egAddOneModToItem({ ...item, rarity: 'rare' }, 'rare');
            const name = _egBuildItemName(updated.baseName || updated.name, 'rare', updated.mods);
            return { ...updated, rarity: 'rare', name };
        },
    },

    orb_alchemy: {
        id: 'orb_alchemy', name: t('eg_orb_alchemy'), icon: '🟡',
        description: t('eg_orb_alchemy_desc'),
        canApply(item) { return item.rarity === 'common'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollItemMods(item, 'rare', prefixCount, suffixCount);
        },
    },

    orb_chaos: {
        id: 'orb_chaos', name: t('eg_orb_chaos'), icon: '🟠',
        description: t('eg_orb_chaos_desc'),
        canApply(item) { return item.rarity === 'rare'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('rare');
            return _egRerollItemMods(item, 'rare', prefixCount, suffixCount);
        },
    },

    orb_scouring: {
        id: 'orb_scouring', name: t('eg_orb_scouring'), icon: '⚪',
        description: t('eg_orb_scouring_desc'),
        canApply(item) { return item.rarity !== 'common'; },
        apply(item) {
            return { ...item, rarity: 'common', mods: [], name: item.baseName || item.name };
        },
    },

    orb_exalted: {
        id: 'orb_exalted', name: t('eg_orb_exalted'), icon: '🔴',
        description: t('eg_orb_exalted_desc'),
        canApply(item) {
            if (item.rarity !== 'rare' && item.rarity !== 'epic') return false;
            return (item.mods || []).length < EG_MOD_CAPS.epic.maxTotal;
        },
        apply(item) {
            const updated = _egAddOneModToItem({ ...item, rarity: 'epic' }, 'epic');
            const name = _egBuildItemName(updated.baseName || updated.name, 'epic', updated.mods);
            return { ...updated, rarity: 'epic', name };
        },
    },

    // Re-rolls the values of all modifiers within their current tiers.
    orb_divine: {
        id: 'orb_divine', name: t('eg_orb_divine'), icon: '🌟',
        description: t('eg_orb_divine_desc'),
        canApply(item) { return (item.mods || []).length > 0; },
        apply(item) {
            return _egRerollItemModValues(item, _egGetModTable(item));
        },
    },

    // Common -> Epic directly ("alchemy for epic").
    orb_ascension: {
        id: 'orb_ascension', name: t('eg_orb_ascension'), icon: '🔮',
        description: t('eg_orb_ascension_desc'),
        canApply(item) { return item.rarity === 'common'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollItemMods(item, 'epic', prefixCount, suffixCount);
        },
    },

    // Rare -> Epic directly.
    orb_elevation: {
        id: 'orb_elevation', name: t('eg_orb_elevation'), icon: '✨',
        description: t('eg_orb_elevation_desc'),
        canApply(item) { return item.rarity === 'rare'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollItemMods(item, 'epic', prefixCount, suffixCount);
        },
    },

    // Full stat reroll on an already-epic item ("chaos for epic").
    orb_cataclysm: {
        id: 'orb_cataclysm', name: t('eg_orb_cataclysm'), icon: '💥',
        description: t('eg_orb_cataclysm_desc'),
        canApply(item) { return item.rarity === 'epic'; },
        apply(item) {
            const { prefixCount, suffixCount } = _egRollModCounts('epic');
            return _egRerollItemMods(item, 'epic', prefixCount, suffixCount);
        },
    },

    // Common -> random rarity (uncommon/rare/epic), like PoE's Chance Orb.
    orb_chance: {
        id: 'orb_chance', name: t('eg_orb_chance'), icon: '🎲',
        description: t('eg_orb_chance_desc'),
        canApply(item) { return item.rarity === 'common'; },
        apply(item) {
            const roll = Math.random();
            const rarity = roll < 0.60 ? 'uncommon' : (roll < 0.90 ? 'rare' : 'epic');
            const { prefixCount, suffixCount } = _egRollModCounts(rarity);
            return _egRerollItemMods(item, rarity, prefixCount, suffixCount);
        },
    },

    // Removes ONE random modifier (rarity is kept).
    orb_annulment: {
        id: 'orb_annulment', name: t('eg_orb_annulment'), icon: '✂️',
        description: t('eg_orb_annulment_desc'),
        canApply(item) { return (item.mods || []).length > 0; },
        apply(item) {
            return _egRemoveOneModFromItem(item);
        },
    },

    // Creates a copy of an item in the next free inventory slot.
    // The copy is a fully independent item that can be modified further
    // with any other currency.
    mirror_of_kalandra: {
        id: 'mirror_of_kalandra', name: t('eg_orb_mirror'), icon: '🪞',
        description: t('eg_orb_mirror_desc'),
        isMirror: true,
        canApply(item) { return item.category === 'equip'; },
    },
};


//------------------------------------------------------------------------
//-------------------CURRENCY DROPS FROM MONSTERS--------------------------
//------------------------------------------------------------------------

const EG_CURRENCY_DROP_TABLE = [
    { id: 'orb_transmutation', weight: 400 },
    { id: 'orb_augmentation', weight: 300 },
    { id: 'orb_alteration', weight: 260 },
    { id: 'orb_scouring', weight: 200 },
    { id: 'orb_alchemy', weight: 220 },
    { id: 'orb_chance', weight: 110 },
    { id: 'orb_annulment', weight: 40 },
    { id: 'orb_regal', weight: 90 },
    { id: 'orb_chaos', weight: 55 },
    { id: 'orb_divine', weight: 35 },
    // Epic-tier orbs — deliberately much more common than before so that
    // endgame crafting is actually reachable through normal play.
    { id: 'orb_elevation', weight: 45 },
    { id: 'orb_cataclysm', weight: 30 },
    { id: 'orb_ascension', weight: 22 },
    { id: 'orb_exalted', weight: 22 },
    // Mirror stays genuinely rare, but shows up over a long session.
    { id: 'mirror_of_kalandra', weight: 5 },
];

const EG_CURRENCY_DROP_CHANCE_NORMAL = 0.25; // 25% per normal kill
const EG_CURRENCY_DROP_CHANCE_BOSS = 0.90;   // bosses almost always drop one

function _egRollCurrencyDef() {
    const total = EG_CURRENCY_DROP_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_CURRENCY_DROP_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) return EG_CURRENCY_DEFS[entry.id];
    }
    return EG_CURRENCY_DEFS.orb_transmutation;
}


// Called on monster death (see endgame-encounter.js edit below).
// Orbs now land on the grid and must be picked up, just like equipment loot.
function _egTryDropCurrency(isBoss) {
    const baseChance = isBoss ? EG_CURRENCY_DROP_CHANCE_BOSS : EG_CURRENCY_DROP_CHANCE_NORMAL;
    // Active map's loot quantity bonus scales the drop chance up.
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const chance = Math.min(1, baseChance * qtyMult);
    if (Math.random() > chance) return;

    const def = _egRollCurrencyDef();
    if (!def) return;

    if (typeof _egSpawnCurrencyDrop === 'function') {
        _egSpawnCurrencyDrop(def);
    }
}


//------------------------------------------------------------------------
//-------------------ORB "USE MODE" (right-click orb, left-click item)----
//------------------------------------------------------------------------

let _egPendingCurrencyUse = null; // { defId, sourceRow, sourceCol }

function _egStartCurrencyUse(def, row, col, chipEl) {
    _egPendingCurrencyUse = { defId: def.id, sourceRow: row, sourceCol: col };
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    if (chipEl) chipEl.classList.add('eg-currency-selected');
    document.body.classList.add('eg-currency-use-active');
    showToast(t('eg_currency_selected')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
}

function _egCancelCurrencyUse(silent) {
    if (!_egPendingCurrencyUse) return;
    _egPendingCurrencyUse = null;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    document.body.classList.remove('eg-currency-use-active');
    if (!silent) showToast(t('eg_currency_cancelled'));
}

// Keeps use-mode active after an application (shift-click chaining, like
// PoE). The currency cell may have been re-rendered by the application,
// so the chip element is re-acquired from the DOM.
function _egRefreshCurrencyUseHighlight() {
    if (!_egPendingCurrencyUse) return;
    const { sourceRow, sourceCol } = _egPendingCurrencyUse;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    const chip = document.querySelector(
        `.eg-currency-cell[data-row="${sourceRow}"][data-col="${sourceCol}"] .eg-item-chip`);
    if (chip) {
        chip.classList.add('eg-currency-selected');
        document.body.classList.add('eg-currency-use-active');
    } else {
        _egCancelCurrencyUse(true);
    }
}

function _egApplyCurrencyToItem(item, applyFn, chipEl, keepActive) {
    if (!_egPendingCurrencyUse) return;
    const { sourceRow, sourceCol, defId } = _egPendingCurrencyUse;
    const def = EG_CURRENCY_DEFS[defId];
    const stack = _egCurrencyStash[sourceRow][sourceCol];

    if (!def || !stack || stack.id !== defId) {
        _egCancelCurrencyUse(true);
        return;
    }

    // Maps use the dedicated map rules (EG_MAP_CURRENCY_RULES in
    // endgame-maps.js) so orbs roll from the MAP modifier tables.
    const isMap = item.category === 'map';
    const mapRule = isMap && typeof EG_MAP_CURRENCY_RULES !== 'undefined'
        ? EG_MAP_CURRENCY_RULES[defId]
        : null;

    if (isMap && !mapRule) {
        showToast(t('eg_currency_cannot_use').replace('{name}', def.name));
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelCurrencyUse(true);
        return;
    }

    // Non-mirror map orbs must satisfy the map rule's own rarity gate.
    if (isMap && defId !== 'mirror_of_kalandra' && !mapRule.canApply(item)) {
        showToast(t('eg_currency_cannot_use').replace('{name}', def.name));
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelCurrencyUse(true);
        return;
    }

    if (!isMap && (item.category !== 'equip' || !def.canApply(item))) {
        showToast(t('eg_currency_cannot_use').replace('{name}', def.name));
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelCurrencyUse(true);
        return;
    }

    // Mirror: instead of modifying the target, create an independent copy.
    // Equipment copies go to the main inventory; map copies go to the
    // Probability Gate map stash. The copy keeps the original untouched and
    // can itself be modified further with any other currency.
    if ((isMap && defId === 'mirror_of_kalandra') || (!isMap && def.isMirror)) {
        const copyToMapStash = isMap;
        const rows = copyToMapStash ? EG_MAP_STASH_ROWS : EG_INV_ROWS;
        const cols = copyToMapStash ? EG_MAP_STASH_COLS : EG_INV_COLS;
        const grid = copyToMapStash ? _egMapStash : _egInventory;

        let freeR = -1, freeC = -1;
        outer:
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!grid[r][c]) { freeR = r; freeC = c; break outer; }
            }
        }
        if (freeR === -1) {
            showToast(copyToMapStash ? t('eg_map_stash_full') : t('eg_inventory_full'));
            _egCancelCurrencyUse(true);
            return;
        }

        const copy = JSON.parse(JSON.stringify(item));
        copy.mirrored = true;
        grid[freeR][freeC] = copy;
        if (copyToMapStash) _egRenderMapStashCell(freeR, freeC);
        else _egRenderInventoryCell(freeR, freeC);
        if (!copyToMapStash && typeof _egUpdateInvCount === 'function') _egUpdateInvCount();

        // Consume one mirror from the stack.
        stack.count = (stack.count || 1) - 1;
        if (stack.count <= 0) _egCurrencyStash[sourceRow][sourceCol] = null;
        _egRenderCurrencyCell(sourceRow, sourceCol);

        // Shift-click chaining: keep the mirror selected while stacks remain.
        if (keepActive && stack.count > 0) {
            _egRefreshCurrencyUseHighlight();
            showToast(t('eg_mirror_created').replace('{name}', copy.name));
            egSaveHubState();
            return;
        }

        _egCancelCurrencyUse(true);
        showToast(t('eg_mirror_created').replace('{name}', copy.name));
        egSaveHubState();
        return;
    }

    const newItem = isMap ? mapRule.apply(item) : def.apply(item);
    applyFn(newItem);

    // Consume one orb from the stack.
    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _egCurrencyStash[sourceRow][sourceCol] = null;
    _egRenderCurrencyCell(sourceRow, sourceCol);

    // Shift-click chaining: keep the orb selected so further shift-clicks
    // re-use it on the next target until the stack runs out.
    if (keepActive && stack.count > 0) {
        _egRefreshCurrencyUseHighlight();
        showToast(t('eg_currency_applied').replace('{name}', def.name));
        if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
        egSaveHubState();
        return;
    }

    _egCancelCurrencyUse(true);
    showToast(t('eg_currency_applied').replace('{name}', def.name));
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    egSaveHubState();
}

// Right-click on a currency chip: start or cancel "use mode".
// Registered early (script load time) so it fires before the DnD file's
// contextmenu handler (bound later, at hub-open time) and can stop it
// from also processing the click.
document.addEventListener('contextmenu', function (e) {
    const chip = e.target.closest('.eg-item-chip');
    // Active on both the hub and the Probability Gate screens (shared state).
    if (!chip || (typeof _dndChipScreenEl === 'function' ? !_dndChipScreenEl(chip) : !chip.closest('#screen-endgame-hub'))) return;

    const currencyCell = chip.closest('.eg-currency-cell');
    if (!currencyCell) return; // not currency — let the normal handler deal with it

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +currencyCell.dataset.row, c = +currencyCell.dataset.col;
    const item = _egCurrencyStash[r][c];
    if (!item) return;

    if (!item.category) return; // empty cell

    const def = EG_CURRENCY_DEFS[item.id];
    if (!def || (typeof def.apply !== 'function' && !def.isMirror)) {
        showToast(t('eg_no_usable_effect'));
        return;
    }

    if (_egPendingCurrencyUse && _egPendingCurrencyUse.sourceRow === r && _egPendingCurrencyUse.sourceCol === c) {
        _egCancelCurrencyUse();
    } else {
        _egStartCurrencyUse(def, r, c, chip);
    }
}, true);

// Left-click while an orb is selected: apply it to the clicked item,
// or cancel if the click isn't a valid target. Registered early so it
// pre-empts the DnD file's drag-pickup mousedown listener.
document.addEventListener('mousedown', function (e) {
    if (!_egPendingCurrencyUse) return;
    if (e.button !== 0) return;

    const chip = e.target.closest('.eg-item-chip');
    // Active on both the hub and the Probability Gate screens (shared state).
    const onManagedScreen = !!chip && (typeof _dndChipScreenEl === 'function'
        ? !!_dndChipScreenEl(chip)
        : !!chip.closest('#screen-endgame-hub'));
    if (!onManagedScreen) {
        _egCancelCurrencyUse();
        return;
    }

    if (chip.closest('.eg-currency-cell')) {
        _egCancelCurrencyUse(); // clicking any orb cancels use-mode
        return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const invCell = chip.closest('.eg-inv-cell:not(.eg-currency-cell):not(.eg-map-stash-cell):not(.eg-essence-cell)');
    const equipSlot = chip.closest('.eg-equip-slot');
    // Map targets: map stash cells and the map device slot (gate screen).
    const mapStashCell = chip.closest('.eg-map-stash-cell');
    const mapSlotEl = chip.closest('#eg-map-slot');

    let targetItem = null, applyFn = null;
    if (mapStashCell) {
        const r = +mapStashCell.dataset.row, c = +mapStashCell.dataset.col;
        targetItem = _egMapStash[r][c];
        applyFn = (newItem) => { _egMapStash[r][c] = newItem; _egRenderMapStashCell(r, c); };
    } else if (mapSlotEl) {
        targetItem = _egMapSlotItem;
        applyFn = (newItem) => { _egMapSlotItem = newItem; _egRenderMapSlot(); };
    } else if (invCell) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        targetItem = _egInventory[r][c];
        applyFn = (newItem) => { _egInventory[r][c] = newItem; _egRenderInventoryCell(r, c); };
    } else if (equipSlot) {
        const slotId = equipSlot.dataset.slotId;
        targetItem = _egEquipped[slotId] || null;
        applyFn = (newItem) => {
            _egEquipped[slotId] = newItem;
            _egRenderEquipSlot(slotId);
            // Rerolled mods change the attribute totals, which can flip the
            // requirement-blocked (red) state of other items — refresh both
            // the stash and all paperdoll slots.
            _egRenderInventory();
            _egRenderEquipSlots();
        };
    } else {
        _egCancelCurrencyUse();
        return;
    }

    if (!targetItem) {
        showToast(t('eg_no_item_target'));
        _egCancelCurrencyUse(true);
        return;
    }

    _egApplyCurrencyToItem(targetItem, applyFn, chip, e.shiftKey);
}, true);

// Escape cancels a pending currency use too.
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _egPendingCurrencyUse) _egCancelCurrencyUse();
});


//------------------------------------------------------------------------
//-------------------TOOLTIP OVERRIDE (currency items)---------------------
//------------------------------------------------------------------------
// Overrides _egShowTooltip from endgame-hub.js: currency items get a
// simple description tooltip; equipment still uses the full stat block.
// Renders into the floating game tooltip (tooltips-hud.js) instead of
// the old tooltip panel.

function _egShowTooltip(item, e) {
    _egTooltipItem = item;

    if (!item) {
        hideGameTooltip();
        _egHideCompareTooltip();
        return;
    }

    let html;
    if (item.category === 'currency' || item.category === 'essence') {
        const countLine = item.count > 1 ? ` <span class="eg-tooltip-count">×${item.count}</span>` : '';
        html = `
<div class="eg-tt-frame" style="--tt-border:#b59248;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${item.icon || '📦'}</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${item.name || '???'}${countLine}</div>
        <div class="eg-tt-rarity-line" style="color:#b59248;">${item.category === 'essence' ? t('eg_rarity_essence') : t('eg_rarity_currency')}</div>
    </div>
    <div class="eg-tt-section"><div class="eg-tt-desc">${item.description || ''}</div></div>
</div>`;
    } else if (item.category === 'map' && typeof _egBuildMapTooltipBodyHTML === 'function') {
        // Maps get their own tooltip with mods grouped by
        // monster / player / puzzle categories (endgame-maps.js).
        html = _egBuildMapTooltipBodyHTML(item);
    } else {
        html = _egBuildTooltipBodyHTML(item);
    }

    showGameTooltip(html, e || {
        clientX: _egLastMouse.x,
        clientY: _egLastMouse.y,
    });
    _egUpdateCompareTooltip();
}


//------------------------------------------------------------------------
//-------------------CSS INJECTION-----------------------------------------
//------------------------------------------------------------------------

(function _egInjectCurrencyStyles() {
    if (document.getElementById('eg-currency-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-currency-styles';
    style.textContent = `
        .eg-item-chip.eg-currency-selected {
            outline: 2px solid #f5d98a;
            box-shadow: 0 0 10px rgba(245,217,138,0.8);
            border-radius: 6px;
        }
        body.eg-currency-use-active .eg-item-chip { cursor: crosshair; }
        .eg-tt-desc { color: #ccc; font-size: 0.85rem; padding: 4px 0; }
    `;
    document.head.appendChild(style);
})();