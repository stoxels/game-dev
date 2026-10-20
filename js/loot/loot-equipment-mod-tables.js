//----------------------------------------------------------------------
//------------------WHICH MOD TABLE APPLIES TO A BASE-------------------
//----------------------------------------------------------------------

// The routing layer between a base item and its modifier pool: one table
// per slot, plus the melee rule that picks the 1H or 2H pool. Pure lookup
// - nothing in here rolls anything.

import { MOD_TABLE_AMULET } from './loot-mod-tables-amulet.js';
import { MOD_TABLE_ARCANE } from './loot-mod-tables-arcane.js';
import { MOD_TABLE_BELT } from './loot-mod-tables-belt.js';
import { MOD_TABLE_BOOTS } from './loot-mod-tables-boots.js';
import { MOD_TABLE_BRACERS } from './loot-mod-tables-bracers.js';
import { MOD_TABLE_CHEST } from './loot-mod-tables-chest.js';
import { MOD_TABLE_CLOAK } from './loot-mod-tables-cloak.js';
import { MOD_TABLE_EARRING } from './loot-mod-tables-earring.js';
import { MOD_TABLE_GLOVES } from './loot-mod-tables-gloves.js';
import { MOD_TABLE_HEAD } from './loot-mod-tables-head.js';
import { MOD_TABLE_PANTS } from './loot-mod-tables-pants.js';
import { MOD_TABLE_RING } from './loot-mod-tables-ring.js';
import { MOD_TABLE_RANGED, MOD_TABLE_SHIELD } from './loot-mod-tables-shield.js';
import { MOD_TABLE_SHOULDERS } from './loot-mod-tables-shoulders.js';
import { MOD_TABLE_TALISMAN } from './loot-mod-tables-talisman.js';
import { MOD_TABLE_WEAPON_2H } from './loot-mod-tables-weapon-2h.js';
import { MOD_TABLE_WEAPON1, MOD_TABLE_WEAPON_1H } from './loot-mod-tables-weapon1.js';


//----------------------------------------------------------------------
//--------------------------CONSTANTS & STATE---------------------------
//----------------------------------------------------------------------

// The base being rolled right now. Set by the accessor below so the
// weapon lookup can see it even when called through the slot map with
// no arguments (essences / crafting paths).
export let _currentWeaponBase = null;

// Every slotType value (from equipment-base-items.js) and the mod table
// it rolls from. Melee weapons all use slotType 'weapon': 1H rolls
// WEAPON_1H, 2H rolls the harder-hitting WEAPON_2H (ARPG-style). Shields
// use slotType 'shield', a defensive-only derivative of WEAPON2.
export const SLOT_MOD_TABLE_MAP = {
    head: () => MOD_TABLE_HEAD,
    earring: () => MOD_TABLE_EARRING,
    amulet: () => MOD_TABLE_AMULET,
    shoulders: () => MOD_TABLE_SHOULDERS,
    cloak: () => MOD_TABLE_CLOAK,
    chest: () => MOD_TABLE_CHEST,
    bracers: () => MOD_TABLE_BRACERS,
    gloves: () => MOD_TABLE_GLOVES,
    belt: () => MOD_TABLE_BELT,
    pants: () => MOD_TABLE_PANTS,
    boots: () => MOD_TABLE_BOOTS,
    ring: () => MOD_TABLE_RING,
    arcane: () => MOD_TABLE_ARCANE,
    talisman: () => MOD_TABLE_TALISMAN,
    weapon: (base) => _getWeaponModTable(base),
    shield: () => MOD_TABLE_SHIELD,    // shields (off-hand only)
    ranged: () => MOD_TABLE_RANGED,
};


//----------------------------------------------------------------------
//------------------------------ACCESSORS-------------------------------
//----------------------------------------------------------------------

// Returns the melee mod table for the base currently being rolled:
// two-handed weapons roll the harder-hitting WEAPON_2H pool, everything
// else (1H main-hand + 1H off-hand dual-wield) rolls WEAPON_1H.
export function _getWeaponModTable(base) {
    const b = base || _currentWeaponBase || null;
    const hands = b ? (b.hands === 2 ? 2 : 1) : 1;
    try {
        if (hands === 2 && typeof MOD_TABLE_WEAPON_2H !== 'undefined') return MOD_TABLE_WEAPON_2H;
        if (typeof MOD_TABLE_WEAPON_1H !== 'undefined') return MOD_TABLE_WEAPON_1H;
        return MOD_TABLE_WEAPON1;
    } catch (e) {
        return (typeof MOD_TABLE_WEAPON1 !== 'undefined') ? MOD_TABLE_WEAPON1 : null;
    }
}

// Returns the correct mod table object for a given base item.
export function _getModTable(base) {
    if (base && base.slotType === 'weapon') _currentWeaponBase = base;
    const getter = SLOT_MOD_TABLE_MAP[base.slotType];
    if (!getter) return null;
    try { return getter(base); }
    catch (e) { return null; }  // table constant not yet defined - safe fallback
}
