import { t } from '../translation/translations.js';
import { _dndFindTargetSlot } from '../endgame/endgame-hub-drag-and-drop.js';
import { EG_INV_COLS, _egEnsureInvRows, _egEquipped, _egFindFreeInvCell, _egInventory, _egRenderEquipSlot, _egRenderInventory, _egRenderInventoryCell, _egRenderStatsList, _egShowStashInfo, _egUpdateInvCount, egSaveHubState } from '../endgame/endgame-hub.js';
import { _egGetAllEquippedItems } from '../endgame/endgame-player-stats.js';
import { _egCanEquipInSlot, _egCheckMoveAllowed, _egCheckUnequipSlot, _egComputeLoadoutAttributes, _egFindUnmetRequirements, _egGetUnmetRequirementsText } from './loot-requirements-core.js';
import { _egHandErrorMessage, _egHealWeaponHands, _egIsOneHandedWeapon, _egIsTwoHandedWeapon, _egCheckHandCompatibilityInSlot } from './loot-requirements-weapons.js';

//------------------------------------------------------------------------
//-------------------REQUIREMENTS ACTIONS----------------------------------
//------------------------------------------------------------------------

// Shows standard rejection feedback for an equip or unequip attempt.
export function _egShowRequirementsToast(context, missingOrGate, item) {
    const itemName = (item && item.name) || item || '?';
    const handError = (missingOrGate && missingOrGate.handError)
        ? missingOrGate.handError
        : (item && item.handError ? item.handError : null);
    if (handError && typeof _egHandErrorMessage === 'function') {
        const msg = _egHandErrorMessage(handError, typeof item === 'object' ? item : { name: itemName });
        if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
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
    if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
    if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'error' });
}

// Computes attributes shown by the equip tooltip for a prospective item.
export function _egPreviewEquipAttributes(item) {
    const equipped = _egGetAllEquippedItems();
    if (equipped.includes(item)) return _egComputeLoadoutAttributes(equipped);
    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return _egComputeLoadoutAttributes(equipped);
    const sim = equipped.filter(i => i !== _egEquipped[target]);
    return _egComputeLoadoutAttributes(sim.concat(item));
}

// Explains a rejection caused by the displaced item's contribution to the loadout.
export function _egGetSwapChainBreak(item) {
    if (!item || item.category !== 'equip' || !item.requirements) return null;
    if (typeof _egEquipped === 'undefined') return null;
    const equippedList = Object.values(_egEquipped).filter(Boolean);
    if (equippedList.includes(item)) return null;
    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return null;
    const gate = _egCanEquipInSlot(item, target);
    if (gate.ok) return null;
    if ((gate.missing || []).some(u => u.item === item)) return null;
    const broken = (gate.missing || []).filter(u => u.item !== item && equippedList.includes(u.item));
    const occupant = _egEquipped[target];
    if (!broken.length || !occupant) return null;
    return { occupant, broken };
}

// Returns true when an item should be flagged as unwearable in the UI.
export function _egIsItemBlocked(item) {
    if (!item || item.category !== 'equip' || !item.requirements) return false;
    if (typeof _egEquipped === 'undefined') return false;
    const equippedList = Object.values(_egEquipped).filter(Boolean);
    if (equippedList.includes(item)) {
        if (_egFindUnmetRequirements(equippedList).some(u => u.item === item)) return true;
        try {
            const slotId = Object.keys(_egEquipped).find(k => _egEquipped[k] === item);
            if (slotId && typeof _egCheckHandCompatibilityInSlot === 'function'
                && !_egCheckHandCompatibilityInSlot(item, slotId).ok) return true;
        } catch (e) {}
        return false;
    }
    const target = (typeof _dndFindTargetSlot === 'function') ? _dndFindTargetSlot(item) : null;
    if (!target) return false;
    const gate = _egCanEquipInSlot(item, target);
    if (gate.ok) return false;
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

// Moves an off-hand weapon to the stash when a two-hander is equipped.
export function _egTryAutoUnequipOffhandForTwoHander() {
    if (typeof _egEquipped === 'undefined' || !_egEquipped.weapon2) return true;
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

// Repairs illegal weapon combinations in legacy saves.
export function _egMigrateIllegalHandsToStash() {
    const moved = [];
    try {
        if (typeof _egEquipped === 'undefined' || !_egEquipped) return moved;
        if (typeof _egInventory === 'undefined' || !Array.isArray(_egInventory)) return moved;
        try {
            if (_egEquipped.weapon1) _egHealWeaponHands(_egEquipped.weapon1);
            if (_egEquipped.weapon2) _egHealWeaponHands(_egEquipped.weapon2);
        } catch (e) {}
        const moveSlotToStash = (slotId) => {
            const it = _egEquipped[slotId];
            if (!it) return false;
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
        if (_egEquipped.weapon1 && _egEquipped.weapon1.slotType === 'shield') moveSlotToStash('weapon1');
        if (_egEquipped.weapon2 && _egEquipped.weapon2.slotType === 'weapon' && !_egIsOneHandedWeapon(_egEquipped.weapon2)) moveSlotToStash('weapon2');
        if (_egEquipped.weapon1 && _egIsTwoHandedWeapon(_egEquipped.weapon1) && _egEquipped.weapon2) moveSlotToStash('weapon2');
    } catch (e) {}
    return moved;
}
