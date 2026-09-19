//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: map stash - 16 tier-filtered infinite stashes (one per map
// tier), used by the Probability Gate screen (endgame-gate.js) and the
// hub's load/save path.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_egMapStash', { get() { return _egMapStash; }, set(v) { _egMapStash = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egMapStashActiveTier', { get() { return _egMapStashActiveTier; }, set(v) { _egMapStashActiveTier = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egMapSlotItem', { get() { return _egMapSlotItem; }, set(v) { _egMapSlotItem = v; }, configurable: true }); } catch (e) {}

import { _egBuildMapStashGridHTMLForTier, _egRenderMapStashForTier } from './endgame-gate.js';


// Map stash dimensions - 16 tier-filtered infinite stashes (one per map tier)
export const EG_MAP_TIER_COUNT = 16;
export const EG_MAP_TIER_ROMANS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];
export const EG_MAP_STASH_COLS = 20;
export const EG_MAP_STASH_INITIAL_ROWS = 4;
export const EG_MAP_STASH_ROWS = EG_MAP_STASH_INITIAL_ROWS;


// Single item currently loaded into the Map Device orb slot
let _egMapSlotItem = null;


// Map stash: array of 16 tier-filtered stashes, each a 2D grid (rows × EG_MAP_STASH_COLS)
// _egMapStash[tierIdx][row][col] - tierIdx 0 = Tier I, 15 = Tier XVI
export function _egMakeMapTierGrid(rows) {
    const r = rows != null ? rows : EG_MAP_STASH_INITIAL_ROWS;
    return Array.from({ length: r }, () => Array(EG_MAP_STASH_COLS).fill(null));
}
export function _egMakeAllMapStashes() {
    return Array.from({ length: EG_MAP_TIER_COUNT }, () => _egMakeMapTierGrid());
}
export let _egMapStash = _egMakeAllMapStashes();
// Active tier tab (1..16) shown in the Probability Gate
let _egMapStashActiveTier = 1;

export function _egMapTierToIndex(tier) {
    const t = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(tier || 1)));
    return t - 1;
}
export function _egGetMapTierGrid(tier) {
    const idx = _egMapTierToIndex(tier);
    if (!_egMapStash[idx] || !Array.isArray(_egMapStash[idx])) _egMapStash[idx] = _egMakeMapTierGrid();
    return _egMapStash[idx];
}
export function _egGetMapStashRowsForTier(tier) {
    return _egGetMapTierGrid(tier).length;
}
export function _egEnsureMapTierRows(tier, minRows) {
    _egMapTierToIndex(tier);
    let grid = _egGetMapTierGrid(tier);
    if (grid.length >= minRows) return;
    for (let i = grid.length; i < minRows; i++) grid.push(Array(EG_MAP_STASH_COLS).fill(null));
    if (tier === _egMapStashActiveTier && typeof _egRebuildMapStashGrid === 'function') {
        // defer if gate helpers not yet loaded
        try { _egRebuildMapStashGrid(); } catch(e) {}
    }
}
export function _egRebuildMapStashGrid() {
    const gridEl = document.getElementById('eg-map-stash-grid');
    if (!gridEl) return;
    if (typeof _egBuildMapStashGridHTMLForTier !== 'function' || typeof _egRenderMapStashForTier !== 'function') return;
    const scrollTop = gridEl.scrollTop;
    const curTier = _egMapStashActiveTier;
    gridEl.innerHTML = _egBuildMapStashGridHTMLForTier(curTier);
    // ensure columns reflect current constant
    gridEl.style.gridTemplateColumns = `repeat(${EG_MAP_STASH_COLS}, 1fr)`;
    _egRenderMapStashForTier(curTier);
    gridEl.scrollTop = scrollTop;
}
export function _egFindFreeMapCellForTier(tier) {
    const grid = _egGetMapTierGrid(tier);
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) if (!grid[r][c]) return { r, c };
    }
    const r = grid.length;
    _egEnsureMapTierRows(tier, r + 1);
    return { r, c: 0 };
}
// Legacy helpers that operated on the flat grid - now tier-aware wrappers
export function _egIsLegacyFlatMapStash(stash) {
    if (!Array.isArray(stash) || stash.length === 0) return false;
    // Flat: stash[0][0] is null or a map object, not an array of rows
    // Tiered: stash[0] is itself a 2D array (first element is an array)
    return stash.length > 0 && Array.isArray(stash[0]) && stash[0].length > 0 && !Array.isArray(stash[0][0]) && (stash[0][0] === null || typeof stash[0][0] === 'object') && (stash.length !== EG_MAP_TIER_COUNT || !Array.isArray(stash[0][0]));
}
// Detect tiered shape: stash.length === 16 and each entry is 2D array
export function _egIsTieredMapStash(stash) {
    if (!Array.isArray(stash) || stash.length !== EG_MAP_TIER_COUNT) return false;
    return stash.every(tierGrid => Array.isArray(tierGrid) && tierGrid.length > 0 && Array.isArray(tierGrid[0]));
}
