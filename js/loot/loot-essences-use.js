//----------------------------------------------------------------------
//---------------------------ESSENCE USE MODE---------------------------
//----------------------------------------------------------------------

// Right-click an essence, left-click an item: the three document-level
// listeners plus the application itself. Orb mode wins any conflict -
// its listeners register first and the two modes cancel each other.

import { Audio_Manager } from '../audio/audio.js';
import { trackAchStat } from '../achievements/achievements.js';
import { LANG, t } from '../translation/translations.js';
import { _dndChipScreenEl } from '../hub/hub-drag-and-drop.js';
import { _clearTooltip } from '../hub/hub-tooltips.js';
import { _equipped, _inventory, _renderEquipSlot, _renderEquipSlots, _renderInventory, _renderInventoryCell, _renderStatsList, _showStashInfo, saveHubState } from '../hub/hub.js';
import { _cancelCurrencyUse, _pendingCurrencyUse } from './loot-currency-use.js';
import { ESSENCE_REASON_KEYS, _essenceIncompatibilityReason, _essenceStash } from './loot-essences.js';
import { _applyEssenceCraft } from './loot-essences-craft.js';
import { ESSENCE_DEFS } from './loot-essences-defs.js';
import { _renderEssenceCell } from './loot-essences-render.js';


export let _pendingEssenceUse = null; // { defId, sourceRow, sourceCol }

// Shared rejection path: shows a short reason toast + stash info, flashes the
// target chip, and exits use mode. `reasonKey` is null for plain failures.
export function _rejectEssenceUse(reasonKey, chipEl, opts = {}) {
    const isDe = (typeof LANG !== 'undefined' && LANG === 'de');
    const fallback = reasonKey ? (isDe ? 'Gegenstand nicht kompatibel.' : 'Item not compatible.') : (isDe ? 'Nicht anwendbar.' : 'Cannot be applied.');
    const msg = reasonKey
        ? (t(reasonKey) !== reasonKey ? t(reasonKey) : fallback)
        : fallback;
    globalThis.showToast(msg);
    if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error', duration: opts.duration || 5000 });
    if (chipEl) {
        chipEl.classList.add('sx-slot-reject');
        setTimeout(() => chipEl.classList.remove('sx-slot-reject'), 600);
    }
    _cancelEssenceUse(true);
}

export function _startEssenceUse(def, row, col, chipEl) {
    if (typeof _pendingCurrencyUse !== 'undefined' && _pendingCurrencyUse) {
        _cancelCurrencyUse(true);
    }
    _pendingEssenceUse = { defId: def.id, sourceRow: row, sourceCol: col };
    document.querySelectorAll('.sx-item-chip').forEach(el => el.classList.remove('sx-currency-selected'));
    if (chipEl) chipEl.classList.add('sx-currency-selected');
    document.body.classList.add('sx-currency-use-active');
    globalThis.showToast(t('eg_currency_selected')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name));
}

export function _cancelEssenceUse(silent) {
    if (!_pendingEssenceUse) return;
    _pendingEssenceUse = null;
    document.querySelectorAll('.sx-item-chip').forEach(el => el.classList.remove('sx-currency-selected'));
    document.body.classList.remove('sx-currency-use-active');
    if (!silent) globalThis.showToast(t('eg_currency_cancelled'));
}

export function _refreshEssenceUseHighlight() {
    if (!_pendingEssenceUse) return;
    const { sourceRow, sourceCol } = _pendingEssenceUse;
    document.querySelectorAll('.sx-item-chip').forEach(el => el.classList.remove('sx-currency-selected'));
    const chip = document.querySelector(
        `.sx-essence-cell[data-row="${sourceRow}"][data-col="${sourceCol}"] .sx-item-chip`);
    if (chip) {
        chip.classList.add('sx-currency-selected');
        document.body.classList.add('sx-currency-use-active');
    } else {
        _cancelEssenceUse(true);
    }
}

