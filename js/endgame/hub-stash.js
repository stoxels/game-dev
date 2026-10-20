//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: equipment stash mirrors + unlimited-stash helpers. The
// facade rebinds the mirrors during _loadHubState(); the write-through
// accessor prologue below makes those rebinds visible here and to every
// stash consumer reaching the mirrors through globalThis.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_inventory', { get() { return _inventory; }, set(v) { _inventory = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_equipped', { get() { return _equipped; }, set(v) { _equipped = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_stashTab', { get() { return _stashTab; }, set(v) { _stashTab = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_uniqueStash', { get() { return _uniqueStash; }, set(v) { _uniqueStash = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_uniqueCollected', { get() { return _uniqueCollected; }, set(v) { _uniqueCollected = v; }, configurable: true }); } catch (e) {}

import { _addUniqueToCollection, _updateUniqueTabBadge } from './endgame-hub-uniques.js';
import { _buildInventoryGridHTML, _renderInventory, _renderInventoryCell, _updateInvCount } from './endgame-hub.js';


// Main equipment stash dimensions
export const INV_INITIAL_ROWS = 5;
export const INV_ROWS = INV_INITIAL_ROWS;

export const INV_COLS = 24;

// ── Unique Collection tab state ────────────────────────────────────────
let _uniqueStash = {};

let _uniqueCollected = new Set();

export let _stashTab = 'inventory';


// ── Unlimited stash helpers (must sit after INV_ROWS/COLS so _inventory exists) ──
export function _getInvRows() { return _inventory ? _inventory.length : INV_INITIAL_ROWS; }
export function _getInvCapacity() { return _getInvRows() * INV_COLS; }
export function _rebuildInventoryGrid() {
    const grid = document.getElementById('eg-inv-grid');
    if (!grid) return;
    const scrollTop = grid.scrollTop;
    grid.innerHTML = _buildInventoryGridHTML();
    _renderInventory();
    // keep scroll position stable across rebuilds
    grid.scrollTop = scrollTop;
}
export function _ensureInvRows(minRows) {
    if (!_inventory) return;
    if (_inventory.length >= minRows) return;
    for (let i = _inventory.length; i < minRows; i++) _inventory.push(Array(INV_COLS).fill(null));
    const grid = document.getElementById('eg-inv-grid');
    if (grid && grid.children.length < minRows * INV_COLS) {
        _rebuildInventoryGrid();
    }
}
export function _expandStashByOneRow() { _ensureInvRows(_getInvRows() + 1); }
export function _findFreeInvCell() {
    for (let r = 0; r < _inventory.length; r++) {
        for (let c = 0; c < INV_COLS; c++) if (!_inventory[r][c]) return { r, c };
    }
    const r = _inventory.length;
    _ensureInvRows(r + 1);
    return { r, c: 0 };
}
// `opts.uniqueToInventory`: loot pickups keep a unique in the regular
// inventory (the player moves it to the collection by hand) instead of
// sending it straight to the Unique Collection, which read as a lost pickup.
// The unique is still marked discovered so its collection cell un-locks.
export function _addItemToStash(item, opts) {
    if (item && item.isUnique && item.baseId && opts && opts.uniqueToInventory) {
        try {
            if (globalThis._uniqueCollected && typeof globalThis._uniqueCollected.add === 'function') {
                globalThis._uniqueCollected.add(item.baseId);
                _updateUniqueTabBadge();
            }
        } catch (e) { /* discovery mark is cosmetic */ }
    } else if (item && item.isUnique && item.baseId) {
        // Default: uniques go straight to the Unique Collection
        _addUniqueToCollection(item);
        return { r: -1, c: -1, unique: true };
    }
    const pos = _findFreeInvCell();
    _inventory[pos.r][pos.c] = item;
    _renderInventoryCell(pos.r, pos.c);
    _updateInvCount();
    return pos;
}



//------------------------------------------------------------------------
//-------------------STATE------------------------------------------------
//------------------------------------------------------------------------

// Main equipment stash: 2D grid of item objects (null = empty cell)
export let _inventory = Array.from({ length: INV_ROWS }, () => Array(INV_COLS).fill(null));

// Equipped items on the paperdoll: keyed by slot id, e.g. { head: {...}, chest: {...} }
export let _equipped = {};
