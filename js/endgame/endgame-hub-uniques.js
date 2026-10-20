import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _findFreeInvCell, _inventory, _renderInventoryCell, _renderUniqueStash, _stashTab, _updateInvCount, saveHubState } from './endgame-hub.js';
import { UNIQUE_ITEMS } from '../loot/unique-items.js';

//  endgame-hub-uniques.js
//  UNIQUE COLLECTION - extracted 2026-09-10 from endgame-hub.js
//  (unique stash helpers). MUST load BEFORE endgame-hub.js: hub.js's
//  load-time _loadHubState() calls _ensureUniqueStash() unguarded.
//  Load-time code here: none (pure function declarations).
//
// ── Unique Collection helpers ────────────────────────────────────────
export function _ensureUniqueStash() {
    if (!globalThis._uniqueStash || typeof _uniqueStash !== 'object' || Array.isArray(globalThis._uniqueStash)) globalThis._uniqueStash = {};
    if (!globalThis._uniqueCollected || typeof globalThis._uniqueCollected.has !== 'function') {
        // may have been restored as array from STATE
        const arr = Array.isArray(globalThis._uniqueCollected) ? globalThis._uniqueCollected : [];
        globalThis._uniqueCollected = new Set(arr);
    }
}
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
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('unique_discovered', 'player_equip_pickup');
    } catch(e) {}
}
export function _getUniqueCount(uid) {
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    return Array.isArray(arr) ? arr.length : 0;
}
export function _isUniqueCollected(uid) {
    _ensureUniqueStash();
    return globalThis._uniqueCollected.has(uid);
}
export function _updateUniqueTabBadge() {
    _ensureUniqueStash();
    const btn = document.getElementById('sx-tab-uniques');
    if (!btn) return;
    const total = (typeof UNIQUE_ITEMS !== 'undefined' ? UNIQUE_ITEMS.length : 0);
    const found = globalThis._uniqueCollected.size;
    let badge = btn.querySelector('.sx-tab-count');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'sx-tab-count';
        btn.appendChild(badge);
    }
    badge.textContent = `${found}/${total}`;
}
export function _moveUniqueToInventory(uid) {
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    if (!arr || arr.length === 0) return false;
    const item = arr.shift();
    // keep empty array so cell stays in 'collected-empty' state instead of reverting to locked '?'
    if (arr.length === 0) globalThis._uniqueStash[uid] = [];
    // keep collected set (never remove)
    const pos = _findFreeInvCell();
    // _ensureInvRows already inside
    _inventory[pos.r][pos.c] = item;
    _renderInventoryCell(pos.r, pos.c);
    _renderUniqueStash();
    _updateInvCount();
    _updateUniqueTabBadge();
    try { saveHubState(); } catch(e) {}
    try {
        globalThis.showToast(t('eg_unique_moved_to_inventory').replace('{name}', item.name || uid), '#f5b642');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('player_equip_pickup');
    } catch(e) {}
    // ensure inventory tab visible after move? keep on uniques so player can move more
    return true;
}