export function _applyEssenceToItem(item, applyFn, chipEl, keepActive) {
    if (!_pendingEssenceUse) return;
    const { sourceRow, sourceCol, defId } = _pendingEssenceUse;
    const def = ESSENCE_DEFS[defId];
    const stack = _essenceStash[sourceRow][sourceCol];

    if (!def || !stack || stack.id !== defId) {
        _cancelEssenceUse(true);
        return;
    }

    if (!item || item.category !== 'equip' || item.isUnique) {
        // Distinct short reasons so the player knows WHY (no item name - the
        // target is what's on screen, the essence is still highlighted).
        _rejectEssenceUse(
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
        const reason = _essenceIncompatibilityReason(famForCheck, item);
        if (reason) {
            _rejectEssenceUse(ESSENCE_REASON_KEYS[reason] || null, chipEl);
            return;
        }
    }

    const newItem = _applyEssenceCraft(item, def);
    if (!newItem) {
        // Fallback - should already be caught by the checks above.
        _rejectEssenceUse(null, chipEl);
        return;
    }
    applyFn(newItem);

    stack.count = (stack.count || 1) - 1;
    if (stack.count <= 0) _essenceStash[sourceRow][sourceCol] = null;
    _renderEssenceCell(sourceRow, sourceCol);

    Audio_Manager.playSFX('essence_apply');
    if (typeof trackAchStat === 'function') try { trackAchStat('egEssencesApplied', 1); } catch(e){}

    if (keepActive && stack.count > 0) {
        _refreshEssenceUseHighlight();
        globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
        if (typeof _renderStatsList === 'function') _renderStatsList();
        saveHubState();
        return;
    }

    _cancelEssenceUse(true);
    globalThis.showToast(t('eg_currency_applied').replace('{name}', def.name));
    if (typeof _renderStatsList === 'function') _renderStatsList();
    saveHubState();
}

// Right-click on an essence chip: start or cancel "use mode".
document.addEventListener('contextmenu', function (e) {
    const chip = e.target.closest('.sx-item-chip');
    const essenceCell = chip ? chip.closest('.sx-essence-cell') : null;

    if (_pendingEssenceUse) {
        if (!chip || !essenceCell) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _clearTooltip();
        const pr = +essenceCell.dataset.row, pc = +essenceCell.dataset.col;
        if (_pendingEssenceUse.sourceRow === pr && _pendingEssenceUse.sourceCol === pc) {
            _cancelEssenceUse();
        } else {
            const item = _essenceStash[pr][pc];
            if (item && item.category) {
                _startEssenceUse(ESSENCE_DEFS[item.id] || item, pr, pc, chip);
            }
        }
        return;
    }

    if (!chip || (typeof _dndChipScreenEl === 'function' ? !_dndChipScreenEl(chip) : !chip.closest('#screen-endgame-hub'))) return;
    if (!essenceCell) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
    const item = _essenceStash[r][c];
    if (!item || !item.category) return;

    _startEssenceUse(ESSENCE_DEFS[item.id] || item, r, c, chip);
}, true);

// Left-click while an essence is selected: apply it to the clicked equip
// item, or cancel if the click isn't a valid target.
document.addEventListener('mousedown', function (e) {
    if (!_pendingEssenceUse) return;
    if (typeof _pendingCurrencyUse !== 'undefined' && _pendingCurrencyUse) return;
    if (e.button !== 0) return;

    const chip = e.target.closest('.sx-item-chip');
    const onManagedScreen = !!chip && (typeof _dndChipScreenEl === 'function'
        ? !!_dndChipScreenEl(chip)
        : !!chip.closest('#screen-endgame-hub'));
    if (!onManagedScreen) {
        _cancelEssenceUse();
        return;
    }

    if (chip.closest('.sx-essence-cell')) {
        _cancelEssenceUse();
        return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const invCell = chip.closest('.sx-inv-cell:not(.sx-currency-cell):not(.eg-map-stash-cell):not(.sx-essence-cell)');
    const equipSlot = chip.closest('.sx-equip-slot');

    let targetItem = null, applyFn = null;
    if (invCell) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        targetItem = _inventory[r][c];
        applyFn = (newItem) => { _inventory[r][c] = newItem; _renderInventoryCell(r, c); };
    } else if (equipSlot) {
        const slotId = equipSlot.dataset.slotId;
        targetItem = _equipped[slotId] || null;
        applyFn = (newItem) => {
            _equipped[slotId] = newItem;
            _renderEquipSlot(slotId);
            _renderInventory();
            _renderEquipSlots();
        };
    } else {
        _cancelEssenceUse();
        return;
    }

    if (!targetItem) {
        const msg = t('eg_no_item_target');
        globalThis.showToast(msg);
        if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
        _cancelEssenceUse(true);
        return;
    }

    _applyEssenceToItem(targetItem, applyFn, chip, e.shiftKey);
}, true);

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _pendingEssenceUse && !(typeof _pendingCurrencyUse !== 'undefined' && _pendingCurrencyUse)) {
        _cancelEssenceUse();
    }
});
