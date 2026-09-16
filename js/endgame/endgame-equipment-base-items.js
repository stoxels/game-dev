//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Facade for the equipment base-item data. The tables live in
// equipment-base-types.js (EG_BASE_TYPES_*) and equipment-slot-icons.js
// (EG_SLOT_ICONS); this module re-exports them unchanged and defines
// EG_ALL_BASE_TYPES (the generator's flat sampling pool).

import { EG_SLOT_ICONS } from './equipment-slot-icons.js';
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

export { EG_SLOT_ICONS };
export {
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
};

// All base types in one flat array. The generator samples from this.
// To bias certain slot types to drop more often, repeat their entries
// or add per-slot weighting in _egGenerateEquipmentDrop (the generator).
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
