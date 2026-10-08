//----------------------------------------------------------------------
//---------------------------ESSENCE USE MODE---------------------------
//----------------------------------------------------------------------

// Right-click an essence, left-click an item: the three document-level
// listeners plus the application itself. Orb mode wins any conflict -
// its listeners register first and the two modes cancel each other.

import { trackAchStat } from '../achievements/achievements.js';
import { LANG, t } from '../translation/translations.js';
import { _dndChipScreenEl } from '../endgame/endgame-hub-drag-and-drop.js';
import { _egClearTooltip } from '../endgame/endgame-hub-tooltips.js';
import { _egEquipped, _egInventory, _egRenderEquipSlot, _egRenderEquipSlots, _egRenderInventory, _egRenderInventoryCell, _egRenderStatsList, _egShowStashInfo, egSaveHubState } from '../endgame/endgame-hub.js';
import { _egCancelCurrencyUse, _egPendingCurrencyUse } from './loot-currency-use.js';
import { EG_ESSENCE_REASON_KEYS, _egEssenceIncompatibilityReason, _egEssenceStash } from './loot-essences.js';
import { _egApplyEssenceCraft } from './loot-essences-craft.js';
import { EG_ESSENCE_DEFS } from './loot-essences-defs.js';
import { _egRenderEssenceCell } from './loot-essences-render.js';


export let _egPendingEssenceUse = null; // { defId, sourceRow, sourceCol }

// Shared rejection path: shows a short reason toast + stash info, flashes the
// target chip, and exits use mode. `reasonKey` is null for plain failures.
export function _egRejectEssenceUse(reasonKey, chipEl, opts = {}) {
    const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
    const fallback = reasonKey ? (isDe ? 'Gegenstand nicht kompatibel.' : 'Item not compatible.') : (isDe ? 'Nicht anwendbar.' : 'Cannot be applied.');
    const msg = reasonKey
        ? (t(reasonKey) !== reasonKey ? t(reasonKey) : fallback)
        : fallback;
    globalThis.showToast(msg);
    if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error', duration: opts.duration || 5000 });
    if (chipEl) {
        chipEl.classList.add('eg-slot-reject');
        setTimeout(() => chipEl.classList.remove('eg-slot-reject'), 600);
    }
    _egCancelEssenceUse(true);
}

