//------------------------------------------------------------------------
//-------------------EQUIPMENT BASE TYPES POOL----------------------------
//------------------------------------------------------------------------
// Every equipment base type in one flat list. The loot generator samples
// from this pool; the per-slot tables live in equipment-base-types.js.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
// CONSTANTS & STATE
//------------------------------------------------------------------------

import {
    BASE_TYPES_HEAD,
    BASE_TYPES_EARRING,
    BASE_TYPES_CHEST,
    BASE_TYPES_GLOVES,
    BASE_TYPES_BOOTS,
    BASE_TYPES_BELT,
    BASE_TYPES_WEAPON,
    BASE_TYPES_SHIELD,
    BASE_TYPES_RANGED,
    BASE_TYPES_RING,
    BASE_TYPES_AMULET,
    BASE_TYPES_PANTS,
    BASE_TYPES_SHOULDERS,
    BASE_TYPES_CLOAK,
    BASE_TYPES_BRACERS,
    BASE_TYPES_TALISMAN,
    BASE_TYPES_ARCANE,
} from './equipment-base-types.js';

// All base types in one flat array, armour first, then weapons, then jewellery.
// To bias certain slot types to drop more often, repeat their entries here or
// add per-slot weighting in _generateEquipmentDrop (the generator).
export const ALL_BASE_TYPES = [
    ...BASE_TYPES_HEAD,
    ...BASE_TYPES_CHEST,
    ...BASE_TYPES_PANTS,
    ...BASE_TYPES_SHOULDERS,
    ...BASE_TYPES_CLOAK,
    ...BASE_TYPES_BRACERS,
    ...BASE_TYPES_GLOVES,
    ...BASE_TYPES_BOOTS,
    ...BASE_TYPES_BELT,
    ...BASE_TYPES_WEAPON,
    ...BASE_TYPES_SHIELD,
    ...BASE_TYPES_ARCANE,
    ...BASE_TYPES_RANGED,
    ...BASE_TYPES_EARRING,
    ...BASE_TYPES_RING,
    ...BASE_TYPES_AMULET,
    ...BASE_TYPES_TALISMAN,
];
