//  endgame-hub-uniques.js
//  UNIQUE COLLECTION — extracted 2026-09-10 from endgame-hub.js
//  (unique stash helpers). MUST load BEFORE endgame-hub.js: hub.js's
//  load-time _egLoadHubState() calls _egEnsureUniqueStash() unguarded.
//  Load-time code here: none (pure function declarations).
//
// ── Unique Collection helpers ────────────────────────────────────────
function _egEnsureUniqueStash() {
    if (!_egUniqueStash || typeof _egUniqueStash !== 'object' || Array.isArray(_egUniqueStash)) _egUniqueStash = {};
    if (!_egUniqueCollected || typeof _egUniqueCollected.has !== 'function') {
        // may have been restored as array from STATE
        const arr = Array.isArray(_egUniqueCollected) ? _egUniqueCollected : [];
        _egUniqueCollected = new Set(arr);
    }
}
function _egAddUniqueToCollection(item) {
    _egEnsureUniqueStash();
    const uid = item.baseId || item.uniqueId || item.id;
    if (!uid) return;
    if (!_egUniqueStash[uid]) _egUniqueStash[uid] = [];
    _egUniqueStash[uid].push(item);
    _egUniqueCollected.add(uid);
    // update unique grid if visible
    if (_egStashTab === 'uniques') _egRenderUniqueStash();
    _egUpdateUniqueTabBadge();
    try { egSaveHubState(); } catch(e) {}
    // toast — muted during bulk flush
    if (typeof window !== 'undefined' && window._egMuteUniqueToast) return;
    try {
        const nm = item.name || uid;
        showToast(t('eg_unique_added_to_collection').replace('{name}', nm), '#f5b642');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('player_equip_pickup');
    } catch(e) {}
}
function _egGetUniqueCount(uid) {
    _egEnsureUniqueStash();
    const arr = _egUniqueStash[uid];
    return Array.isArray(arr) ? arr.length : 0;
}
function _egIsUniqueCollected(uid) {
    _egEnsureUniqueStash();
    return _egUniqueCollected.has(uid);
}
function _egUpdateUniqueTabBadge() {
    _egEnsureUniqueStash();
    const btn = document.getElementById('eg-tab-uniques');
    if (!btn) return;
    const total = (typeof EG_UNIQUE_ITEMS !== 'undefined' ? EG_UNIQUE_ITEMS.length : 0);
    const found = _egUniqueCollected.size;
    let badge = btn.querySelector('.eg-tab-count');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'eg-tab-count';
        btn.appendChild(badge);
    }
    badge.textContent = `${found}/${total}`;
}
function _egMoveUniqueToInventory(uid) {
    _egEnsureUniqueStash();
    const arr = _egUniqueStash[uid];
    if (!arr || arr.length === 0) return false;
    const item = arr.shift();
    // keep empty array so cell stays in 'collected-empty' state instead of reverting to locked '?'
    if (arr.length === 0) _egUniqueStash[uid] = [];
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
        showToast(t('eg_unique_moved_to_inventory').replace('{name}', item.name || uid), '#f5b642');
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playSFX('player_equip_pickup');
    } catch(e) {}
    // ensure inventory tab visible after move? keep on uniques so player can move more
    return true;
}
