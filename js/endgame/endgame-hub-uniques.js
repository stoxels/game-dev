import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _egFindFreeInvCell, _egInventory, _egRenderInventoryCell, _egRenderUniqueStash, _egStashTab, _egUpdateInvCount, egSaveHubState } from './endgame-hub.js';
import { EG_UNIQUE_ITEMS } from './endgame-unique-items.js';

//  endgame-hub-uniques.js
//  UNIQUE COLLECTION - extracted 2026-09-10 from endgame-hub.js
//  (unique stash helpers). MUST load BEFORE endgame-hub.js: hub.js's
//  load-time _egLoadHubState() calls _egEnsureUniqueStash() unguarded.
//  Load-time code here: none (pure function declarations).
//
// ── Unique Collection helpers ────────────────────────────────────────
export function _egEnsureUniqueStash() {
    if (!globalThis._egUniqueStash || typeof _egUniqueStash !== 'object' || Array.isArray(globalThis._egUniqueStash)) globalThis._egUniqueStash = {};
    if (!globalThis._egUniqueCollected || typeof globalThis._egUniqueCollected.has !== 'function') {
        // may have been restored as array from STATE
        const arr = Array.isArray(globalThis._egUniqueCollected) ? globalThis._egUniqueCollected : [];
        globalThis._egUniqueCollected = new Set(arr);
    }
}
export function _egAddUniqueToCollection(item) {
    _egEnsureUniqueStash();
    const uid = item.baseId || item.uniqueId || item.id;
    if (!uid) return;
    if (!globalThis._egUniqueStash[uid]) globalThis._egUniqueStash[uid] = [];
    globalThis._egUniqueStash[uid].push(item);
    globalThis._egUniqueCollected.add(uid);
    // update unique grid if visible
    if (_egStashTab === 'uniques') _egRenderUniqueStash();
    _egUpdateUniqueTabBadge();
    try { egSaveHubState(); } catch(e) {}
    // toast - muted during bulk flush
    if (typeof window !== 'undefined' && window._egMuteUniqueToast) return;
    try {
        const nm = item.name || uid;
        globalThis.showToast(t('eg_unique_added_to_collection').replace('{name}', nm), '#f5b642');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('player_equip_pickup');
    } catch(e) {}
}
export function _egGetUniqueCount(uid) {
    _egEnsureUniqueStash();
    const arr = globalThis._egUniqueStash[uid];
    return Array.isArray(arr) ? arr.length : 0;
}
export function _egIsUniqueCollected(uid) {
    _egEnsureUniqueStash();
    return globalThis._egUniqueCollected.has(uid);
}
export function _egUpdateUniqueTabBadge() {
    _egEnsureUniqueStash();
    const btn = document.getElementById('eg-tab-uniques');
    if (!btn) return;
    const total = (typeof EG_UNIQUE_ITEMS !== 'undefined' ? EG_UNIQUE_ITEMS.length : 0);
    const found = globalThis._egUniqueCollected.size;
    let badge = btn.querySelector('.eg-tab-count');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'eg-tab-count';
        btn.appendChild(badge);
    }
    badge.textContent = `${found}/${total}`;
}
export function _egMoveUniqueToInventory(uid) {
    _egEnsureUniqueStash();
    const arr = globalThis._egUniqueStash[uid];
    if (!arr || arr.length === 0) return false;
    const item = arr.shift();
    // keep empty array so cell stays in 'collected-empty' state instead of reverting to locked '?'
    if (arr.length === 0) globalThis._egUniqueStash[uid] = [];
    // keep collected set (never remove)
    const pos = _egFindFreeInvCell();
    // _egEnsureInvRows already inside
    _egInventory[pos.r][pos.c] = item;
    _egRenderInventoryCell(pos.r, pos.c);
    _egRenderUniqueStash();
    _egUpdateInvCount();
    _egUpdateUniqueTabBadge();
    try { egSaveHubState(); } catch(e) {}
    try {
        globalThis.showToast(t('eg_unique_moved_to_inventory').replace('{name}', item.name || uid), '#f5b642');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('player_equip_pickup');
    } catch(e) {}
    // ensure inventory tab visible after move? keep on uniques so player can move more
    return true;
}
