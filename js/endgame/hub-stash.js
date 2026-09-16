//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: equipment stash mirrors + unlimited-stash helpers. The
// facade rebinds the mirrors during _egLoadHubState(); the write-through
// accessor prologue below makes those rebinds visible here and to every
// stash consumer reaching the mirrors through globalThis.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_egInventory', { get() { return _egInventory; }, set(v) { _egInventory = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egEquipped', { get() { return _egEquipped; }, set(v) { _egEquipped = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egStashTab', { get() { return _egStashTab; }, set(v) { _egStashTab = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egUniqueStash', { get() { return _egUniqueStash; }, set(v) { _egUniqueStash = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egUniqueCollected', { get() { return _egUniqueCollected; }, set(v) { _egUniqueCollected = v; }, configurable: true }); } catch (e) {}

import { _egAddUniqueToCollection } from './endgame-hub-uniques.js';
import { _egBuildInventoryGridHTML, _egRenderInventory, _egRenderInventoryCell, _egUpdateInvCount } from './endgame-hub.js';


// Main equipment stash dimensions
export const EG_INV_INITIAL_ROWS = 5;
export const EG_INV_ROWS = EG_INV_INITIAL_ROWS;

export const EG_INV_COLS = 24;

// ── Unique Collection tab state ────────────────────────────────────────
let _egUniqueStash = {};

let _egUniqueCollected = new Set();

export let _egStashTab = 'inventory';


// ── Unlimited stash helpers (must sit after EG_INV_ROWS/COLS so _egInventory exists) ──
export function _egGetInvRows() { return _egInventory ? _egInventory.length : EG_INV_INITIAL_ROWS; }
export function _egGetInvCapacity() { return _egGetInvRows() * EG_INV_COLS; }
export function _egRebuildInventoryGrid() {
    const grid = document.getElementById('eg-inv-grid');
    if (!grid) return;
    const scrollTop = grid.scrollTop;
    grid.innerHTML = _egBuildInventoryGridHTML();
    _egRenderInventory();
    // keep scroll position stable across rebuilds
    grid.scrollTop = scrollTop;
}
export function _egEnsureInvRows(minRows) {
    if (!_egInventory) return;
    if (_egInventory.length >= minRows) return;
    for (let i = _egInventory.length; i < minRows; i++) _egInventory.push(Array(EG_INV_COLS).fill(null));
    const grid = document.getElementById('eg-inv-grid');
    if (grid && grid.children.length < minRows * EG_INV_COLS) {
        _egRebuildInventoryGrid();
    }
}
export function _egExpandStashByOneRow() { _egEnsureInvRows(_egGetInvRows() + 1); }
export function _egFindFreeInvCell() {
    for (let r = 0; r < _egInventory.length; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) if (!_egInventory[r][c]) return { r, c };
    }
    const r = _egInventory.length;
    _egEnsureInvRows(r + 1);
    return { r, c: 0 };
}
export function _egAddItemToStash(item) {
    // Uniques never land in the regular inventory - they go to the Unique Collection
    if (item && item.isUnique && item.baseId) {
        _egAddUniqueToCollection(item);
        return { r: -1, c: -1, unique: true };
    }
    const pos = _egFindFreeInvCell();
    _egInventory[pos.r][pos.c] = item;
    _egRenderInventoryCell(pos.r, pos.c);
    _egUpdateInvCount();
    return pos;
}



//------------------------------------------------------------------------
//-------------------STATE------------------------------------------------
//------------------------------------------------------------------------

// Main equipment stash: 2D grid of item objects (null = empty cell)
export let _egInventory = Array.from({ length: EG_INV_ROWS }, () => Array(EG_INV_COLS).fill(null));

// Equipped items on the paperdoll: keyed by slot id, e.g. { head: {...}, chest: {...} }
export let _egEquipped = {};
