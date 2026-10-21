import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _findFreeInvCell, _inventory, _renderInventoryCell, _renderUniqueStash, _stashTab, _updateInvCount, saveHubState } from './hub.js';
import { UNIQUE_ITEMS } from '../loot/unique-items.js';

//------------------------------------------------------------------------
//-------------------UNIQUE COLLECTION------------------------------------
//------------------------------------------------------------------------
// Helpers for the Unique Collection tab: uniques are filed by id in
// _uniqueStash, and _uniqueCollected remembers every id ever found. Both
// live in hub-stash.js and are reached through globalThis accessors.
// hub.js calls _ensureUniqueStash() while loading, so keep it call-safe.
//------------------------------------------------------------------------

// Makes sure the stash is an object and the collected-set is a real Set
// (a saved game stores it as an array).
export function _ensureUniqueStash() {
    if (!globalThis._uniqueStash || typeof globalThis._uniqueStash !== 'object' || Array.isArray(globalThis._uniqueStash)) globalThis._uniqueStash = {};
    if (!globalThis._uniqueCollected || typeof globalThis._uniqueCollected.has !== 'function') {
        // may have been restored as array from STATE
        const arr = Array.isArray(globalThis._uniqueCollected) ? globalThis._uniqueCollected : [];
        globalThis._uniqueCollected = new Set(arr);
    }
}

// Files a unique under its id, marks it collected, refreshes the tab and
// saves. Shows a toast unless bulk flushes have muted it.
export function _addUniqueToCollection(item) {
    _ensureUniqueStash();
    const uid = item.baseId || item.uniqueId || item.id;
    if (!uid) return;
    if (!globalThis._uniqueStash[uid]) globalThis._uniqueStash[uid] = [];
    globalThis._uniqueStash[uid].push(item);
    globalThis._uniqueCollected.add(uid);
    // update unique grid if visible
    if (_stashTab === 'uniques') _renderUniqueStash();
    _updateUniqueTabBadge();
    try { saveHubState(); } catch(e) {}
    // toast - muted during bulk flush
    if (typeof window !== 'undefined' && window._muteUniqueToast) return;
    try {
        const nm = item.name || uid;
        globalThis.showToast(t('eg_unique_added_to_collection').replace('{name}', nm), '#f5b642');
        Audio_Manager.playSFX('unique_discovered', 'player_equip_pickup');
    } catch(e) {}
}

// How many copies of a unique are currently in the collection.
export function _getUniqueCount(uid) {
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    return Array.isArray(arr) ? arr.length : 0;
}

// True once a unique has ever been found (stays true after moving it out).
export function _isUniqueCollected(uid) {
    _ensureUniqueStash();
    return globalThis._uniqueCollected.has(uid);
}

// Updates the "found/total" counter on the Uniques tab button.
export function _updateUniqueTabBadge() {
    _ensureUniqueStash();
    const btn = document.getElementById('sx-tab-uniques');
    if (!btn) return;
    const total = UNIQUE_ITEMS.length;
    const found = globalThis._uniqueCollected.size;
    let badge = btn.querySelector('.sx-tab-count');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'sx-tab-count';
        btn.appendChild(badge);
    }
    badge.textContent = `${found}/${total}`;
}

// Moves one copy of a unique from the collection into the first free
// inventory cell. The collection cell stays unlocked even when empty.
export function _moveUniqueToInventory(uid) {
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    if (!arr || arr.length === 0) return false;
    const item = arr.shift();
    // Keep the empty array so the cell shows "collected, empty" rather than locked '?'.
    if (arr.length === 0) globalThis._uniqueStash[uid] = [];
    const pos = _findFreeInvCell();
    _inventory[pos.r][pos.c] = item;
    _renderInventoryCell(pos.r, pos.c);
    _renderUniqueStash();
    _updateInvCount();
    _updateUniqueTabBadge();
    try { saveHubState(); } catch(e) {}
    try {
        globalThis.showToast(t('eg_unique_moved_to_inventory').replace('{name}', item.name || uid), '#f5b642');
        Audio_Manager.playSFX('player_equip_pickup');
    } catch(e) {}
    return true;
}
