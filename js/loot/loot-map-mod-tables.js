import { EG_MAP_MOD_PREFIXES } from './loot-map-mod-prefixes.js';
import { EG_MAP_MOD_SUFFIXES } from './loot-map-mod-suffixes.js';

//----------------------------------------------------------------------
//----------------------------MAP MOD TABLES----------------------------
//----------------------------------------------------------------------

// The assembled mod table and the one lookup every reader shares. Same
// schema as the equipment tables, plus the `affects` tag per family.

export const EG_MAP_MOD_TABLES = {
    prefixes: EG_MAP_MOD_PREFIXES,
    suffixes: EG_MAP_MOD_SUFFIXES,
};

// Resolves the `affects` category of a rolled map mod.
export function _egMapModAffects(familyId) {
    const fam = EG_MAP_MOD_TABLES.prefixes[familyId] || EG_MAP_MOD_TABLES.suffixes[familyId];
    return fam ? fam.affects : 'monster';
}
