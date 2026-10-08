import { EG_CURRENCY_DEFS } from './loot-currency.js';
import { EG_SHARD_DEFS } from './loot-shards.js';

//------------------------------------------------------------------------
//-------------------CURRENCY TAB LAYOUT-----------------------------------
//------------------------------------------------------------------------

// Fixed dimensions of the Orbs & Shards tab.
export const EG_CURRENCY_COLS = 5;
export const EG_CURRENCY_ROWS = 7;

// Fixed currency and shard positions in the tab.
export const EG_CURRENCY_SLOT_MAP = {
    'orb_transmutation': { r: 0, c: 0 },
    'orb_augmentation': { r: 0, c: 1 },
    'orb_alteration': { r: 0, c: 2 },
    'orb_regal': { r: 0, c: 4 },
    'orb_alchemy': { r: 1, c: 0 },
    'orb_bloom': { r: 1, c: 1 },
    'orb_chaos': { r: 1, c: 2 },
    'orb_elevation': { r: 1, c: 4 },
    'orb_ascension': { r: 2, c: 0 },
    'orb_exalted': { r: 2, c: 1 },
    'orb_cataclysm': { r: 2, c: 2 },
    'orb_horizons': { r: 2, c: 3 },
    'orb_annulment': { r: 2, c: 4 },
    'orb_blessing': { r: 3, c: 0 },
    'orb_ancient': { r: 3, c: 1 },
    'orb_chance': { r: 3, c: 2 },
    'orb_divine': { r: 3, c: 4 },
    'mirror_of_kalandra': { r: 4, c: 4 },
    'shard_transmutation': { r: 5, c: 0 },
    'shard_alchemy': { r: 5, c: 1 },
    'shard_bloom': { r: 5, c: 2 },
    'shard_chaos': { r: 5, c: 3 },
    'shard_elevation': { r: 5, c: 4 },
    'shard_ascension': { r: 6, c: 0 },
    'shard_cataclysm': { r: 6, c: 1 },
    'shard_horizon': { r: 6, c: 2 },
    'shard_ancient': { r: 6, c: 3 },
    'orb_scouring': { r: 6, c: 4 },
};

// Reverse lookup from a grid coordinate to its currency id.
export const EG_CURRENCY_SLOT_REVERSE = (() => {
    const reverse = {};
    for (const [id, pos] of Object.entries(EG_CURRENCY_SLOT_MAP)) reverse[`${pos.r}-${pos.c}`] = id;
    return reverse;
})();

// Returns the fixed position for a currency id.
export function _egCurrencySlotForId(id) {
    return EG_CURRENCY_SLOT_MAP[id] || null;
}

// Returns the currency id assigned to a grid coordinate.
export function _egCurrencyIdForSlot(r, c) {
    return EG_CURRENCY_SLOT_REVERSE[`${r}-${c}`] || null;
}

// Returns the definition for an orb or shard id.
export function _egCurrencyDefForId(id) {
    if (typeof EG_CURRENCY_DEFS !== 'undefined' && EG_CURRENCY_DEFS[id]) return EG_CURRENCY_DEFS[id];
    if (typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS[id]) return EG_SHARD_DEFS[id];
    return null;
}
