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
    EG_BASE_TYPES_HEAD,
    EG_BASE_TYPES_EARRING,
    EG_BASE_TYPES_CHEST,
    EG_BASE_TYPES_GLOVES,
    EG_BASE_TYPES_BOOTS,
    EG_BASE_TYPES_BELT,
    EG_BASE_TYPES_WEAPON,
    EG_BASE_TYPES_SHIELD,
    EG_BASE_TYPES_RANGED,
    EG_BASE_TYPES_RING,
    EG_BASE_TYPES_AMULET,
    EG_BASE_TYPES_PANTS,
    EG_BASE_TYPES_SHOULDERS,
    EG_BASE_TYPES_CLOAK,
    EG_BASE_TYPES_BRACERS,
    EG_BASE_TYPES_TALISMAN,
    EG_BASE_TYPES_ARCANE,
} from './equipment-base-types.js';

// All base types in one flat array, armour first, then weapons, then jewellery.
// To bias certain slot types to drop more often, repeat their entries here or
// add per-slot weighting in _egGenerateEquipmentDrop (the generator).
export const EG_ALL_BASE_TYPES = [
    ...EG_BASE_TYPES_HEAD,
    ...EG_BASE_TYPES_CHEST,
    ...EG_BASE_TYPES_PANTS,
    ...EG_BASE_TYPES_SHOULDERS,
    ...EG_BASE_TYPES_CLOAK,
    ...EG_BASE_TYPES_BRACERS,
    ...EG_BASE_TYPES_GLOVES,
    ...EG_BASE_TYPES_BOOTS,
    ...EG_BASE_TYPES_BELT,
    ...EG_BASE_TYPES_WEAPON,
    ...EG_BASE_TYPES_SHIELD,
    ...EG_BASE_TYPES_ARCANE,
    ...EG_BASE_TYPES_RANGED,
    ...EG_BASE_TYPES_EARRING,
    ...EG_BASE_TYPES_RING,
    ...EG_BASE_TYPES_AMULET,
    ...EG_BASE_TYPES_TALISMAN,
];
