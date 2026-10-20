import { t } from '../translation/translations.js';
import { _dndFindTargetSlot } from '../hub/hub-drag-and-drop.js';
import { INV_COLS, _ensureInvRows, _equipped, _findFreeInvCell, _inventory, _renderEquipSlot, _renderInventory, _renderInventoryCell, _renderStatsList, _showStashInfo, _updateInvCount, saveHubState } from '../hub/hub.js';
import { _getAllEquippedItems } from '../combat/combat-player-stats.js';
import { _canEquipInSlot, _checkMoveAllowed, _checkUnequipSlot, _computeLoadoutAttributes, _findUnmetRequirements, _getUnmetRequirementsText } from './loot-requirements-core.js';
import { _handErrorMessage, _healWeaponHands, _isOneHandedWeapon, _isTwoHandedWeapon, _checkHandCompatibilityInSlot } from './loot-requirements-weapons.js';

//------------------------------------------------------------------------
//-------------------REQUIREMENTS ACTIONS----------------------------------
//------------------------------------------------------------------------

// Shows standard rejection feedback for an equip or unequip attempt.
export function _showRequirementsToast(context, missingOrGate, item) {
    const itemName = (item && item.name) || item || '?';
    const handError = (missingOrGate && missingOrGate.handError)
        ? missingOrGate.handError
        : (item && item.handError ? item.handError : null);
    if (handError && typeof _handErrorMessage === 'function') {
        const msg = _handErrorMessage(handError, typeof item === 'object' ? item : { name: itemName });
        if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
        if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
        return;
    }
    const missing = Array.isArray(missingOrGate) ? missingOrGate : (missingOrGate && missingOrGate.missing) || [];
    const list = _getUnmetRequirementsText(missing);
    let msg;
    const chain = context === 'equip' ? _getSwapChainBreak(item) : null;
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
    if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
    if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
}

// Computes attributes shown by the equip tooltip for a prospective item.
export function _previewEquipAttributes(item) {
    const equipped = _getAllEquippedItems();
    if (equipped.includes(item)) return _computeLoadoutAttributes(equipped);
    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return _computeLoadoutAttributes(equipped);
    const sim = equipped.filter(i => i !== _equipped[target]);
    return _computeLoadoutAttributes(sim.concat(item));
}

// Explains a rejection caused by the displaced item's contribution to the loadout.
export function _getSwapChainBreak(item) {
    if (!item || item.category !== 'equip' || !item.requirements) return null;
    if (typeof _equipped === 'undefined') return null;
    const equippedList = Object.values(_equipped).filter(Boolean);
    if (equippedList.includes(item)) return null;
    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return null;
    const gate = _canEquipInSlot(item, target);
    if (gate.ok) return null;
    if ((gate.missing || []).some(u => u.item === item)) return null;
    const broken = (gate.missing || []).filter(u => u.item !== item && equippedList.includes(u.item));
    const occupant = _equipped[target];
    if (!broken.length || !occupant) return null;
    return { occupant, broken };
}

