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
    const mods = modTable ? _egRollMods(prefixCount, suffixCount, modTable, item.itemLevel || 1) : [];
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
    const pool = _egBuildModPool(chosen.pool, item.itemLevel || 1, chosenFamilyIds);
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
};


//------------------------------------------------------------------------
//-------------------CURRENCY DROPS FROM MONSTERS--------------------------
//------------------------------------------------------------------------

const EG_CURRENCY_DROP_TABLE = [
    { id: 'orb_transmutation', weight: 400 },
    { id: 'orb_augmentation', weight: 250 },
    { id: 'orb_alteration', weight: 200 },
    { id: 'orb_scouring', weight: 150 },
    { id: 'orb_alchemy', weight: 80 },
    { id: 'orb_regal', weight: 60 },
    { id: 'orb_chaos', weight: 30 },
    { id: 'orb_exalted', weight: 5 },
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
    const chance = isBoss ? EG_CURRENCY_DROP_CHANCE_BOSS : EG_CURRENCY_DROP_CHANCE_NORMAL;
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

function _egApplyCurrencyToItem(item, applyFn, chipEl) {
    if (!_egPendingCurrencyUse) return;
    const { sourceRow, sourceCol, defId } = _egPendingCurrencyUse;
    const def = EG_CURRENCY_DEFS[defId];
    const stack = _egCurrencyStash[sourceRow][sourceCol];

    if (!def || !stack || stack.id !== defId) {
        _egCancelCurrencyUse(true);
        return;
    }

    if (item.category !== 'equip' || !def.canApply(item)) {
        showToast(t('eg_currency_cannot_use').replace('{name}', def.name));
        if (chipEl) {
            chipEl.classList.add('eg-slot-reject');
            setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
        }
        _egCancelCurrencyUse(true);
        return;
    }

    const newItem = def.apply(item);
    applyFn(newItem);

    // Consume one orb from the stack.
    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _egCurrencyStash[sourceRow][sourceCol] = null;
    _egRenderCurrencyCell(sourceRow, sourceCol);

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
    if (!chip || !chip.closest('#screen-endgame-hub')) return;

    const currencyCell = chip.closest('.eg-currency-cell');
    if (!currencyCell) return; // not currency — let the normal handler deal with it

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +currencyCell.dataset.row, c = +currencyCell.dataset.col;
    const item = _egCurrencyStash[r][c];
    if (!item) return;

    const def = EG_CURRENCY_DEFS[item.id];
    if (!def || typeof def.apply !== 'function') {
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
    if (!chip || !chip.closest('#screen-endgame-hub')) {
        _egCancelCurrencyUse();
        return;
    }

    if (chip.closest('.eg-currency-cell')) {
        _egCancelCurrencyUse(); // clicking any orb cancels use-mode
        return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const invCell = chip.closest('.eg-inv-cell:not(.eg-currency-cell):not(.eg-map-stash-cell)');
    const equipSlot = chip.closest('.eg-equip-slot');

    let targetItem = null, applyFn = null;
    if (invCell) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        targetItem = _egInventory[r][c];
        applyFn = (newItem) => { _egInventory[r][c] = newItem; _egRenderInventoryCell(r, c); };
    } else if (equipSlot) {
        const slotId = equipSlot.dataset.slotId;
        targetItem = _egEquipped[slotId] || null;
        applyFn = (newItem) => { _egEquipped[slotId] = newItem; _egRenderEquipSlot(slotId); };
    } else {
        _egCancelCurrencyUse();
        return;
    }

    if (!targetItem) {
        showToast(t('eg_no_item_target'));
        _egCancelCurrencyUse(true);
        return;
    }

    _egApplyCurrencyToItem(targetItem, applyFn, chip);
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

function _egShowTooltip(item) {
    _egTooltipItem = item;
    const panel = document.getElementById('eg-tooltip-panel-body');
    if (!panel) return;

    if (!item) {
        panel.innerHTML = `<span class="eg-tooltip-empty">${t('eg_tooltip_hover_hint')}</span>`;
        return;
    }

    if (item.category === 'currency') {
        const countLine = item.count > 1 ? ` <span class="eg-tooltip-count">×${item.count}</span>` : '';
        panel.innerHTML = `
<div class="eg-tt-frame" style="--tt-border:#b59248;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${item.icon || '📦'}</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${item.name || '???'}${countLine}</div>
        <div class="eg-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_currency')}</div>
    </div>
    <div class="eg-tt-section"><div class="eg-tt-desc">${item.description || ''}</div></div>
</div>`;
        return;
    }

    panel.innerHTML = _egBuildTooltipBodyHTML(item);
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