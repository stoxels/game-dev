//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: Orbs & Shards currency tab - fixed-slot map + helpers.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_egCurrencyStash', { get() { return _egCurrencyStash; }, set(v) { _egCurrencyStash = v; }, configurable: true }); } catch (e) {}

import { EG_CURRENCY_DEFS } from './endgame-currency.js';
import { EG_SHARD_DEFS } from './endgame-shards.js';
import { _egBuildItemChipHTML } from './hub-mass-sell.js';



// ── Orbs & Shards currency tab (PoE-style fixed slots) ──
// 5 cols × 7 rows = 35 cells; 18 orbs + 9 shards + scouring = 28 assigned.
// Rows 1-4: orbs with empties at (1,4), (2,4) and (4,4); Row 3,5 is Annulment, Row 5,5 is Mirror.
// Row 5: separator row (5,1-5,4 EMPTY, 5,5 Mirror). Rows 6-7: shards in orb occurrence order.
export const EG_CURRENCY_COLS = 5;
export const EG_CURRENCY_ROWS = 7;

// Equipment currently offered to the crafting bench. The bench UI is opened
// from the Orbs & Shards tab and accepts an item by drag-and-drop.
export function _egBuildCraftingBenchSlotHTML() {
    const item = typeof _egCraftingBenchItem !== 'undefined' ? globalThis._egCraftingBenchItem : null;
    return `<div class="eg-crafting-launcher"><button class="eg-crafting-open-btn" onclick="_egOpenCraftingBench()">⚒ CRAFTING BENCH</button><div class="eg-crafting-slot" id="eg-crafting-bench-launch-slot" data-eg-dropzone="crafting" ondragover="egDragOver(event)" ondrop="egDropOnCraftingBench(event)">${item ? _egBuildItemChipHTML(item) : 'Drop equipment here'}</div></div>`;
}

// Fixed assignment: currency id → {r,c}. Mirrors PoE currency tab ordering.
// Layout as requested: orbs rows 1-4 with empties at (1,4),(2,4),(4,4); (3,5) is Annulment, (5,5) is Mirror.
// Row 5 (r=4) separator with Mirror at (5,5); shards start at Row 6 (r=5) in orb occurrence order.
// Orb of Scouring kept at (7,5) to retain functionality; remove its entry to make that cell empty.
export const EG_CURRENCY_SLOT_MAP = {
    // Row 0 (1,1-1,5) - Transmutation, Augmentation, Alteration, EMPTY, Regal
    'orb_transmutation': { r: 0, c: 0 },
    'orb_augmentation':  { r: 0, c: 1 },
    'orb_alteration':    { r: 0, c: 2 },
    // (0,3) intentionally EMPTY
    'orb_regal':         { r: 0, c: 4 },
    // Row 1 (2,1-2,5) - Alchemy, Blooming, Chaos, EMPTY, Elevation
    'orb_alchemy':       { r: 1, c: 0 },
    'orb_bloom':         { r: 1, c: 1 },
    'orb_chaos':         { r: 1, c: 2 },
    // (1,3) intentionally EMPTY
    'orb_elevation':     { r: 1, c: 4 },
    // Row 2 (3,1-3,5) - Ascension, Exalted, Cataclysm, Horizons, Annulment
    'orb_ascension':     { r: 2, c: 0 },
    'orb_exalted':       { r: 2, c: 1 },
    'orb_cataclysm':     { r: 2, c: 2 },
    'orb_horizons':      { r: 2, c: 3 },
    'orb_annulment':     { r: 2, c: 4 },
    // Row 3 (4,1-4,5) - Blessing, Ancient, Chance, EMPTY, Divine
    'orb_blessing':      { r: 3, c: 0 },
    'orb_ancient':       { r: 3, c: 1 },
    'orb_chance':        { r: 3, c: 2 },
    // (3,3) intentionally EMPTY (Annulment moved to 3,5)
    'orb_divine':        { r: 3, c: 4 },
    // Row 4 (5,1-5,5) - EMPTY with Mirror at (5,5)
    // (4,0)-(4,3) EMPTY, (4,4) Mirror of Vors
    'mirror_of_kalandra':{ r: 4, c: 4 },
    // Row 5-6 (6,1-7,5) - shards in orb occurrence order (starting at 6,1)
    'shard_transmutation':{ r: 5, c: 0 },
    'shard_alchemy':     { r: 5, c: 1 },
    'shard_bloom':       { r: 5, c: 2 },
    'shard_chaos':       { r: 5, c: 3 },
    'shard_elevation':   { r: 5, c: 4 },
    'shard_ascension':   { r: 6, c: 0 },
    'shard_cataclysm':   { r: 6, c: 1 },
    'shard_horizon':     { r: 6, c: 2 },
    'shard_ancient':     { r: 6, c: 3 },
    // Orb of Scouring retained at last cell (7,5) to preserve functionality
    'orb_scouring':      { r: 6, c: 4 },
};
// Reverse map: "r-c" → id
export const EG_CURRENCY_SLOT_REVERSE = (() => {
    const m = {};
    for (const [id, pos] of Object.entries(EG_CURRENCY_SLOT_MAP)) m[`${pos.r}-${pos.c}`] = id;
    return m;
})();

export function _egCurrencySlotForId(id) { return EG_CURRENCY_SLOT_MAP[id] || null; }
export function _egCurrencyIdForSlot(r, c) { return EG_CURRENCY_SLOT_REVERSE[`${r}-${c}`] || null; }
export function _egCurrencyDefForId(id) {
    if (typeof EG_CURRENCY_DEFS !== 'undefined' && EG_CURRENCY_DEFS[id]) return EG_CURRENCY_DEFS[id];
    if (typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS[id]) return EG_SHARD_DEFS[id];
    return null;
}


// Currency stash: 2D grid of currency item objects (null = empty cell)
export let _egCurrencyStash = Array.from({ length: EG_CURRENCY_ROWS }, () => Array(EG_CURRENCY_COLS).fill(null));
