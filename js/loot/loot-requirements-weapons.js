import { t } from '../translation/translations.js';
import { EG_ALL_BASE_TYPES } from './equipment-base-items.js';
import { _egEquipped } from '../endgame/endgame-hub.js';
import { _egInferWeaponHands } from './unique-items.js';

//------------------------------------------------------------------------
//-------------------WEAPON HAND RULES--------------------------------------
//------------------------------------------------------------------------

// Returns the explicit or inferred hand count for a weapon.
export function _egGetWeaponHands(item) {
    if (!item || item.slotType !== 'weapon') return null;
    if (item.hands === 1 || item.hands === 2) return item.hands;
    if (typeof _egInferWeaponHands === 'function') {
        const inferred = _egInferWeaponHands(item);
        if (inferred === 1 || inferred === 2) return inferred;
    }
    return 1;
}

// Returns true when an item is a two-handed weapon.
export function _egIsTwoHandedWeapon(item) {
    return item && item.slotType === 'weapon' && _egGetWeaponHands(item) === 2;
}

// Returns true when an item is a one-handed weapon.
export function _egIsOneHandedWeapon(item) {
    return item && item.slotType === 'weapon' && _egGetWeaponHands(item) === 1;
}

// Returns true when both weapon slots contain one-handed weapons.
export function _egIsDualWielding(loadout) {
    const eq = loadout || (typeof _egEquipped !== 'undefined' ? _egEquipped : {});
    if (!eq) return false;
    return _egIsOneHandedWeapon(eq.weapon1) && _egIsOneHandedWeapon(eq.weapon2);
}

// Returns true when the off-hand contains a shield.
export function _egHasShieldEquipped(loadout) {
    const eq = loadout || (typeof _egEquipped !== 'undefined' ? _egEquipped : {});
    if (!eq) return false;
    return !!(eq.weapon2 && eq.weapon2.slotType === 'shield');
}

// Validates hand compatibility for a pending equip.
export function _egCheckHandCompatibilityInSlot(item, slotId) {
    if (!item || item.category !== 'equip') return { ok: true };
    if (typeof _egEquipped === 'undefined') return { ok: true };
    const sim = {};
    Object.keys(_egEquipped).forEach(k => { if (_egEquipped[k]) sim[k] = _egEquipped[k]; });
    Object.keys(sim).forEach(k => { if (sim[k] === item) delete sim[k]; });
    delete sim[slotId];
    sim[slotId] = item;
    const main = sim.weapon1 || null;
    const off = sim.weapon2 || null;
    if (slotId === 'weapon1' && item.slotType === 'shield') return { ok: false, handError: 'main_hand_no_shield', missing: [] };
    if (slotId === 'weapon2' && item.slotType !== 'shield' && !_egIsOneHandedWeapon(item)) {
        return { ok: false, handError: 'offhand_single_handed_only', missing: [] };
    }
    if (main && _egIsTwoHandedWeapon(main) && off) return { ok: false, handError: 'two_handed_blocks_offhand', missing: [] };
    if (slotId === 'weapon2' && main && _egIsTwoHandedWeapon(main)) return { ok: false, handError: 'offhand_blocked_by_two_hander', missing: [] };
    return { ok: true };
}

// Returns localized feedback for a hand compatibility rejection.
export function _egHandErrorMessage(handError, item) {
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
    if (handError === 'two_handed_blocks_offhand') return `⚠️ ${name} is a Heavy Weapon - free the off-hand first`;
    if (handError === 'offhand_blocked_by_two_hander') return `⚠️ Cannot use the off-hand while a Heavy Weapon is equipped`;
    if (handError === 'offhand_single_handed_only') return `⚠️ ${name} cannot go in the off-hand - one-handed weapons or shields only`;
    return `⚠️ ${name} cannot go into that slot`;
}

// Repairs a legacy weapon item saved before explicit hand counts existed.
export function _egHealWeaponHands(item) {
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