export function _egStartEssenceUse(def, row, col, chipEl) {
    if (typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse) {
        _egCancelCurrencyUse(true);
    }
    _egPendingEssenceUse = { defId: def.id, sourceRow: row, sourceCol: col };
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    if (chipEl) chipEl.classList.add('eg-currency-selected');
    document.body.classList.add('eg-currency-use-active');
    globalThis.showToast(t('eg_currency_selected')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
}

export function _egCancelEssenceUse(silent) {
    if (!_egPendingEssenceUse) return;
    _egPendingEssenceUse = null;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    document.body.classList.remove('eg-currency-use-active');
    if (!silent) globalThis.showToast(t('eg_currency_cancelled'));
}

export function _egRefreshEssenceUseHighlight() {
    if (!_egPendingEssenceUse) return;
    const { sourceRow, sourceCol } = _egPendingEssenceUse;
    document.querySelectorAll('.eg-item-chip').forEach(el => el.classList.remove('eg-currency-selected'));
    const chip = document.querySelector(
        `.eg-essence-cell[data-row="${sourceRow}"][data-col="${sourceCol}"] .eg-item-chip`);
    if (chip) {
        chip.classList.add('eg-currency-selected');
        document.body.classList.add('eg-currency-use-active');
    } else {
        _egCancelEssenceUse(true);
    }
}

export function _egApplyEssenceToItem(item, applyFn, chipEl, keepActive) {
    if (!_egPendingEssenceUse) return;
    const { sourceRow, sourceCol, defId } = _egPendingEssenceUse;
    const def = EG_ESSENCE_DEFS[defId];
    const stack = _egEssenceStash[sourceRow][sourceCol];

    if (!def || !stack || stack.id !== defId) {
        _egCancelEssenceUse(true);
        return;
    }

    if (!item || item.category !== 'equip' || item.isUnique) {
        // Distinct short reasons so the player knows WHY (no item name - the
        // target is what's on screen, the essence is still highlighted).
        _egRejectEssenceUse(
            (item && item.isUnique) ? 'eg_essence_unique_reject'
            : (item && item.category === 'equip') ? null
            : 'eg_essence_not_equipment',
            chipEl
        );
        return;
    }

    // Compatibility check - does this base support the guaranteed family?
    const famList = def.guaranteedFamilies || (def.guaranteedFamily ? [def.guaranteedFamily] : []);
    const famForCheck = famList[0];
    if (famForCheck) {
        const reason = _egEssenceIncompatibilityReason(famForCheck, item);
        if (reason) {
            _egRejectEssenceUse(EG_ESSENCE_REASON_KEYS[reason] || null, chipEl);
            return;
        }
    }

    const newItem = _egApplyEssenceCraft(item, def);
    if (!newItem) {
        // Fallback - should already be caught by the checks above.
        _egRejectEssenceUse(null, chipEl);
        return;
    }
    applyFn(newItem);

    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _egEssenceStash[sourceRow][sourceCol] = null;
    _egRenderEssenceCell(sourceRow, sourceCol);

    if (typeof trackAchStat === 'function') try { trackAchStat('egEssencesApplied', 1); } catch(e){}

    if (keepActive && stack.count > 0) {
        _egRefreshEssenceUseHighlight();
        globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
        if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
        egSaveHubState();
        return;
    }

    _egCancelEssenceUse(true);
    globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
    if (typeof _egRenderStatsList === 'function') _egRenderStatsList();
    egSaveHubState();
}

// Right-click on an essence chip: start or cancel "use mode".
document.addEventListener('contextmenu', function (e) {
    const chip = e.target.closest('.eg-item-chip');
    const essenceCell = chip ? chip.closest('.eg-essence-cell') : null;

    if (_egPendingEssenceUse) {
        if (!chip || !essenceCell) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _egClearTooltip();
        const pr = +essenceCell.dataset.row, pc = +essenceCell.dataset.col;
        if (_egPendingEssenceUse.sourceRow === pr && _egPendingEssenceUse.sourceCol === pc) {
            _egCancelEssenceUse();
        } else {
            const item = _egEssenceStash[pr][pc];
            if (item && item.category) {
                _egStartEssenceUse(EG_ESSENCE_DEFS[item.id] || item, pr, pc, chip);
            }
        }
        return;
    }

    if (!chip || (typeof _dndChipScreenEl === 'function' ? !_dndChipScreenEl(chip) : !chip.closest('#screen-endgame-hub'))) return;
    if (!essenceCell) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
    const item = _egEssenceStash[r][c];
    if (!item || !item.category) return;

    _egStartEssenceUse(EG_ESSENCE_DEFS[item.id] || item, r, c, chip);
}, true);

// Left-click while an essence is selected: apply it to the clicked equip
// item, or cancel if the click isn't a valid target.
document.addEventListener('mousedown', function (e) {
    if (!_egPendingEssenceUse) return;
    if (typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse) return;
    if (e.button !== 0) return;

    const chip = e.target.closest('.eg-item-chip');
    const onManagedScreen = !!chip && (typeof _dndChipScreenEl === 'function'
        ? !!_dndChipScreenEl(chip)
        : !!chip.closest('#screen-endgame-hub'));
    if (!onManagedScreen) {
        _egCancelEssenceUse();
        return;
    }

    if (chip.closest('.eg-essence-cell')) {
        _egCancelEssenceUse();
        return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const invCell = chip.closest('.eg-inv-cell:not(.eg-currency-cell):not(.eg-map-stash-cell):not(.eg-essence-cell)');
    const equipSlot = chip.closest('.eg-equip-slot');

    let targetItem = null, applyFn = null;
    if (invCell) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        targetItem = _egInventory[r][c];
        applyFn = (newItem) => { _egInventory[r][c] = newItem; _egRenderInventoryCell(r, c); };
    } else if (equipSlot) {
        const slotId = equipSlot.dataset.slotId;
        targetItem = _egEquipped[slotId] || null;
        applyFn = (newItem) => {
            _egEquipped[slotId] = newItem;
            _egRenderEquipSlot(slotId);
            _egRenderInventory();
            _egRenderEquipSlots();
        };
    } else {
        _egCancelEssenceUse();
        return;
    }

    if (!targetItem) {
        const msg = t('eg_no_item_target');
        globalThis.showToast(msg);
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
        _egCancelEssenceUse(true);
        return;
    }

    _egApplyEssenceToItem(targetItem, applyFn, chip, e.shiftKey);
}, true);

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _egPendingEssenceUse && !(typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse)) {
        _egCancelEssenceUse();
    }
});