// Returns true when an item should be flagged as unwearable in the UI.
export function _isItemBlocked(item) {
    if (!item || item.category !== 'equip' || !item.requirements) return false;
    if (typeof _equipped === 'undefined') return false;
    const equippedList = Object.values(_equipped).filter(Boolean);
    if (equippedList.includes(item)) {
        if (_findUnmetRequirements(equippedList).some(u => u.item === item)) return true;
        try {
            const slotId = Object.keys(_equipped).find(k => _equipped[k] === item);
            if (slotId && typeof _checkHandCompatibilityInSlot === 'function'
                && !_checkHandCompatibilityInSlot(item, slotId).ok) return true;
        } catch (e) {}
        return false;
    }
    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return false;
    const gate = _canEquipInSlot(item, target);
    if (gate.ok) return false;
    if (gate.handError === 'two_handed_blocks_offhand' && target === 'weapon1') {
        try {
            const offGate = _checkUnequipSlot('weapon2');
            if (offGate.ok) {
                const retry = _checkMoveAllowed(sim => {
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

// Moves an off-hand weapon to the stash when a two-hander is equipped.
// `avoid` ({r, c}) is a stash cell that must NOT receive the off-hand: while a
// drag is in flight the dragged item's origin cell is empty but reserved for
// the weapon it displaces - using it would overwrite (lose) the off-hand.
export function _tryAutoUnequipOffhandForTwoHander(avoid) {
    if (typeof _equipped === 'undefined' || !_equipped.weapon2) return true;
    try {
        const gate = _checkUnequipSlot('weapon2');
        if (!gate.ok) {
            _showRequirementsToast('unequip', gate, _equipped.weapon2.name || '?');
            return false;
        }
    } catch (e) {}
    const off = _equipped.weapon2;
    try {
        if (typeof _findFreeInvCell === 'function' && typeof _inventory !== 'undefined' && _inventory) {
            let pos = null;
            if (avoid && Number.isInteger(avoid.r) && Number.isInteger(avoid.c)) {
                for (let r = 0; r < _inventory.length && !pos; r++) {
                    if (!Array.isArray(_inventory[r])) continue;
                    for (let c = 0; c < _inventory[r].length; c++) {
                        if (_inventory[r][c] || (r === avoid.r && c === avoid.c)) continue;
                        pos = { r, c };
                        break;
                    }
                }
            }
            if (!pos) pos = _findFreeInvCell();
            if (avoid && pos.r === avoid.r && pos.c === avoid.c) {
                // Only the reserved cell was free: take a fresh row instead.
                const nr = _inventory.length;
                if (typeof _ensureInvRows === 'function') _ensureInvRows(nr + 1);
                pos = { r: nr, c: 0 };
            }
            if (typeof _ensureInvRows === 'function') _ensureInvRows(pos.r + 1);
            _inventory[pos.r][pos.c] = off;
            delete _equipped.weapon2;
            if (typeof _renderEquipSlot === 'function') _renderEquipSlot('weapon2');
            if (typeof _renderInventoryCell === 'function') _renderInventoryCell(pos.r, pos.c);
            if (typeof _renderInventory === 'function') _renderInventory();
            if (typeof _updateInvCount === 'function') _updateInvCount();
            if (typeof _renderStatsList === 'function') _renderStatsList();
            if (typeof saveHubState === 'function') saveHubState();
            return true;
        }
    } catch (e) {}
    return false;
}

// Repairs illegal weapon combinations in legacy saves.
export function _migrateIllegalHandsToStash() {
    const moved = [];
    try {
        if (typeof _equipped === 'undefined' || !_equipped) return moved;
        if (typeof _inventory === 'undefined' || !Array.isArray(_inventory)) return moved;
        try {
            if (_equipped.weapon1) _healWeaponHands(_equipped.weapon1);
            if (_equipped.weapon2) _healWeaponHands(_equipped.weapon2);
        } catch (e) {}
        const moveSlotToStash = (slotId) => {
            const it = _equipped[slotId];
            if (!it) return false;
            let pos = null;
            for (let r = 0; r < _inventory.length && !pos; r++) {
                if (!Array.isArray(_inventory[r])) continue;
                for (let c = 0; c < _inventory[r].length; c++) {
                    if (!_inventory[r][c]) { pos = { r, c }; break; }
                }
            }
            if (!pos) {
                try {
                    if (typeof _ensureInvRows === 'function') _ensureInvRows(_inventory.length + 1);
                    else _inventory.push(Array(typeof INV_COLS !== 'undefined' ? INV_COLS : 24).fill(null));
                } catch (e) { return false; }
                pos = { r: _inventory.length - 1, c: 0 };
            }
            try {
                _inventory[pos.r][pos.c] = it;
                delete _equipped[slotId];
                moved.push({ slotId, item: it });
                return true;
            } catch (e) { return false; }
        };
        if (_equipped.weapon1 && _equipped.weapon1.slotType === 'shield') moveSlotToStash('weapon1');
        if (_equipped.weapon2 && _equipped.weapon2.slotType === 'weapon' && !_isOneHandedWeapon(_equipped.weapon2)) moveSlotToStash('weapon2');
        if (_equipped.weapon1 && _isTwoHandedWeapon(_equipped.weapon1) && _equipped.weapon2) moveSlotToStash('weapon2');
    } catch (e) {}
    return moved;
}
