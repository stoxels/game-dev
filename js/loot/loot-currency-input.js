//----------------------------------------------------------------------
//-----------------------CURRENCY INPUT LISTENERS-----------------------
//----------------------------------------------------------------------

// The three document-level listeners that drive currency use:
// right-click to enter use-mode, left-click to apply, Escape to
// cancel. Bound at load time so they pre-empt the drag-and-drop
// handlers bound later at hub open.

import { t } from '../translation/translations.js';
import { _egRenderMapSlot, _egRenderMapStashCell, _egSwitchMapStashTier, _egUpdateMapStashTabCounts } from '../endgame/endgame-gate.js';
import { _dndChipScreenEl } from '../endgame/endgame-hub-drag-and-drop.js';
import { EG_MAP_STASH_COLS, _egCurrencyStash, _egEquipped, _egFindFreeMapCellForTier, _egGetMapTierGrid, _egHealCurrencyItem, _egInventory, _egMapStash, _egRebuildMapStashGrid, _egRenderEquipSlot, _egRenderEquipSlots, _egRenderInventory, _egRenderInventoryCell, _egShowStashInfo } from '../endgame/endgame-hub.js';
import { EG_CURRENCY_DEFS } from './loot-currency.js';
import { _egApplyCurrencyToItem, _egCancelCurrencyUse, _egPendingCurrencyUse, _egStartCurrencyUse } from './loot-currency-use.js';
import { EG_SHARD_DEFS } from './loot-shards.js';


// Right-click on a currency chip: start or cancel "use mode".
// Registered early (script load time) so it fires before the DnD file's
// contextmenu handler (bound later, at hub-open time) and can stop it
// from also processing the click.
document.addEventListener('contextmenu', function (e) {
    const chip = e.target.closest('.eg-item-chip');
    // Active on both the hub and the Probability Gate screens (shared state).
    if (!chip || (typeof _dndChipScreenEl === 'function' ? !_dndChipScreenEl(chip) : !chip.closest('#screen-endgame-hub'))) return;

    const currencyCell = chip.closest('.eg-currency-cell');
    if (!currencyCell) return; // not currency - let the normal handler deal with it

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +currencyCell.dataset.row, c = +currencyCell.dataset.col;
    const item = _egCurrencyStash[r][c];
    if (!item) return;

    // Heal legacy items saved without category/description so right-click
    // still enters use-mode (previous saves stored only {id,count}).
    if (item && typeof _egHealCurrencyItem === 'function') _egHealCurrencyItem(item);
    else if (item && !item.category && EG_CURRENCY_DEFS[item.id]) {
        const _def = EG_CURRENCY_DEFS[item.id];
        if (!item.description) item.description = _def.description;
        if (!item.category) item.category = 'currency';
        if (!item.rarity) item.rarity = 'currency';
        if (!item.name) item.name = _def.name;
        if (!item.icon) item.icon = _def.icon;
    }
    // Also try shard heal (shards also live in the currency strip)
    if (item && typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS[item.id] && !item.category) {
        const _sdef = EG_SHARD_DEFS[item.id];
        if (!item.description) item.description = _sdef.description;
        if (!item.category) item.category = 'currency';
    }

    if (!item.category) return; // empty cell / unknown type

    const def = EG_CURRENCY_DEFS[item.id] || (typeof EG_SHARD_DEFS !== 'undefined' ? EG_SHARD_DEFS[item.id] : null);
    if (!def || (typeof def.apply !== 'function' && !def.isMirror)) {
        globalThis.showToast(t('eg_no_usable_effect'));
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
        const activeTier = (typeof _egMapStashActiveTier !== 'undefined' ? globalThis._egMapStashActiveTier : 1);
        try {
            if (typeof _egGetMapTierGrid === 'function') targetItem = _egGetMapTierGrid(activeTier)[r][c];
            else targetItem = _egMapStash[r][c];
        } catch(e) { targetItem = null; }
        applyFn = (newItem) => {
            // Horizons changes tier - move item to its new tier if needed
            const oldTier = activeTier;
            const newTier = (newItem && newItem.mapTier != null) ? newItem.mapTier : oldTier;
            if (newTier !== oldTier && typeof _egGetMapTierGrid === 'function') {
                // remove from old cell, insert into new tier's free slot
                try { _egGetMapTierGrid(oldTier)[r][c] = null; _egRenderMapStashCell(r, c); } catch(e) {}
                try {
                    const pos = (typeof _egFindFreeMapCellForTier === 'function') ? _egFindFreeMapCellForTier(newTier) : { r:0,c:0 };
                    _egGetMapTierGrid(newTier)[pos.r][pos.c] = newItem;
                    if (typeof _egUpdateMapStashTabCounts === 'function') _egUpdateMapStashTabCounts();
                    if (newTier === (globalThis._egMapStashActiveTier || oldTier) && typeof _egRebuildMapStashGrid === 'function') {
                        const domCells = document.querySelectorAll('.eg-map-stash-cell').length;
                        const needed = _egGetMapTierGrid(newTier).length * EG_MAP_STASH_COLS;
                        if (domCells < needed) _egRebuildMapStashGrid();
                    }
                    // auto-switch tab to the upgraded tier so player sees the result
                    if (typeof _egSwitchMapStashTier === 'function' && newTier !== oldTier) {
                        setTimeout(() => _egSwitchMapStashTier(newTier), 80);
                    }
                    return;
                } catch(e) {}
            }
            try {
                if (typeof _egGetMapTierGrid === 'function') _egGetMapTierGrid(activeTier)[r][c] = newItem;
                else _egMapStash[r][c] = newItem;
            } catch(e) {}
            _egRenderMapStashCell(r, c);
        };
    } else if (mapSlotEl) {
        targetItem = globalThis._egMapSlotItem;
        applyFn = (newItem) => { globalThis._egMapSlotItem = newItem; _egRenderMapSlot(); };
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
            // requirement-blocked (red) state of other items - refresh both
            // the stash and all paperdoll slots.
            _egRenderInventory();
            _egRenderEquipSlots();
        };
    } else {
        _egCancelCurrencyUse();
        return;
    }

    if (!targetItem) {
        const msg = t('eg_no_item_target');
        globalThis.showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        _egCancelCurrencyUse(true);
        return;
    }

    _egApplyCurrencyToItem(targetItem, applyFn, chip, e.shiftKey);
}, true);

// Escape cancels a pending currency use too.
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _egPendingCurrencyUse) _egCancelCurrencyUse();
});
