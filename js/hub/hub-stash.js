//------------------------------------------------------------------------
//-------------------HUB STASH--------------------------------------------
//------------------------------------------------------------------------
// The equipment stash grid, the equipped-items map and the unique
// collection mirrors, plus the helpers that grow the stash. hub.js
// reassigns the mirrors while loading, so each one has a globalThis
// accessor below that writes through to the real variable.
//------------------------------------------------------------------------

// Accessors: let other files read and reassign the mirrors via globalThis.
try { Object.defineProperty(globalThis, '_inventory', { get() { return _inventory; }, set(v) { _inventory = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_equipped', { get() { return _equipped; }, set(v) { _equipped = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_stashTab', { get() { return _stashTab; }, set(v) { _stashTab = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_uniqueStash', { get() { return _uniqueStash; }, set(v) { _uniqueStash = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_uniqueCollected', { get() { return _uniqueCollected; }, set(v) { _uniqueCollected = v; }, configurable: true }); } catch (e) {}

import { _addUniqueToCollection, _updateUniqueTabBadge } from './hub-uniques.js';
import { _buildInventoryGridHTML, _renderInventory, _renderInventoryCell, _updateInvCount } from './hub.js';


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------

// Main stash dimensions: starts at 5 rows, grows on demand.
export const INV_INITIAL_ROWS = 5;
export const INV_ROWS = INV_INITIAL_ROWS;

export const INV_COLS = 24;

// Unique Collection tab state.
let _uniqueStash = {};

let _uniqueCollected = new Set();

export let _stashTab = 'inventory';

// Main equipment stash: 2D grid of item objects (null = empty cell).
export let _inventory = Array.from({ length: INV_ROWS }, () => Array(INV_COLS).fill(null));

// Equipped items on the paperdoll, keyed by slot id, e.g. { head: {...}, chest: {...} }.
export let _equipped = {};

//------------------------------------------------------------------------
//-------------------STASH HELPERS----------------------------------------
//------------------------------------------------------------------------

// Current number of stash rows / total cells.
export function _getInvRows() { return _inventory ? _inventory.length : INV_INITIAL_ROWS; }
export function _getInvCapacity() { return _getInvRows() * INV_COLS; }

// Redraws the whole stash grid, keeping the scroll position.
export function _rebuildInventoryGrid() {
    const grid = document.getElementById('sx-inv-grid');
    if (!grid) return;
    const scrollTop = grid.scrollTop;
    grid.innerHTML = _buildInventoryGridHTML();
    _renderInventory();
    // keep scroll position stable across rebuilds
    grid.scrollTop = scrollTop;
}

// Adds empty rows until the stash has at least minRows (and redraws if visible).
export function _ensureInvRows(minRows) {
    if (!_inventory) return;
    if (_inventory.length >= minRows) return;
    for (let i = _inventory.length; i < minRows; i++) _inventory.push(Array(INV_COLS).fill(null));
    const grid = document.getElementById('sx-inv-grid');
    if (grid && grid.children.length < minRows * INV_COLS) {
        _rebuildInventoryGrid();
    }
}

export function _expandStashByOneRow() { _ensureInvRows(_getInvRows() + 1); }

// First empty stash cell; adds a new row when the stash is full.
export function _findFreeInvCell() {
    for (let r = 0; r < _inventory.length; r++) {
        for (let c = 0; c < INV_COLS; c++) if (!_inventory[r][c]) return { r, c };
    }
    const r = _inventory.length;
    _ensureInvRows(r + 1);
    return { r, c: 0 };
}
// Puts an item into the stash. Uniques go straight to the collection unless
// `opts.uniqueToInventory` is set (loot pickups: the player moves them by
// hand, but the unique is still marked discovered).
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
