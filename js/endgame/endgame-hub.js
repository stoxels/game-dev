//------------------------------------------------------------------------
//-------------------ENDGAME HUB SCREEN----------------------------------
//------------------------------------------------------------------------
// Handles the Endgame Hub UI:
//   - Character panel with paperdoll equipment slots and stats
//   - Currency strip (Runes & Orbs row)
//   - Full-width equipment stash (below the currency strip)
//   - Floating item tooltip on mouseover (+ Alt-hold compare tooltip
//     against the equipped item in the matching paperdoll slot)
//   - Drag-and-drop is handled in endgame-hub-drag-and-drop.js
//   - The Probability Gate (map device + map stash) lives on its own
//     screen — see endgame-gate.js
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

// Equipment slot definitions — each entry maps a slot id to its icon and
// which column of the paperdoll it belongs to (left / right / bottom).
const EG_EQUIP_SLOTS = [
    // Left column (top → bottom)
    { id: 'head', icon: '👑', col: 'left' },
    { id: 'earring1', icon: '💎', col: 'left' },
    { id: 'earring2', icon: '💎', col: 'left' },
    { id: 'amulet', icon: '📿', col: 'left' },
    { id: 'shoulders', icon: '🪶', col: 'left' },
    { id: 'cloak', icon: '🧥', col: 'left' },
    { id: 'chest', icon: '🥋', col: 'left' },
    { id: 'bracers', icon: '🦾', col: 'left' },

    // Right column (top → bottom)
    { id: 'gloves', icon: '🧤', col: 'right' },
    { id: 'belt', icon: '🔗', col: 'right' },
    { id: 'pants', icon: '👖', col: 'right' },
    { id: 'boots', icon: '👢', col: 'right' },
    { id: 'ring1', icon: '💍', col: 'right' },
    { id: 'ring2', icon: '💍', col: 'right' },
    { id: 'arcane', icon: '🔮', col: 'right' },
    { id: 'talisman', icon: '🪬', col: 'right' },

    // Bottom row (weapons)
    { id: 'weapon1', icon: '⚔️', col: 'bottom' },
    { id: 'weapon2', icon: '🛡️', col: 'bottom' },
    { id: 'ranged', icon: '🏹', col: 'bottom' },
];

// Main equipment stash dimensions
const EG_INV_INITIAL_ROWS = 5;
const EG_INV_ROWS = EG_INV_INITIAL_ROWS; // initial/minimum rows; stash grows unlimited beyond this
const EG_INV_COLS = 24;

// ── Unique Collection tab state ────────────────────────────────────────
let _egUniqueStash = {}; // uniqueId -> array of item objects
let _egUniqueCollected = new Set(); // strings of uniqueIds ever found
let _egStashTab = 'inventory'; // 'inventory' | 'uniques'

// ── Unlimited stash helpers (must sit after EG_INV_ROWS/COLS so _egInventory exists) ──
function _egGetInvRows() { return _egInventory ? _egInventory.length : EG_INV_INITIAL_ROWS; }
function _egGetInvCapacity() { return _egGetInvRows() * EG_INV_COLS; }
function _egRebuildInventoryGrid() {
    const grid = document.getElementById('eg-inv-grid');
    if (!grid) return;
    const scrollTop = grid.scrollTop;
    grid.innerHTML = _egBuildInventoryGridHTML();
    _egRenderInventory();
    // keep scroll position stable across rebuilds
    grid.scrollTop = scrollTop;
}
function _egEnsureInvRows(minRows) {
    if (!_egInventory) return;
    if (_egInventory.length >= minRows) return;
    for (let i = _egInventory.length; i < minRows; i++) _egInventory.push(Array(EG_INV_COLS).fill(null));
    const grid = document.getElementById('eg-inv-grid');
    if (grid && grid.children.length < minRows * EG_INV_COLS) {
        _egRebuildInventoryGrid();
    }
}
function _egExpandStashByOneRow() { _egEnsureInvRows(_egGetInvRows() + 1); }
function _egFindFreeInvCell() {
    for (let r = 0; r < _egInventory.length; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) if (!_egInventory[r][c]) return { r, c };
    }
    const r = _egInventory.length;
    _egEnsureInvRows(r + 1);
    return { r, c: 0 };
}
function _egAddItemToStash(item) {
    // Uniques never land in the regular inventory — they go to the Unique Collection
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

// ── Orbs & Shards currency tab (PoE-style fixed slots) ──
// 5 cols × 7 rows = 35 cells; 18 orbs + 9 shards + scouring = 28 assigned.
// Rows 1-4: orbs with empties at (1,4), (2,4) and (4,4); Row 3,5 is Annulment, Row 5,5 is Mirror.
// Row 5: separator row (5,1-5,4 EMPTY, 5,5 Mirror). Rows 6-7: shards in orb occurrence order.
const EG_CURRENCY_COLS = 5;
const EG_CURRENCY_ROWS = 7;

// Equipment currently offered to the crafting bench. The bench UI is opened
// from the Orbs & Shards tab and accepts an item by drag-and-drop.
function _egBuildCraftingBenchSlotHTML() {
    const item = typeof _egCraftingBenchItem !== 'undefined' ? _egCraftingBenchItem : null;
    return `<div class="eg-crafting-launcher"><button class="eg-crafting-open-btn" onclick="_egOpenCraftingBench()">⚒ CRAFTING BENCH</button><div class="eg-crafting-slot" id="eg-crafting-bench-launch-slot" data-eg-dropzone="crafting" ondragover="egDragOver(event)" ondrop="egDropOnCraftingBench(event)">${item ? _egBuildItemChipHTML(item) : 'Drop equipment here'}</div></div>`;
}

// Fixed assignment: currency id → {r,c}. Mirrors PoE currency tab ordering.
// Layout as requested: orbs rows 1-4 with empties at (1,4),(2,4),(4,4); (3,5) is Annulment, (5,5) is Mirror.
// Row 5 (r=4) separator with Mirror at (5,5); shards start at Row 6 (r=5) in orb occurrence order.
// Orb of Scouring kept at (7,5) to retain functionality; remove its entry to make that cell empty.
const EG_CURRENCY_SLOT_MAP = {
    // Row 0 (1,1-1,5) — Transmutation, Augmentation, Alteration, EMPTY, Regal
    'orb_transmutation': { r: 0, c: 0 },
    'orb_augmentation':  { r: 0, c: 1 },
    'orb_alteration':    { r: 0, c: 2 },
    // (0,3) intentionally EMPTY
    'orb_regal':         { r: 0, c: 4 },
    // Row 1 (2,1-2,5) — Alchemy, Blooming, Chaos, EMPTY, Elevation
    'orb_alchemy':       { r: 1, c: 0 },
    'orb_bloom':         { r: 1, c: 1 },
    'orb_chaos':         { r: 1, c: 2 },
    // (1,3) intentionally EMPTY
    'orb_elevation':     { r: 1, c: 4 },
    // Row 2 (3,1-3,5) — Ascension, Exalted, Cataclysm, Horizons, Annulment
    'orb_ascension':     { r: 2, c: 0 },
    'orb_exalted':       { r: 2, c: 1 },
    'orb_cataclysm':     { r: 2, c: 2 },
    'orb_horizons':      { r: 2, c: 3 },
    'orb_annulment':     { r: 2, c: 4 },
    // Row 3 (4,1-4,5) — Blessing, Ancient, Chance, EMPTY, Divine
    'orb_blessing':      { r: 3, c: 0 },
    'orb_ancient':       { r: 3, c: 1 },
    'orb_chance':        { r: 3, c: 2 },
    // (3,3) intentionally EMPTY (Annulment moved to 3,5)
    'orb_divine':        { r: 3, c: 4 },
    // Row 4 (5,1-5,5) — EMPTY with Mirror at (5,5)
    // (4,0)-(4,3) EMPTY, (4,4) Mirror of Vors
    'mirror_of_kalandra':{ r: 4, c: 4 },
    // Row 5-6 (6,1-7,5) — shards in orb occurrence order (starting at 6,1)
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
const EG_CURRENCY_SLOT_REVERSE = (() => {
    const m = {};
    for (const [id, pos] of Object.entries(EG_CURRENCY_SLOT_MAP)) m[`${pos.r}-${pos.c}`] = id;
    return m;
})();

function _egCurrencySlotForId(id) { return EG_CURRENCY_SLOT_MAP[id] || null; }
function _egCurrencyIdForSlot(r, c) { return EG_CURRENCY_SLOT_REVERSE[`${r}-${c}`] || null; }
function _egCurrencyDefForId(id) {
    if (typeof EG_CURRENCY_DEFS !== 'undefined' && EG_CURRENCY_DEFS[id]) return EG_CURRENCY_DEFS[id];
    if (typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS[id]) return EG_SHARD_DEFS[id];
    return null;
}

// Map stash dimensions — 16 tier-filtered infinite stashes (one per map tier)
const EG_MAP_TIER_COUNT = 16;
const EG_MAP_TIER_ROMANS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];
const EG_MAP_STASH_COLS = 20;
const EG_MAP_STASH_INITIAL_ROWS = 4;
const EG_MAP_STASH_ROWS = EG_MAP_STASH_INITIAL_ROWS; // legacy alias (one tier's initial rows)

const _egChipRegistry = new Map();
let _egChipCounter = 0;


//------------------------------------------------------------------------
//-------------------STATE------------------------------------------------
//------------------------------------------------------------------------

// Main equipment stash: 2D grid of item objects (null = empty cell)
let _egInventory = Array.from({ length: EG_INV_ROWS }, () => Array(EG_INV_COLS).fill(null));

// Equipped items on the paperdoll: keyed by slot id, e.g. { head: {...}, chest: {...} }
let _egEquipped = {};

// Single item currently loaded into the Map Device orb slot
let _egMapSlotItem = null;

// Currency stash: 2D grid of currency item objects (null = empty cell)
let _egCurrencyStash = Array.from({ length: EG_CURRENCY_ROWS }, () => Array(EG_CURRENCY_COLS).fill(null));

// Map stash: array of 16 tier-filtered stashes, each a 2D grid (rows × EG_MAP_STASH_COLS)
// _egMapStash[tierIdx][row][col] — tierIdx 0 = Tier I, 15 = Tier XVI
function _egMakeMapTierGrid(rows) {
    const r = rows != null ? rows : EG_MAP_STASH_INITIAL_ROWS;
    return Array.from({ length: r }, () => Array(EG_MAP_STASH_COLS).fill(null));
}
function _egMakeAllMapStashes() {
    return Array.from({ length: EG_MAP_TIER_COUNT }, () => _egMakeMapTierGrid());
}
let _egMapStash = _egMakeAllMapStashes();
// Active tier tab (1..16) shown in the Probability Gate
let _egMapStashActiveTier = 1;

function _egMapTierToIndex(tier) {
    const t = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(tier || 1)));
    return t - 1;
}
function _egGetMapTierGrid(tier) {
    const idx = _egMapTierToIndex(tier);
    if (!_egMapStash[idx] || !Array.isArray(_egMapStash[idx])) _egMapStash[idx] = _egMakeMapTierGrid();
    return _egMapStash[idx];
}
function _egGetMapStashRowsForTier(tier) {
    return _egGetMapTierGrid(tier).length;
}
function _egEnsureMapTierRows(tier, minRows) {
    const idx = _egMapTierToIndex(tier);
    let grid = _egGetMapTierGrid(tier);
    if (grid.length >= minRows) return;
    for (let i = grid.length; i < minRows; i++) grid.push(Array(EG_MAP_STASH_COLS).fill(null));
    if (tier === _egMapStashActiveTier && typeof _egRebuildMapStashGrid === 'function') {
        // defer if gate helpers not yet loaded
        try { _egRebuildMapStashGrid(); } catch(e) {}
    }
}
function _egRebuildMapStashGrid() {
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
function _egFindFreeMapCellForTier(tier) {
    const grid = _egGetMapTierGrid(tier);
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) if (!grid[r][c]) return { r, c };
    }
    const r = grid.length;
    _egEnsureMapTierRows(tier, r + 1);
    return { r, c: 0 };
}
// Legacy helpers that operated on the flat grid — now tier-aware wrappers
function _egIsLegacyFlatMapStash(stash) {
    if (!Array.isArray(stash) || stash.length === 0) return false;
    // Flat: stash[0][0] is null or a map object, not an array of rows
    // Tiered: stash[0] is itself a 2D array (first element is an array)
    return stash.length > 0 && Array.isArray(stash[0]) && stash[0].length > 0 && !Array.isArray(stash[0][0]) && (stash[0][0] === null || typeof stash[0][0] === 'object') && (stash.length !== EG_MAP_TIER_COUNT || !Array.isArray(stash[0][0]));
}
// Detect tiered shape: stash.length === 16 and each entry is 2D array
function _egIsTieredMapStash(stash) {
    if (!Array.isArray(stash) || stash.length !== EG_MAP_TIER_COUNT) return false;
    return stash.every(tierGrid => Array.isArray(tierGrid) && tierGrid.length > 0 && Array.isArray(tierGrid[0]));
}

// Tooltip state: tracks which item is currently being previewed in the tooltip panel
let _egTooltipItem = null;

// ── Mass-sell filter state ──────────────────────────────────────────────
// Which rarities are PROTECTED from mass sell (true = keep, false = sell).
// Ordered low → high so the modal can simply iterate the array.
const EG_MASS_SELL_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact', 'cursed'];
// Extra toggle: when true, unique items (isUnique) are never sold even if
// their underlying rarity would be sold.
let _egMassSellKeepUnique = true;
// Map rarity → bool; initialised in _egLoadMassSellSettings().
let _egMassSellKeep = null;
// Item level filter: keep items with itemLevel >= this value (0 = disabled)
let _egMassSellMinItemLevel = 0;
// Required character level filter: keep items with requirements.level >= this value (0 = disabled)
let _egMassSellMinReqLevel = 0;

// ── Item level display toggle ───────────────────────────────────────────
// true = show item level (itemLevel), false = show required character level (requirements.level)
let _egShowItemLevel = true;
function _egDefaultMassSellKeep() {
    return {
        common: false,
        uncommon: false,
        rare: true,
        epic: true,
        legendary: true,
        artifact: true,
        cursed: false,
    };
}
function _egNormaliseMassSellKeep(raw) {
    const def = _egDefaultMassSellKeep();
    if (!raw || typeof raw !== 'object') return { ...def };
    const out = { ...def };
    for (const r of EG_MASS_SELL_RARITIES) {
        if (typeof raw[r] === 'boolean') out[r] = raw[r];
    }
    return out;
}
function _egLoadMassSellSettings() {
    _egMassSellKeep = _egNormaliseMassSellKeep(STATE && STATE.egMassSellKeep);
    if (typeof STATE !== 'undefined' && typeof STATE.egMassSellKeepUnique === 'boolean') {
        _egMassSellKeepUnique = STATE.egMassSellKeepUnique;
    } else {
        _egMassSellKeepUnique = true;
    }
    if (typeof STATE !== 'undefined' && typeof STATE.egShowItemLevel === 'boolean') {
        _egShowItemLevel = STATE.egShowItemLevel;
    }
    if (typeof STATE !== 'undefined' && typeof STATE.egMassSellMinItemLevel === 'number') {
        _egMassSellMinItemLevel = Math.max(0, Math.floor(STATE.egMassSellMinItemLevel));
    } else {
        _egMassSellMinItemLevel = 0;
    }
    if (typeof STATE !== 'undefined' && typeof STATE.egMassSellMinReqLevel === 'number') {
        _egMassSellMinReqLevel = Math.max(0, Math.floor(STATE.egMassSellMinReqLevel));
    } else {
        _egMassSellMinReqLevel = 0;
    }
}
function _egSaveMassSellSettings() {
    if (typeof STATE !== 'undefined') {
        STATE.egMassSellKeep = { ..._egMassSellKeep };
        STATE.egMassSellKeepUnique = _egMassSellKeepUnique;
        STATE.egShowItemLevel = _egShowItemLevel;
        STATE.egMassSellMinItemLevel = _egMassSellMinItemLevel;
        STATE.egMassSellMinReqLevel = _egMassSellMinReqLevel;
        if (typeof save === 'function') try { save(); } catch (e) {}
    }
    // also persist via the main hub save path
    if (typeof egSaveHubState === 'function') try { egSaveHubState(); } catch (e) {}
}
// Returns true when the item should be KEPT (NOT sold) under the current filter.
// Protection is an OR across all active keep criteria: unique, rarity,
// itemLevel threshold and required-level threshold. This matches the live
// preview in _egUpdateMassSellPreview so the confirmation counts and the
// actual sell agree.
function _egIsProtectedFromMassSell(item) {
    if (!item) return true;
    if (_egMassSellKeepUnique && item.isUnique) return true;
    const rarity = (item.rarity || 'common').toLowerCase();
    if (_egMassSellKeep && _egMassSellKeep[rarity]) return true;
    // Item level filter: keep items with itemLevel >= minItemLevel (0 = disabled)
    if (_egMassSellMinItemLevel > 0 && item.itemLevel != null && item.itemLevel >= _egMassSellMinItemLevel) return true;
    // Required character level filter: keep items with requirements.level >= minReqLevel (0 = disabled)
    if (_egMassSellMinReqLevel > 0 && item.requirements && item.requirements.level != null && item.requirements.level >= _egMassSellMinReqLevel) return true;
    return false;
}
function _egMassSellCounts() {
    let keep = 0, sell = 0;
    if (!_egInventory) return { keep, sell };
    for (let r = 0; r < _egInventory.length; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            const it = _egInventory[r][c];
            if (!it) continue;
            if (_egIsProtectedFromMassSell(it)) keep++; else sell++;
        }
    }
    return { keep, sell };
}
// Load mass-sell defaults immediately (STATE may already hold a save).
_egLoadMassSellSettings();


//------------------------------------------------------------------------
//-------------------HTML HELPERS: ITEM CHIP------------------------------
//------------------------------------------------------------------------


// Builds the draggable item chip markup used in every grid zone.
// size: 'normal' (default) or 'large' (used inside the map device slot).

function _egBuildItemChipHTML(item, size = 'normal') {
    const rarityClass = item.rarity ? `eg-rarity-${item.rarity}` : '';
    const sizeClass = size === 'large' ? 'eg-item-chip-large' : '';
    // Items whose stat requirements cannot currently be met get a red flag
    // (see _egIsItemBlocked in endgame-requirements.js).
    const blockedClass = _egIsItemBlocked(item) ? 'eg-req-blocked' : '';
    // Equipment items show either item level or required character level in the top-left corner of the slot.
    const itemLevel = item.itemLevel;
    const reqLevel = (item.requirements && item.requirements.level != null) ? item.requirements.level : item.itemLevel;
    const showLevel = _egShowItemLevel ? itemLevel : reqLevel;
    const ilvlBadge = (item.category === 'equip' && showLevel != null)
        ? `<span class="eg-item-ilvl">${showLevel}</span>`
        : '';
    // Map items show their map tier instead.
    const mapTierBadge = (item.category === 'map' && item.mapTier != null)
        ? `<span class="eg-item-ilvl eg-map-tier-badge">${item.mapTier}</span>`
        : '';
    const chipId = `egchip-${++_egChipCounter}`;
    _egChipRegistry.set(chipId, item);

    return `
<div class="eg-item-chip ${rarityClass} ${sizeClass} ${blockedClass}"
     id="${chipId}"
     onmousedown="_egHandleChipMouseDown(event, '${chipId}')"
     onmouseenter="_egShowTooltipFromChip('${chipId}', event)"
     onmousemove="_egMoveTooltip(event)"
     onmouseleave="_egClearTooltip()">
    ${ilvlBadge}
    ${mapTierBadge}
    <span class="eg-item-chip-icon">${EG_ART.html('item', item.baseId, item.icon || '📦')}</span>
    <span class="eg-item-chip-name">${item.name || '???'}</span>
</div>`;
}



function _egShowTooltipFromChip(chipId, e) {
    const item = _egChipRegistry.get(chipId);
    if (item) {
        _egShowTooltip(item, e);
    }
}

// Mouse-down handler for item chips - initiates custom drag-and-drop
function _egHandleChipMouseDown(e, chipId) {
    if (e.button !== 0) return; // left-click only
    const chip = document.getElementById(chipId);
    if (!chip) return;
    e.preventDefault();
    _egClearTooltip();
    _dndPickUp(e, chip);
}




//------------------------------------------------------------------------
//-------------------HTML HELPERS: EQUIPMENT PANEL------------------------
//------------------------------------------------------------------------

// Builds a single equipment slot div (the outer drop-target container).
function _egBuildEquipSlotHTML(slot) {
    return `
<div class="eg-equip-slot"
     id="eg-equip-slot-${slot.id}"
     data-slot-id="${slot.id}"
     data-eg-dropzone="equip"
     ondragover="egDragOver(event)"
     ondrop="egDropOnEquip(event, '${slot.id}')"
     ondragleave="egDragLeave(event)">
    <div class="eg-equip-slot-item" id="eg-equip-item-${slot.id}">
        <span class="eg-equip-slot-placeholder">${slot.icon || '◻'}</span>
    </div>
</div>`;
}

// Builds all equipment slot divs for a given paperdoll column.
function _egBuildEquipColHTML(col) {
    return EG_EQUIP_SLOTS
        .filter(s => s.col === col)
        .map(s => _egBuildEquipSlotHTML(s))
        .join('');
}

// Assembles the full character panel: offense stats (upper left), left slots,
// center puzzle stats, right slots, defense stats (upper right), weapon row.
function _egBuildCharPanelHTML() {
    return `
<div class="eg-panel eg-panel-char">
    <div class="eg-panel-label eg-char-label-row"><span>${t('eg_char_label')}</span><span id="eg-char-level-inline"></span></div>
    <div class="eg-char-panel eg-char-panel-no-model">
        <div class="eg-stat-block" id="eg-stats-offense">
            <div class="eg-stats-header">${t('eg_stats_offense_label')}</div>
            <div class="eg-stats-list" id="eg-offense-stats-list"></div>
        </div>
        <div class="eg-equip-col eg-equip-left" id="eg-equip-left">
            ${_egBuildEquipColHTML('left')}
        </div>
        <div class="eg-char-stats-panel" id="eg-char-stats-panel">
            <div class="eg-stats-header">${t('eg_stats_label')}</div>
            <div class="eg-stats-list" id="eg-stats-list"></div>
        </div>
        <div class="eg-equip-col eg-equip-right" id="eg-equip-right">
            ${_egBuildEquipColHTML('right')}
        </div>
        <div class="eg-stat-block" id="eg-stats-defense">
            <div class="eg-stats-header">${t('eg_stats_defense_label')}</div>
            <div class="eg-stats-list" id="eg-defense-stats-list"></div>
        </div>
    </div>
    <div class="eg-equip-bottom-row" id="eg-equip-bottom">
        ${_egBuildEquipColHTML('bottom')}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: CURRENCY STASH-------------------------
//------------------------------------------------------------------------

// Builds a single currency stash cell div (drop target).
// Empty assigned slots get a faint icon + hover tooltip stating the assigned orb/shard name.
function _egBuildCurrencyCellHTML(row, col) {
    // Placeholder tooltip handled via JS hover helpers; cell carries data for empty display.
    return `
<div class="eg-inv-cell eg-currency-cell"
     id="eg-currency-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="currency"
     onmouseenter="_egOnCurrencyCellEnter(${row}, ${col}, event)"
     onmousemove="_egOnCurrencyCellMove(event)"
     onmouseleave="_egOnCurrencyCellLeave()"
     ondragover="egDragOver(event)"
     ondrop="egDropOnCurrency(event, ${row}, ${col})"
     ondragleave="egDragLeave(event)">
</div>`;
}

// Builds the full currency grid by iterating over all rows and columns.
function _egBuildCurrencyGridHTML() {
    let html = '';
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            html += _egBuildCurrencyCellHTML(r, c);
        }
    }
    return html;
}

// Hub: left-side Orbs & Shards panel (PoE currency tab style)
function _egBuildCurrencyPanelHTML() {
    return `
<div class="eg-currency-col">
    <div class="eg-panel-label">${t('eg_runes_orbs')}</div>
    <div class="eg-currency-grid" id="eg-currency-grid"
         style="grid-template-columns: repeat(${EG_CURRENCY_COLS}, 1fr);">
        ${_egBuildCurrencyGridHTML()}
    </div>
    ${_egBuildCraftingBenchSlotHTML()}
</div>`;
}

// Gate: horizontal Orbs & Shards strip (same fixed slots, shared data)
function _egBuildCurrencyStripHTML() {
    return `
<div class="eg-currency-strip">
    <div class="eg-panel-label">${t('eg_runes_orbs')}</div>
    <div class="eg-currency-row" id="eg-currency-grid"
         style="grid-template-columns: repeat(${EG_CURRENCY_COLS}, 1fr);">
        ${_egBuildCurrencyGridHTML()}
    </div>
</div>`;
}

// Hover helpers for empty assigned slots — show placeholder name without needing an item.
function _egOnCurrencyCellEnter(row, col, e) {
    const cell = document.getElementById(`eg-currency-cell-${row}-${col}`);
    const item = _egCurrencyStash[row] && _egCurrencyStash[row][col];
    if (item) return; // occupied → chip's own onmouseenter handles tooltip
    const assignedId = _egCurrencyIdForSlot(row, col);
    if (!assignedId) return;
    const def = _egCurrencyDefForId(assignedId);
    if (!def) return;
    // Build a minimal currency-like tooltip for the empty slot
    const ttName = def.name || assignedId;
    const ttIcon = def.icon || '◻';
    const ttDesc = def.description || '';
    // Respect LANG for shards/orbs already translated; just use def fields
    const html = `
<div class="eg-tt-frame" style="--tt-border:#b59248;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon" style="opacity:0.55;">${ttIcon}</div>
        <div class="eg-tt-name" style="color:#f5d98a; opacity:0.9;">${ttName}</div>
        <div class="eg-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_currency')} — ${t('eg_empty_slot_hint') || 'Empty slot'}</div>
    </div>
    <div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:0.85;">${ttDesc}</div></div>
</div>`;
    if (typeof showGameTooltip === 'function') showGameTooltip(html, e);
}
function _egOnCurrencyCellMove(e) {
    // Only move tooltip when hovering an empty assigned slot (occupied chips manage themselves)
    const cell = e.currentTarget || e.target.closest && e.target.closest('.eg-currency-cell');
    if (!cell) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const item = _egCurrencyStash[r] && _egCurrencyStash[r][c];
    if (item) return;
    if (_egCurrencyIdForSlot(r,c) && typeof moveGameTooltip === 'function') moveGameTooltip(e);
}
function _egOnCurrencyCellLeave() {
    // Only clear if we were showing an empty-slot tooltip (occupied chip leave already handled)
    if (typeof hideGameTooltip === 'function') hideGameTooltip();
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: EQUIPMENT STASH (BOTTOM)---------------
//------------------------------------------------------------------------

// Builds a single equipment stash cell div (drop target).
function _egBuildInventoryCellHTML(row, col) {
    return `
<div class="eg-inv-cell"
     id="eg-inv-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="inv"
     ondragover="egDragOver(event)"
     ondrop="egDropOnInv(event, ${row}, ${col})"
     ondragleave="egDragLeave(event)">
</div>`;
}

// Builds the full equipment stash grid by iterating over all rows and columns.
function _egBuildInventoryGridHTML() {
    let html = '';
    const rows = _egGetInvRows();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            html += _egBuildInventoryCellHTML(r, c);
        }
    }
    return html;
}

// Assembles the full-width stash panel at the bottom of the screen.
// Now with two tabs: INVENTORY (regular stash) and UNIQUES (PoE-style collection).
function _egBuildStashPanelHTML() {
    const invActive = _egStashTab !== 'uniques';
    const uniqActive = _egStashTab === 'uniques';
    const totalUniques = (typeof EG_UNIQUE_ITEMS !== 'undefined' ? EG_UNIQUE_ITEMS.length : 0);
    const foundUniques = (_egUniqueCollected ? _egUniqueCollected.size : 0);
    return `
<div class="eg-panel eg-panel-inv">
    <div class="eg-panel-label eg-stash-header">
        <span>${t('eg_stash_label')}</span>
        <div id="eg-stash-info" class="eg-stash-info" aria-live="polite"></div>
        <div class="eg-stash-actions">
            <button class="eg-stash-btn eg-stash-btn-config" id="eg-toggle-ilvl-btn"
                     onclick="_egToggleItemLevelDisplay()"
                     onmouseenter="_egShowItemLevelToggleTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">${_egShowItemLevel ? '🔢' : '👤'} ${t(_egShowItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}</button>
            <button class="eg-stash-btn eg-stash-btn-config" id="eg-loot-filter-btn"
                     onclick="_egOpenLootFilterModal()"
                     onmouseenter="_egShowLootFilterTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">⚗ ${t('eg_loot_filter_btn')}</button>
            <button class="eg-stash-btn eg-stash-btn-config" onclick="_egOpenMassSellModal()"
                     onmouseenter="_egShowMassSellConfigTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">⚙ ${t('eg_mass_sell_config')}</button>
            <button class="eg-stash-btn eg-stash-btn-sell" onclick="_egRequestMassSell()"
                     onmouseenter="_egShowMassSellTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">⚒ ${t('eg_mass_sell_btn')}</button>
        </div>
    </div>
    <div class="eg-stash-tabs" id="eg-stash-tabs">
        <button class="eg-stash-tab ${invActive ? 'active' : ''}" id="eg-tab-inventory" data-tab="inventory" onclick="_egSwitchStashTab('inventory')">${t('eg_tab_inventory') || 'INVENTORY'}</button>
        <button class="eg-stash-tab ${uniqActive ? 'active' : ''}" id="eg-tab-uniques" data-tab="uniques" onclick="_egSwitchStashTab('uniques')">${t('eg_tab_uniques') || 'UNIQUES'} <span class="eg-tab-count">${foundUniques}/${totalUniques}</span></button>
    </div>
    <div class="eg-stash-tab-body ${invActive ? 'active' : ''}" id="eg-stash-tab-inventory">
        <div class="eg-inv-grid" id="eg-inv-grid" style="grid-template-columns: repeat(${EG_INV_COLS}, 1fr);">
            ${_egBuildInventoryGridHTML()}
        </div>
    </div>
    <div class="eg-stash-tab-body ${uniqActive ? 'active' : ''}" id="eg-stash-tab-uniques">
        <div class="eg-unique-hint">${t('eg_unique_stash_hint')}</div>
        <div class="eg-unique-count" id="eg-unique-count">${t('eg_uniques_collected').replace('{found}', foundUniques).replace('{total}', totalUniques)}</div>
        <div class="eg-unique-grid" id="eg-unique-grid" data-eg-dropzone="uniques" ondragover="egDragOver(event)" ondragleave="egDragLeave(event)">
            ${_egBuildUniqueGridHTML()}
        </div>
    </div>
</div>`;
}
function _egSwitchStashTab(tab) {
    _egStashTab = (tab === 'uniques' ? 'uniques' : 'inventory');
    const invBody = document.getElementById('eg-stash-tab-inventory');
    const uniqBody = document.getElementById('eg-stash-tab-uniques');
    const invTab = document.getElementById('eg-tab-inventory');
    const uniqTab = document.getElementById('eg-tab-uniques');
    if (invBody) invBody.classList.toggle('active', _egStashTab === 'inventory');
    if (uniqBody) uniqBody.classList.toggle('active', _egStashTab === 'uniques');
    if (invTab) invTab.classList.toggle('active', _egStashTab === 'inventory');
    if (uniqTab) uniqTab.classList.toggle('active', _egStashTab === 'uniques');
    if (_egStashTab === 'uniques') _egRenderUniqueStash();
    else _egRenderInventory();
}
function _egBuildUniqueGridHTML() {
    if (typeof EG_UNIQUE_ITEMS === 'undefined' || !Array.isArray(EG_UNIQUE_ITEMS)) return '<div class="eg-unique-empty">No uniques defined</div>';
    let html = '';
    for (let i = 0; i < EG_UNIQUE_ITEMS.length; i++) {
        const def = EG_UNIQUE_ITEMS[i];
        const uid = def.uniqueId;
        const collected = _egIsUniqueCollected(uid);
        const count = _egGetUniqueCount(uid);
        const items = collected ? (_egUniqueStash[uid] || []) : [];
        const displayName = (LANG === 'de' ? (def.nameDe || def.nameEn) : def.nameEn) || uid;
        let cellCls;
        if (!collected) cellCls = 'locked';
        else if (count === 0) cellCls = 'collected-empty';
        else cellCls = 'collected';
        const icon = collected ? (items[0] ? (items[0].icon || def.icon || '❓') : (def.icon || '❓')) : '?';
        const countBadge = count > 1 ? `<span class="eg-unique-count-badge">${t('eg_unique_count').replace('{n}', count)}</span>` : (count === 0 && collected ? `<span class="eg-unique-count-badge" style="background:#888;">0</span>` : '');
        const lockedOverlay = !collected ? '<span class="eg-unique-lock">?</span>' : '';
        html += `<div class="eg-unique-cell ${cellCls}" data-unique-id="${uid}" data-uid="${uid}" data-eg-dropzone="uniques"
            ondragover="egDragOver(event)" ondragleave="egDragLeave(event)"
            onmouseenter="_egOnUniqueCellEnter('${uid}', event)"
            onmousemove="_egOnUniqueCellMove('${uid}', event)"
            onmouseleave="_egOnUniqueCellLeave('${uid}', event)"
            oncontextmenu="_egOnUniqueCellRightClick(event, '${uid}')"
            onclick="_egOnUniqueCellClick(event, '${uid}')">
            <div class="eg-unique-cell-name">${displayName}</div>
            <div class="eg-unique-cell-icon">${EG_ART ? EG_ART.html('item', uid, icon) : icon}${countBadge}${lockedOverlay}</div>
        </div>`;
    }
    return html;
}
function _egRenderUniqueStash() {
    const grid = document.getElementById('eg-unique-grid');
    if (!grid) return;
    grid.innerHTML = _egBuildUniqueGridHTML();
    const total = (typeof EG_UNIQUE_ITEMS !== 'undefined' ? EG_UNIQUE_ITEMS.length : 0);
    const found = (_egUniqueCollected ? _egUniqueCollected.size : 0);
    const cntEl = document.getElementById('eg-unique-count');
    if (cntEl) cntEl.textContent = t('eg_uniques_collected').replace('{found}', found).replace('{total}', total);
    _egUpdateUniqueTabBadge();
}
function _egOnUniqueCellClick(e, uid) {
    // left click does nothing except ensure tooltip stays; right-click handles transfer via contextmenu
    if (e.button === 0) e.preventDefault();
}
function _egOnUniqueCellRightClick(e, uid) {
    e.preventDefault();
    _egEnsureUniqueStash();
    const arr = _egUniqueStash[uid];
    if (!arr || arr.length === 0) {
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(t('eg_unique_not_collected'), {type:'info'});
        return;
    }
    _egClearTooltip();
    hideGameTooltip();
    const ok = _egMoveUniqueToInventory(uid);
    if (ok) _egRenderInventory();
}
function _egOnUniqueCellEnter(uid, e) {
    _egEnsureUniqueStash();
    const arr = _egUniqueStash[uid];
    // Ensure previous multi-tip inline overrides don't leak into next tooltip
    const prevTip = document.getElementById('ghud-floating-tip');
    if (prevTip && prevTip.classList.contains('eg-unique-multi')) {
        prevTip.classList.remove('eg-unique-multi','eg-wide-tip');
        prevTip.style.maxWidth = '380px';
        prevTip.style.width = '';
        prevTip.style.maxHeight = '';
        prevTip.style.overflowY = '';
        prevTip.style.pointerEvents = 'none';
        // remove multi hover handlers if any
        prevTip.onmouseenter = null;
        prevTip.onmouseleave = null;
    }
    if (!arr || arr.length === 0) {
        const isCollected = _egIsUniqueCollected(uid);
        const def = (typeof EG_UNIQUE_ITEMS !== 'undefined') ? EG_UNIQUE_ITEMS.find(u=>u.uniqueId===uid) : null;
        const name = def ? ((LANG==='de'?def.nameDe:def.nameEn)||def.nameEn) : uid;
        const icon = def ? (def.icon || '?') : '?';
        if (isCollected) {
            const html = `<div class="eg-tt-frame" style="--tt-border:#c8a84b;"><div class="eg-tt-header"><div class="eg-tt-icon" style="opacity:0.6;">${EG_ART ? EG_ART.html('item', uid, icon) : icon}</div><div class="eg-tt-name" style="color:#c8a84b;">${name}</div><div class="eg-tt-rarity-line" style="color:#f5d98a;">${t('eg_unique_in_inventory') || 'Collected — in Inventory (0 remaining)'}</div></div><div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:.8;">${t('eg_unique_empty_hint') || 'All copies moved to Inventory. Drag one back or loot another.'}</div></div></div>`;
            showGameTooltip(html, e);
        } else {
            const html = `<div class="eg-tt-frame" style="--tt-border:#555;"><div class="eg-tt-header"><div class="eg-tt-icon">?</div><div class="eg-tt-name" style="color:#888;">${name}</div><div class="eg-tt-rarity-line" style="color:#888;">${t('eg_unique_not_collected')}</div></div><div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:.6;">${t('eg_unique_stash_hint')}</div></div></div>`;
            showGameTooltip(html, e);
        }
        return;
    }
    // Build multi-tooltip: container with flex row of each variant's full tooltip body
    if (arr.length === 1) {
        _egShowTooltip(arr[0], e);
        // append right-click hint
        // we could inject after, but just let normal tooltip; right-click hint via extra line handled in custom?
        // add hint via stash info? Instead append to tooltip DOM after show
        setTimeout(()=>{
            const tip=document.getElementById('ghud-floating-tip');
            if(tip && !tip.querySelector('.eg-unique-tip-hint')){
                const h=document.createElement('div');
                h.className='eg-unique-tip-hint';
                h.textContent=t('eg_unique_right_click_hint');
                h.style.cssText='margin-top:6px;padding-top:4px;border-top:1px dashed #444;font-size:9px;color:#f5d98a;text-align:center;';
                tip.appendChild(h);
            }
        },10);
        return;
    }
    // Multiple copies: build side-by-side frames – scrollable, stays open while hovering tip
    const frames = arr.map(it=>_egBuildTooltipBodyHTML(it)).join('');
    const header = `<div style="text-align:center;font-family:var(--PX);font-size:9px;color:#f5d98a;margin-bottom:6px;letter-spacing:1px;">${t('eg_unique_tooltip_count').replace('{n}', arr.length)} — ${t('eg_unique_right_click_hint')}</div>`;
    const html = `<div class="eg-unique-multi-tip">${header}<div class="eg-unique-multi-row">${frames}</div></div>`;
    showGameTooltip(html, e);
    const tip=document.getElementById('ghud-floating-tip');
    if(tip){
        tip.classList.add('eg-wide-tip','eg-unique-multi');
        tip.style.maxWidth = '96vw';
        tip.style.width = 'auto';
        tip.style.maxHeight = '85vh';
        tip.style.overflowY = 'auto';
        tip.style.pointerEvents = 'auto';
        // keep tip open when mouse moves from cell onto the tip itself
        tip.onmouseenter = null;
        tip.onmouseleave = (ev) => {
            // hide when leaving the tip unless re-entering the originating cell
            const stillOverCell = document.querySelector(`.eg-unique-cell[data-uid="${uid}"]:hover`);
            if (!stillOverCell) {
                hideGameTooltip();
                tip.classList.remove('eg-wide-tip','eg-unique-multi');
                tip.style.maxWidth = '380px';
                tip.style.width = '';
                tip.style.maxHeight = '';
                tip.style.overflowY = '';
                tip.style.pointerEvents = 'none';
                tip.onmouseenter = null;
                tip.onmouseleave = null;
            }
        };
        if (typeof moveGameTooltip === 'function') moveGameTooltip(e);
        else if (typeof _calcGameTooltipPos === 'function') {
            const pos = _calcGameTooltipPos(e, tip.offsetWidth, tip.offsetHeight);
            tip.style.left = pos.x + 'px';
            tip.style.top = pos.y + 'px';
        }
    }
}
function _egOnUniqueCellMove(uid, e){
    // support both signatures: (uid, e) and (e)
    if (e === undefined) { e = uid; uid = null; }
    const tip=document.getElementById('ghud-floating-tip');
    if (tip && tip.classList.contains('eg-unique-multi')) return; // multi tip is pinned, don't follow mouse
    if(typeof moveGameTooltip==='function') moveGameTooltip(e);
}
function _egOnUniqueCellLeave(uid, e){
    if (e === undefined && typeof uid === 'object' && uid && uid.type) { e = uid; uid = null; }
    const tip=document.getElementById('ghud-floating-tip');
    if(tip && tip.classList.contains('eg-unique-multi')) {
        // don't hide immediately – let tip's own mouseleave handle it, or delay to allow moving onto tip
        setTimeout(()=>{
            const tipNow=document.getElementById('ghud-floating-tip');
            if(!tipNow) return;
            const overTip = tipNow.matches(':hover');
            const overCell = uid ? document.querySelector(`.eg-unique-cell[data-uid="${uid}"]:hover`) : null;
            if (!overTip && !overCell) {
                hideGameTooltip();
                tipNow.classList.remove('eg-wide-tip','eg-unique-multi');
                tipNow.style.maxWidth = '380px';
                tipNow.style.width = '';
                tipNow.style.maxHeight = '';
                tipNow.style.overflowY = '';
                tipNow.style.pointerEvents = 'none';
                tipNow.onmouseenter = null;
                tipNow.onmouseleave = null;
            }
        }, 80);
        return;
    }
    hideGameTooltip();
    if(tip) {
        tip.classList.remove('eg-wide-tip','eg-unique-multi');
        tip.style.maxWidth = '380px';
        tip.style.width = '';
        tip.style.maxHeight = '';
        tip.style.overflowY = '';
        tip.style.pointerEvents = 'none';
        tip.onmouseenter = null;
        tip.onmouseleave = null;
    }
}

//------------------------------------------------------------------------
//-------------------STASH CENTER INFO OVERLAY-----------------------------
//------------------------------------------------------------------------
// Transient feedback line centered in the stash header. Used to explain
// WHY an action did not work (orb cannot apply, equip/unequip blocked by
// stat requirements or chain-break, etc.). The element is absolutely
// positioned so it never shifts the STASH label or action buttons.

let _egStashInfoTimer = null;

function _egEnsureStashInfoEl() {
    let el = document.getElementById('eg-stash-info');
    if (el) return el;
    const header = document.querySelector('.eg-stash-header');
    if (!header) return null;
    el = document.createElement('div');
    el.id = 'eg-stash-info';
    el.className = 'eg-stash-info';
    el.setAttribute('aria-live', 'polite');
    // insert between label and actions (as 2nd child)
    const actions = header.querySelector('.eg-stash-actions');
    if (actions) header.insertBefore(el, actions);
    else header.appendChild(el);
    return el;
}

function _egShowStashInfo(message, opts = {}) {
    const el = _egEnsureStashInfoEl();
    if (!el || !message) return;
    const type = opts.type || 'error';
    const duration = opts.duration != null ? opts.duration : 4500;
    // derive duration from toast setting when available
    let effectiveDuration = duration;
    try {
        const sld = document.getElementById('sld-toast');
        if (sld && !opts.duration) {
            const v = parseInt(sld.value, 10);
            if (!isNaN(v) && v >= 2 && v <= 15) effectiveDuration = v * 1000;
        }
    } catch (e) {}
    el.textContent = message;
    el.className = 'eg-stash-info show eg-stash-info--' + type;
    if (_egStashInfoTimer) clearTimeout(_egStashInfoTimer);
    _egStashInfoTimer = setTimeout(() => {
        el.classList.remove('show');
    }, effectiveDuration);
}

function _egClearStashInfo() {
    const el = document.getElementById('eg-stash-info');
    if (el) el.classList.remove('show');
    if (_egStashInfoTimer) { clearTimeout(_egStashInfoTimer); _egStashInfoTimer = null; }
}


//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY: FULL SCREEN---------------------------
//------------------------------------------------------------------------

// Builds the top navigation bar with back button, level/attribute window
// button and hub title.
function _egBuildTopbarHTML() {
    return `
<div class="eg-topbar">
    <button class="eg-back-btn" onclick="safeGoBackFromHub()">${t('btn_back')}</button>
    <span class="eg-topbar-title">${t('eg_char_sheet_title')}</span>
    <button class="eg-level-btn" id="eg-level-btn"
         onclick="_egOpenAttributeWindow()"
         onmouseenter="_egShowLevelBtnTooltip(event)"
         onmousemove="moveGameTooltip(event)"
         onmouseleave="hideGameTooltip()">✦ ${t('eg_lvl_button_label')}<span class="eg-level-badge" id="eg-level-badge"></span></button>
    <button class="eg-level-btn" id="eg-btn-passive-tree"
         onclick="showPassiveTree('screen-endgame-hub')">🌿 ${t('scr_probability_tree')}</button>
    <button class="eg-level-btn"
         onclick="showEndgameAtlas('showEndgameHub')">🗺 ${t('eg_atlas_title')}</button>
    <button class="eg-level-btn"
         onclick="showEndgameGate('showEndgameHub')">🎲 ${t('mg_gate_badge')}</button>
    <button class="eg-info-btn" id="eg-hub-info-btn" aria-label="Info"
         onmouseenter="_egShowHubInfoTooltip(event)"
         onmousemove="moveGameTooltip(event)"
         onmouseleave="_egHideHubInfoTooltip()">?</button>
</div>`;
}

// Updates the Probability Tree button highlight based on available points.
// Shows a golden border/glow and a yellow point count when there are unspent
// Convergence Points — mirrors renderLSPassiveTreeButton and _renderTopBarTreePoints.
function _egUpdatePassiveTreeButton() {
    const btn = document.getElementById('eg-btn-passive-tree');
    if (!btn) return;
    const points = (typeof STATE !== 'undefined' && STATE.passiveTreePoints) || 0;
    const hasPoints = points > 0;
    btn.classList.toggle('unspent-points', hasPoints);
    let countEl = document.getElementById('eg-pt-point-count');
    if (!countEl) {
        countEl = document.createElement('span');
        countEl.id = 'eg-pt-point-count';
        btn.appendChild(countEl);
    }
    countEl.textContent = hasPoints ? ` (${points})` : '';
}

// Toggles between showing item level and required character level on item chips.
function _egToggleItemLevelDisplay() {
    _egShowItemLevel = !_egShowItemLevel;
    _egSaveMassSellSettings(); // persists the toggle
    _egRebuildInventoryGrid(); // re-render stash
    _egRenderEquipSlots(); // re-render equipped items
    _egUpdateItemLevelToggleButton();
}

// Updates the toggle button text/icon to match current state.
function _egUpdateItemLevelToggleButton() {
    const btn = document.getElementById('eg-toggle-ilvl-btn');
    if (btn) {
        btn.innerHTML = `${_egShowItemLevel ? '🔢' : '👤'} ${t(_egShowItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}`;
    }
}

// Tooltip for the item level toggle button.
function _egShowItemLevelToggleTooltip(e) {
    const html = `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${_egShowItemLevel ? '🔢' : '👤'}</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t(_egShowItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-desc">${t(_egShowItemLevel ? 'eg_show_req_level_desc' : 'eg_show_item_level_desc')}</div>
    </div>
</div>`;
    showGameTooltip(html, e);
}

// Tooltip for the mass-sell FILTER button (custom game tooltip instead of native title).
function _egShowMassSellConfigTooltip(e) {
    const html = `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">⚙</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_mass_sell_config')}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-desc">${t('eg_mass_sell_config_title')}</div>
    </div>
</div>`;
    showGameTooltip(html, e);
}

// Tooltip for the MASS SELL button (custom game tooltip instead of native title).
function _egShowMassSellTooltip(e) {
    const html = `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">⚒</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_mass_sell_btn')}</div>
    </div>
    <div class="eg-tt-section">
        <div class="eg-tt-desc">${t('eg_mass_sell_title')}</div>
    </div>
</div>`;
    showGameTooltip(html, e);
}


// Builds the tooltip body shown when hovering the "?" info button in the
// top-right of the Nexus of Worlds screen. Uses the shared game tooltip
// engine (tooltips-hud.js) — not the browser title tooltip.
function _egBuildHubInfoTooltipHTML() {
    const line = (key) => {
        const txt = t(key);
        if (!txt) return '';
        return `<div class="eg-tt-mod">${txt}</div>`;
    };
    return `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">❓</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_hub_info_title')}</div>
    </div>
    <div class="eg-tt-section" style="display:flex;flex-direction:column;gap:5px;">
        ${line('eg_hub_info_currency')}
        ${line('eg_hub_info_sell')}
        ${line('eg_hub_info_repeat')}
        ${line('eg_hub_info_craft')}
        <div style="height:1px;background:var(--border,#4a5475);opacity:.4;margin:2px 0;"></div>
        ${line('eg_hub_info_dragdrop')}
        ${line('eg_hub_info_compare')}
    </div>
</div>`;
}

function _egShowHubInfoTooltip(e) {
    showGameTooltip(_egBuildHubInfoTooltipHTML(), e);
    // The controls list needs much more width than the shared default —
    // without this the tooltip becomes very narrow and very tall.
    // eg-controls-tip is exclusive to this tooltip; the engine's inline
    // max-width only yields to it via the !important rule in CSS.
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.classList.add('eg-wide-tip', 'eg-controls-tip');
}

// Hides the hub info tooltip AND drops the widened-tip classes again so
// other tooltips on the shared engine keep their default width.
function _egHideHubInfoTooltip() {
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.classList.remove('eg-wide-tip', 'eg-controls-tip');
    hideGameTooltip();
}

// Assembles the complete hub screen layout:
// topbar → [ Orbs & Shards (left) | character panel (center) | Essence (right) ] → stash.
// The Orbs & Shards tab uses fixed PoE-style slots; the item tooltip is a floating mouseover.
function _egBuildFullScreenHTML() {
    return `
<div class="eg-hub-layout">
    ${_egBuildTopbarHTML()}
    <div class="eg-body">
        <div class="eg-upper-row">
            ${_egBuildCurrencyPanelHTML()}
            <div class="eg-char-wrap">
                ${_egBuildCharPanelHTML()}
            </div>
            <div class="eg-essence-col">
                ${typeof _egBuildEssenceTabHTML === 'function' ? _egBuildEssenceTabHTML() : ''}
            </div>
        </div>
        ${_egBuildStashPanelHTML()}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------RENDER: EQUIPMENT SLOTS------------------------------
//------------------------------------------------------------------------

// Re-renders a single equipment slot from current state.
// Shows the equipped item chip, or the slot's placeholder icon if empty.
// The whole slot cell is tinted with the item's rarity color (same scheme
// as the main stash cells).
function _egRenderEquipSlot(slotId) {
    const slotEl = document.getElementById(`eg-equip-slot-${slotId}`);
    const el = document.getElementById(`eg-equip-item-${slotId}`);
    if (!el) return;
    const slot = EG_EQUIP_SLOTS.find(s => s.id === slotId);
    const item = _egEquipped[slotId] || null;

    el.innerHTML = item
        ? _egBuildItemChipHTML(item)
        : `<span class="eg-equip-slot-placeholder">${slot ? slot.icon : '◻'}</span>`;

    if (slotEl) {
        if (item) {
            const fill = _egGetCellFill(item);
            slotEl.style.background = fill;
            slotEl.style.borderColor = fill.replace(/[\d.]+\)$/, '0.9)');
        } else {
            slotEl.style.background = '';
            slotEl.style.borderColor = '';
        }
    }
}

// Re-renders all paperdoll equipment slots.
function _egRenderEquipSlots() {
    EG_EQUIP_SLOTS.forEach(slot => _egRenderEquipSlot(slot.id));
}


//------------------------------------------------------------------------
//-------------------RENDER: MAIN STASH-----------------------------------
//------------------------------------------------------------------------

// Full-cell rarity tint used by the main stash — each occupied cell is
// filled with its item's rarity color (instead of only a chip glow).
// Items with unmet stat requirements override the rarity tint with red.
const EG_RARITY_CELL_FILL = {
    common: 'rgba(122, 122, 122, 0.40)',
    uncommon: 'rgba(46, 204, 113, 0.35)',
    rare: 'rgba(52, 152, 219, 0.40)',
    epic: 'rgba(155, 89, 182, 0.45)',
    legendary: 'rgba(243, 156, 18, 0.45)',
    cursed: 'rgba(231, 76, 60, 0.40)',
    artifact: 'rgba(241, 196, 15, 0.40)',
    currency: 'rgba(181, 146, 72, 0.35)',
};
const EG_REQ_BLOCKED_FILL = 'rgba(231, 76, 60, 0.45)';

// Cell fill color for an item: red when its requirements cannot currently
// be met, otherwise its rarity color.
function _egGetCellFill(item) {
    if (item && _egIsItemBlocked(item)) return EG_REQ_BLOCKED_FILL;
    return EG_RARITY_CELL_FILL[item && item.rarity] || EG_RARITY_CELL_FILL.common;
}

// Re-renders a single cell in the main stash grid.
function _egRenderInventoryCell(row, col) {
    const cell = document.getElementById(`eg-inv-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egInventory[row][col];
    cell.innerHTML = item
        ? _egBuildItemChipHTML(item)
        : '';

    // Fill the whole cell with the item's rarity color (red when its stat
    // requirements cannot currently be met); reset when empty.
    if (item) {
        const fill = _egGetCellFill(item);
        cell.style.background = fill;
        cell.style.borderColor = fill.replace(/[\d.]+\)$/, '0.9)');
    } else {
        cell.style.background = '';
        cell.style.borderColor = '';
    }
}

// Re-renders the entire main stash grid.
function _egRenderInventory() {
    for (let r = 0; r < _egGetInvRows(); r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            _egRenderInventoryCell(r, c);
        }
    }
}

// Updates the stash item-count label (if present in the DOM).
function _egUpdateInvCount() {
    const el = document.getElementById('eg-inv-count');
    if (!el) return;
    let used = 0;
    _egInventory.forEach(row => row.forEach(cell => { if (cell) used++; }));
    // Unlimited stash: show used / capacity (capacity grows with rows) — keeps the familiar counter
    el.textContent = `${used} / ${_egGetInvCapacity()}`;
}


//------------------------------------------------------------------------
//-------------------RENDER: CURRENCY STASH-------------------------------
//------------------------------------------------------------------------

// Re-renders a single cell in the currency stash grid.
// Empty assigned slots show a faint placeholder icon and dashed border.
function _egRenderCurrencyCell(row, col) {
    const cell = document.getElementById(`eg-currency-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egCurrencyStash[row][col];
    const assignedId = _egCurrencyIdForSlot(row, col);
    if (item) {
        cell.innerHTML = _egBuildItemChipHTML(item);
        cell.classList.remove('eg-currency-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('title');
    } else if (assignedId) {
        const def = _egCurrencyDefForId(assignedId);
        cell.innerHTML = '';
        cell.classList.add('eg-currency-assigned-empty');
        if (def && def.icon) cell.setAttribute('data-empty-icon', def.icon);
        cell.removeAttribute('title');
    } else {
        cell.innerHTML = '';
        cell.classList.remove('eg-currency-assigned-empty');
        cell.removeAttribute('data-empty-icon');
        cell.removeAttribute('title');
    }
}

// Re-renders the entire currency stash grid.
function _egRenderCurrencyStash() {
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            _egRenderCurrencyCell(r, c);
        }
    }
}


//------------------------------------------------------------------------
//-------------------RENDER: MAP STASH / MAP DEVICE-----------------------
//------------------------------------------------------------------------
// Moved to endgame-gate.js — the map stash and map device live on the
// separate Probability Gate screen. _egRenderAll() still calls
// _egRenderMapSlot() / _egRenderMapStash(); they no-op while the gate
// screen is not in the DOM.


//------------------------------------------------------------------------
//-------------------RENDER: FULL REFRESH---------------------------------
//------------------------------------------------------------------------


// Re-renders the three aggregated stat regions of the character panel:
//   offense — upper left corner block, defense — upper right corner block,
//   puzzle  — center column between the paperdoll slots.
// Reads live gear via _egComputePlayerStats() / _egBuildGroupedStats()
// (endgame-player-stats.js) so it always reflects whatever is equipped.
function _egRenderStatsList() {
    const stats = _egComputePlayerStats();
    const groups = _egBuildGroupedStats(stats);

    const emptyHTML = `
<div class="eg-stat-row eg-stat-placeholder">
    <span class="eg-stat-name">${t('eg_no_stats_yet')}</span>
</div>`;

    function renderSide(listId, categories) {
        const el = document.getElementById(listId);
        if (!el) return;
        if (!categories.length) {
            el.innerHTML = emptyHTML;
            return;
        }
        el.innerHTML = categories.map(cat => `
<div class="eg-stats-category">
    <div class="eg-stats-category-title">${cat.title}</div>
    ${cat.lines.map(line => `
    <div class="eg-stat-row" data-desc-key="${line.descKey}" data-desc-label="${line.label}"${line.resTotal != null ? ` data-res-total="${line.resTotal}" data-res-cap="${line.resCap}"` : ''}>
        <span class="eg-stat-name">${line.label}</span>
        <span class="eg-stat-value">${line.value}</span>
    </div>`).join('')}
</div>`).join('');
    }

    renderSide('eg-offense-stats-list', groups.offense);
    renderSide('eg-defense-stats-list', groups.defense);
    renderSide('eg-stats-list', groups.puzzle);
    _egBindStatTooltips();
}


// Builds the hover tooltip body for a single stat row: stat name as the
// title plus its mechanic description. For armour and evasion the live
// combat values (damage reduction / dodge chance) are appended, using the
// exact formulas from endgame-player-stats.js. For resistance rows the
// uncapped gear total and the effective cap are revealed (the row itself
// shows the capped value).
function _egBuildStatDescTooltipHTML(descKey, label, row) {
    let html = `<strong style="color:var(--accent,#66fcf1)">${label}</strong>`;
    if (descKey) {
        const desc = t(descKey);
        // t() falls back to the raw key when a translation is missing
        if (desc && desc !== descKey) {
            html += `<br><span style="opacity:.75;font-size:.9em">${desc}</span>`;
        }
        // Resistance rows carry data-res-total / data-res-cap: show the
        // uncapped total, and flag when the cap is clipping it.
        if (row && row.dataset && row.dataset.resTotal != null) {
            const total = parseFloat(row.dataset.resTotal);
            const cap = parseFloat(row.dataset.resCap);
            const capped = total > cap;
            html += `<br><span style="color:var(--accent,#66fcf1)">`
                + t('eg_statdesc_res_total').replace('{t}', total.toFixed(0))
                + (capped ? ` — ${t('eg_statdesc_res_capped').replace('{c}', cap.toFixed(0))}` : '')
                + `</span>`;
        }
        const stats = _egComputePlayerStats();
        // Armour/evasion live values are measured against a representative
        // monster: the current target's level, else the encounter's base
        // level — same convention as the accuracy tooltip below.
        const hasLevelCtx = typeof _egGetTarget === 'function' && typeof _egGetEncounterBaseLevel === 'function';
        const refMonsterLevel = hasLevelCtx
            ? ((_egGetTarget() && _egGetTarget().level) || _egGetEncounterBaseLevel() || 1)
            : 1;
        // Character level for multi-level display (falls back to ref level if unavailable)
        const playerLevel = (typeof _egGetPlayerLevel === 'function')
            ? Math.max(1, Number(_egGetPlayerLevel()) || 1)
            : refMonsterLevel;
        const maxLvl = (typeof EG_LEVELING_CONFIG !== 'undefined' && EG_LEVELING_CONFIG.maxLevel)
            ? EG_LEVELING_CONFIG.maxLevel : 100;

        if (descKey === 'eg_statdesc_armour') {
            // Show damage reduction vs monster levels: playerLevel-1 .. playerLevel+3
            const levels = [];
            for (let d = -1; d <= 3; d++) {
                const lvl = playerLevel + d;
                if (lvl < 1) continue;
                if (lvl > maxLvl) break;
                levels.push(lvl);
            }
            if (!levels.length) levels.push(refMonsterLevel);
            const lines = levels.map(lvl => {
                // Representative raw hit size at this monster level
                const refDamage = Math.round(12 * (1 + 0.12 * (lvl - 1)));
                const reductionPct = _egCalcArmourReductionPct(stats.armour, refDamage) * 100;
                const labelPart = t('eg_statdesc_armour_value').replace('{p}', reductionPct.toFixed(1));
                return `${labelPart} (L${lvl})`;
            });
            html += `<br><span style="color:var(--accent,#66fcf1)">${lines.join('<br>')}</span>`;
        } else if (descKey === 'eg_statdesc_evasion') {
            // Show dodge chance vs monster levels: playerLevel-1 .. playerLevel+3
            const levels = [];
            for (let d = -1; d <= 3; d++) {
                const lvl = playerLevel + d;
                if (lvl < 1) continue;
                if (lvl > maxLvl) break;
                levels.push(lvl);
            }
            if (!levels.length) levels.push(refMonsterLevel);
            const lines = levels.map(lvl => {
                const dodgeChance = Math.min(75, stats.dodgeChance + _egCalcEvasionDodgeChance(stats.evasion, lvl));
                const labelPart = t('eg_statdesc_evasion_value').replace('{p}', dodgeChance.toFixed(1));
                return `${labelPart} (L${lvl})`;
            });
            html += `<br><span style="color:var(--accent,#66fcf1)">${lines.join('<br>')}</span>`;
        } else if (descKey === 'eg_statdesc_accuracy') {
            // Miss chance scaled to the character's own level and the next
            // three monster levels (e.g. at player level 12 -> 12/13/14/15).
            // Falls back to level 1 when the leveling system is unavailable.
            const levels = [];
            for (let d = 0; d < 4; d++) {
                const lvl = playerLevel + d;
                if (lvl > maxLvl) break;
                levels.push(lvl);
            }
            if (!levels.length) levels.push(playerLevel);
            const lines = levels.map(lvl => {
                const missPct = (typeof _egCalcAccuracyMissChance === 'function')
                    ? _egCalcAccuracyMissChance(stats.accuracy, lvl) : 0;
                return t('eg_statdesc_accuracy_value')
                    .replace('{p}', missPct.toFixed(1))
                    .replace('{n}', lvl);
            });
            html += `<br><span style="color:var(--accent,#66fcf1)">${lines.join('<br>')}</span>`;
        }
    }
    return html;
}

// Wires delegated mouseover tooltips onto the three stat list containers
// (delegation survives frequent innerHTML re-renders; the dataset guard
// makes repeated calls after each _egRenderStatsList() a no-op).
function _egBindStatTooltips() {
    ['eg-offense-stats-list', 'eg-stats-list', 'eg-defense-stats-list'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.statTipBound) return;
        el.dataset.statTipBound = '1';

        el.addEventListener('mouseover', e => {
            const row = e.target.closest ? e.target.closest('.eg-stat-row') : null;
            if (row && !row.classList.contains('eg-stat-placeholder')) {
                showGameTooltip(_egBuildStatDescTooltipHTML(row.dataset.descKey, row.dataset.descLabel, row), e);
            }
        });
        el.addEventListener('mousemove', e => {
            if (e.target.closest && e.target.closest('.eg-stat-row')) moveGameTooltip(e);
        });
        el.addEventListener('mouseout', e => {
            const row = e.target.closest ? e.target.closest('.eg-stat-row') : null;
            if (row && !(e.relatedTarget && row.contains(e.relatedTarget))) hideGameTooltip();
        });
    });
}


// Re-renders the launcher slot for the crafting bench (in the currency panel).
function _egUpdateCraftingBenchLauncherSlot() {
    const craftingSlot = document.getElementById('eg-crafting-bench-launch-slot');
    if (craftingSlot) {
        const item = typeof _egCraftingBenchItem !== 'undefined' ? _egCraftingBenchItem : null;
        craftingSlot.innerHTML = item ? _egBuildItemChipHTML(item) : 'Drop equipment here';
    }
}

// Triggers a full re-render of every zone in the hub.
// Call this after any state-changing operation.
function _egRenderAll() {
    _egRenderEquipSlots();
    _egRenderInventory();
    _egRenderUniqueStash();
    _egUpdateUniqueTabBadge();
    // keep tab visibility in sync
    const invBody = document.getElementById('eg-stash-tab-inventory');
    const uniqBody = document.getElementById('eg-stash-tab-uniques');
    const invTab = document.getElementById('eg-tab-inventory');
    const uniqTab = document.getElementById('eg-tab-uniques');
    if (invBody) invBody.classList.toggle('active', _egStashTab !== 'uniques');
    if (uniqBody) uniqBody.classList.toggle('active', _egStashTab === 'uniques');
    if (invTab) invTab.classList.toggle('active', _egStashTab !== 'uniques');
    if (uniqTab) uniqTab.classList.toggle('active', _egStashTab === 'uniques');
    _egRenderMapSlot();
    _egRenderCurrencyStash();
    _egRenderEssenceStash();
    _egRenderMapStash();
    _egUpdateInvCount();
    _egRenderStatsList();
    if (typeof _egRenderLevelHUD === 'function') _egRenderLevelHUD();
    _egUpdatePassiveTreeButton();
    const craftingSlot = document.getElementById('eg-crafting-bench-launch-slot');
    if (craftingSlot) {
        const item = typeof _egCraftingBenchItem !== 'undefined' ? _egCraftingBenchItem : null;
        craftingSlot.innerHTML = item ? _egBuildItemChipHTML(item) : 'Drop equipment here';
    }
}


//------------------------------------------------------------------------
//-------------------TOOLTIP----------------------------------------------
//------------------------------------------------------------------------

// Builds the HTML for the tooltip panel body from an item object.


function _egBuildTooltipBodyHTML(item) {
    const RARITY_COLOR_MAP = {
        common: { border: '#7a7a7a', color: '#b0b0b0' },
        uncommon: { border: '#2ecc71', color: '#2ecc71' },
        rare: { border: '#3498db', color: '#3498db' },
        epic: { border: '#9b59b6', color: '#c39bd3' },
        legendary: { border: '#f39c12', color: '#f5b642' },
        cursed: { border: '#e74c3c', color: '#e74c3c' },
        artifact: { border: '#f1c40f', color: '#f1c40f' },
    };

    const rarity = item.rarity || 'common';
    const rc = RARITY_COLOR_MAP[rarity] || RARITY_COLOR_MAP.common;

    const EG_TT_RARITY_KEYS = {
        common: 'rar_common', uncommon: 'rar_uncommon', rare: 'rar_rare',
        epic: 'eg_rar_epic', legendary: 'rar_legendary', cursed: 'rar_cursed',
        artifact: 'eg_rar_artifact',
    };
    const EG_TT_SLOT_KEYS = {
        head: 'eg_slot_head', shoulders: 'eg_slot_shoulders', cloak: 'eg_slot_cloak',
        chest: 'eg_slot_chest', bracers: 'eg_slot_bracers', gloves: 'eg_slot_gloves',
        belt: 'eg_slot_belt', pants: 'eg_slot_pants', boots: 'eg_slot_boots',
        amulet: 'eg_slot_amulet', earring: 'eg_slot_earring', ring: 'eg_slot_ring',
        arcane: 'eg_slot_arcane', talisman: 'eg_slot_talisman', weapon: 'eg_slot_weapon',
        shield: 'eg_slot_shield',
        ranged: 'eg_slot_ranged',
    };

    const rarityLabel = item.isUnique
        ? t('rar_unique')
        : EG_TT_RARITY_KEYS[rarity]
            ? t(EG_TT_RARITY_KEYS[rarity])
            : rarity.charAt(0).toUpperCase() + rarity.slice(1);
    const slotLabel = item.slotType
        ? (EG_TT_SLOT_KEYS[item.slotType]
            ? t(EG_TT_SLOT_KEYS[item.slotType])
            : item.slotType.charAt(0).toUpperCase() + item.slotType.slice(1))
        : '';

    // ── Weapon hand line (PoE-style): One-Handed / Two-Handed ──────────
    // Shown directly under the rarity line so the 1H/2H choice — and with it
    // the shield / dual-wield decision — is visible before equipping.
    let handHTML = '';
    if (item.slotType === 'weapon') {
        let hands = (item.hands === 1 || item.hands === 2) ? item.hands : null;
        if (hands == null && typeof _egGetWeaponHands === 'function') {
            try { hands = _egGetWeaponHands(item); } catch (e) { hands = null; }
        }
        if (hands == null && typeof _egInferWeaponHands === 'function') {
            try { hands = _egInferWeaponHands(item); } catch (e) { hands = null; }
        }
        if (hands === 1 || hands === 2) {
            let handLabel = null;
            try {
                const key = hands === 2 ? 'eg_hands_two' : 'eg_hands_one';
                const s = t(key);
                if (s && s !== key) handLabel = s;
            } catch (e) {}
            if (!handLabel) {
                const de = (typeof LANG !== 'undefined' && LANG === 'de');
                handLabel = hands === 2
                    ? (de ? 'Zweihandwaffe' : 'Two-Handed Weapon')
                    : (de ? 'Einhandwaffe' : 'One-Handed Weapon');
            }
            handHTML = `<div class="eg-tt-hands">${handLabel}</div>`;
        }
    }

    // ── Implicit defenses & damage ───────────────────────────────────
    // Defense and damage values shown are the LOCAL-modified totals (base +
    // local flat, scaled by the item's own "% increased" mods — Path of
    // Exile style). Values altered by local mods get the
    // .eg-tt-val-modified highlight so the player can tell them apart from
    // the untouched base value.
    const implicitLines = [];
    const def = item.defenses || {};
    let eff = null;
    try { eff = _egGetItemEffectiveDefenses(item); } catch (e) { eff = null; }
    const defVal = (stat) => {
        if (eff) return { v: eff[stat], m: eff.modded && eff.modded[stat] };
        return { v: def[stat] || 0, m: false };
    };
    const defLine = (labelKey, stat) => {
        const { v, m } = defVal(stat);
        if ((v || 0) <= 0) return;
        const valCls = m ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
        implicitLines.push(`<div class="eg-tt-implicit">${t(labelKey)}: <span class="${valCls}">${v}</span></div>`);
    };
    defLine('eg_tt_armour', 'armour');
    defLine('eg_tt_evasion', 'evasion');
    defLine('eg_tt_absorption', 'absorption');
    if (item.damage) {
        let dmgEff = null;
        try { dmgEff = _egGetItemEffectiveDamage(item); } catch (e) { dmgEff = null; }
        const rangeLine = (labelKey, min, max, moddedFlag) => {
            if ((max || 0) <= 0 && (min || 0) <= 0) return;
            const valCls = moddedFlag ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
            implicitLines.push(`<div class="eg-tt-implicit">${t(labelKey)}: <span class="${valCls}">${min}–${max}</span></div>`);
        };
        if (dmgEff) {
            rangeLine('eg_stat_phys_damage', dmgEff.physMin, dmgEff.physMax, dmgEff.modded.phys);
            rangeLine('eg_stat_fire_damage', dmgEff.fireMin, dmgEff.fireMax, dmgEff.modded.fire);
            rangeLine('eg_stat_cold_damage', dmgEff.coldMin, dmgEff.coldMax, dmgEff.modded.cold);
            rangeLine('eg_stat_lightning_damage', dmgEff.lightningMin, dmgEff.lightningMax, dmgEff.modded.lightning);
            rangeLine('eg_stat_shadow_damage', dmgEff.shadowMin, dmgEff.shadowMax, dmgEff.modded.shadow);
        } else {
            rangeLine('eg_stat_phys_damage', item.damage.min, item.damage.max, false);
        }
        // Only the melee weapon slot has an auto-strike interval — ranged
        // weapons scale the input-driven projectile channel instead.
        if (item.slotType === 'weapon') {
            let atkEff = null;
            try { atkEff = _egGetItemEffectiveAttackInterval(item); } catch (e) { atkEff = null; }
            const interval = (atkEff && atkEff.interval != null) ? atkEff.interval : item.attackIntervalSeconds;
            const valCls = (atkEff && atkEff.modded) ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
            implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_attack_interval')}: <span class="${valCls}">${interval}s</span></div>`);
        }
    }
    if (item.blockChance) {
        let blockEff = null;
        try { blockEff = typeof _egGetItemEffectiveBlockChance === 'function' ? _egGetItemEffectiveBlockChance(item) : null; } catch (e) { blockEff = null; }
        const bcVal = blockEff ? blockEff.value : item.blockChance;
        const bcModded = blockEff ? blockEff.modded : false;
        const valCls = bcModded ? 'eg-tt-val eg-tt-val-modified' : 'eg-tt-val';
        implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_block_chance')}: <span class="${valCls}">${bcVal}%</span></div>`);
    }
    const implicitHTML = implicitLines.length
        ? `<div class="eg-tt-section">${implicitLines.join('')}</div>`
        : '';

    // ── Implicit modifiers (PoE-style base implicits) ────────────────
    // Each equipment base has 1 (sometimes 2) beneficial implicits scaled
    // by required level. Rendered in its own blue section with an "Implicit"
    // tag and a separator line above explicit mods, matching PoE layout.
    let implicitsHTML = '';
    const implicits = Array.isArray(item.implicits) ? item.implicits : [];
    if (implicits.length > 0) {
        const merged = (typeof _egBuildMergedModLines === 'function')
            ? _egBuildMergedModLines(implicits)
            : implicits.flatMap(imp => (imp.rolledStats||[]).map(s => ({ label: s.label, downside:false, tierLabel:'Implicit' })));
        const lines = merged.map(entry => {
            // Implicits are always beneficial — render in PoE implicit blue (no text tag needed, color is the indicator)
            return `<div class="eg-tt-mod eg-tt-mod-implicit"><span class="eg-tt-mod-label">${entry.label}</span></div>`;
        });
        if (lines.length) {
            implicitsHTML = `<div class="eg-tt-section eg-tt-implicits-section">${lines.join('')}</div>`;
        }
    }


    // ── Requirements ─────────────────────────────────────────────────
    // Each requirement part is compared against the attribute totals as the
    // equip gate will see them after the swap (displaced occupant removed,
    // item's own bonuses included — self-carrying). This keeps the tooltip
    // consistent with what _egCanEquipInSlot will actually accept.
    const req = item.requirements || {};
    const curAttrs = _egPreviewEquipAttributes(item);
    const reqParts = [];
    const missingParts = [];
    if ((req.level || 0) > 0) {
        const met = EG_PLAYER_BASE_ATTRIBUTES.level == null
            || EG_PLAYER_BASE_ATTRIBUTES.level >= req.level;
        const label = t('eg_req_level').replace('{n}', req.level);
        reqParts.push(met ? label : `<span class="eg-tt-req-unmet">${label}</span>`);
        if (!met) missingParts.push(label);
    }
    [['str', 'eg_attr_str', 'str'], ['agi', 'eg_attr_agi', 'agi'], ['int', 'eg_attr_int', 'int']]
        .forEach(([reqKey, labelKey, attrKey]) => {
            if ((req[reqKey] || 0) <= 0) return;
            const have = curAttrs[attrKey];
            const label = `${req[reqKey]} ${t(labelKey)}`;
            reqParts.push(have >= req[reqKey]
                ? label
                : `<span class="eg-tt-req-unmet">${label}</span>`);
            if (have < req[reqKey]) missingParts.push(`${req[reqKey] - have} ${t(labelKey)}`);
        });
    const missingHTML = missingParts.length
        ? `<div class="eg-tt-req-missing">${t('eg_req_missing')} ${missingParts.join(', ')}</div>`
        : '';
    const reqHTML = reqParts.length
        ? `<div class="eg-tt-section"><div class="eg-tt-req">${t('eg_requires')} ${reqParts.join(', ')}${missingHTML}</div></div>`
        : '';

    // ── Chain-break warning ──────────────────────────────────────────
    // Shown when the item's own requirements are all met but equipping it
    // would displace an item whose attribute bonuses other equipped items
    // rely on (e.g. a +13 Int ring keeping a 45 Int chest satisfied).
    const chain = _egGetSwapChainBreak(item);
    const chainHTML = chain
        ? `<div class="eg-tt-section"><div class="eg-tt-swap-warning">${t('eg_swap_breaks_warning')
            .replace('{equipped}', chain.occupant.name || '?')
            .replace('{list}', _egGetUnmetRequirementsText(chain.broken))}</div></div>`
        : '';

    // ── Hand-conflict warning (PoE-style) ────────────────────────────
    // Shown when the item fits its own slot but the hand setup forbids it
    // (2H needs a free off-hand, off-hand takes 1H/shield only).
    let handHTML2 = '';
    try {
        if (item && item.category === 'equip'
            && (item.slotType === 'weapon' || item.slotType === 'shield')
            && typeof _egCheckHandCompatibilityInSlot === 'function'
            && typeof _dndFindTargetSlot === 'function') {
            const equippedList = (typeof _egGetAllEquippedItems === 'function')
                ? _egGetAllEquippedItems() : [];
            if (!equippedList.includes(item)) {
                const target = _dndFindTargetSlot(item);
                if (target) {
                    const hg = _egCheckHandCompatibilityInSlot(item, target);
                    if (!hg.ok && hg.handError && typeof _egHandErrorMessage === 'function') {
                        handHTML2 = `<div class="eg-tt-section"><div class="eg-tt-swap-warning">${_egHandErrorMessage(hg.handError, item)}</div></div>`;
                    }
                }
            }
        }
    } catch (e) { handHTML2 = ''; }

    // ── Explicit mods ─────────────────────────────────────────────────
    const mods = Array.isArray(item.mods) ? item.mods : [];
    let modsHTML = '';
    if (mods.length > 0) {
        // Mods sharing the same stat (e.g. flat Health + the Health half of
        // a hybrid roll) are merged into one combined line per stat.
        const mergedLines = _egBuildMergedModLines(mods);
        // Unique items use bespoke mods without tiers — hide PoE-style tier badges.
        const hideTier = !!item.isUnique;
        const lines = mergedLines.map(entry => {
            // Unique downsides render in warning red instead of mod blue.
            const cls = entry.downside ? 'eg-tt-mod eg-tt-mod-downside' : 'eg-tt-mod';
            const tierSpan = (!hideTier && entry.tierLabel) ? `<span class="eg-tt-mod-tier">${entry.tierLabel}</span>` : '';
            const craftedSpan = entry.crafted ? `<span class="eg-tt-mod-crafted">${t('eg_tt_crafted')}</span>` : '';
            return `<div class="${cls}"><span class="eg-tt-mod-label">${entry.label}</span>${tierSpan}${craftedSpan}</div>`;
        });
        if (lines.length) {
            modsHTML = `<div class="eg-tt-section eg-tt-mods-section">${lines.join('')}</div>`;
        }
    }

    // ── Unique special modifiers (non-stat QoL perks) ─────────────────
    // Rendered in implicit-blue between stat mods and flavor text so the
    // zero-line auto-mark tradeoff is visible before equipping.
    let specialHTML = '';
    try {
        const specials = (typeof _egGetUniqueSpecialLines === 'function')
            ? _egGetUniqueSpecialLines(item) : [];
        if (specials.length) {
            const lines = specials.map(s => {
                const label = (typeof LANG !== 'undefined' && LANG === 'de') ? (s.de || s.en) : (s.en || s.de);
                return `<div class="eg-tt-mod eg-tt-mod-implicit"><span class="eg-tt-mod-label">✨ ${label}</span></div>`;
            });
            specialHTML = `<div class="eg-tt-section eg-tt-mods-section">${lines.join('')}</div>`;
        }
    } catch (e) { specialHTML = ''; }

    // ── Unique flavor text ────────────────────────────────────────────
    const flavorHTML = item.isUnique
        ? `<div class="eg-tt-section"><div class="eg-tt-flavor">${LANG === 'de'
            ? (item.flavorDe || item.flavorEn || '')
            : (item.flavorEn || item.flavorDe || '')}</div></div>`
        : '';

    // ── Item level ────────────────────────────────────────────────────
    const ilvlHTML = item.itemLevel != null
        ? `<div class="eg-tt-ilvl">${t('eg_item_level').replace('{n}', item.itemLevel)}</div>`
        : '';

    const mirroredHTML = item.mirrored
        ? `<div class="eg-tt-mirrored">🪞 ${t('eg_tt_mirrored')}</div>`
        : '';

    const bonusLootHTML = item.isBonusLoot
        ? `<div class="eg-tt-mirrored" style="color:#f5d98a;">🎁 ${t('eg_bonus_chance_title')}</div>`
        : '';

    return `
<div class="eg-tt-frame" style="--tt-border:${rc.border};">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${EG_ART.html('item', item.baseId, item.icon || '📦')}</div>
        <div class="eg-tt-name" style="color:${rc.color};">${item.name || item.baseName || '???'}</div>
        ${(item.baseName && item.baseName !== item.name)
            ? `<div class="eg-tt-basename" style="opacity:.7;">${item.baseName}</div>` : ''}
        <div class="eg-tt-rarity-line" style="color:${rc.color};">${rarityLabel} ${slotLabel}</div>
        ${handHTML}
    </div>
    ${implicitHTML}
    ${implicitsHTML}
    ${reqHTML}
    ${chainHTML}
    ${handHTML2}
    ${modsHTML}
    ${specialHTML}
    ${flavorHTML}
    ${ilvlHTML}
    ${mirroredHTML}
    ${bonusLootHTML}
</div>`;
}



// Shows the floating mouseover tooltip for the hovered item.
// Uses the shared game tooltip engine from tooltips-hud.js
// (showGameTooltip / moveGameTooltip / hideGameTooltip).
// While Alt is held, a second tooltip is shown to the right of the main
// one, displaying the currently equipped item in the matching paperdoll
// slot so both can be compared side by side.

function _egShowTooltip(item, e) {
    _egTooltipItem = item;
    const tip = document.getElementById('ghud-floating-tip');
    if (!item) {
        if (tip) tip.classList.remove('eg-wide-tip', 'eg-controls-tip');
        hideGameTooltip();
        _egHideCompareTooltip();
        return;
    }
    showGameTooltip(_egBuildTooltipBodyHTML(item), e || {
        clientX: _egLastMouse.x,
        clientY: _egLastMouse.y,
    });
    // Equipment stat blocks need more room than the shared default width.
    // Drop the hub-info exclusive class in case it ever lingered.
    if (tip) {
        tip.classList.remove('eg-controls-tip');
        tip.classList.add('eg-wide-tip');
    }
    _egUpdateCompareTooltip();
}




function _egClearTooltip() {
    _egShowTooltip(null);
}


// Moves the main tooltip (and the compare tooltip with it) while the
// cursor glides over the hovered item chip.
function _egMoveTooltip(e) {
    moveGameTooltip(e);
    _egPositionCompareTooltip();
}


// ── Alt-hold compare tooltip ────────────────────────────────────────────

// True while the Alt key is held down.
let _egAltDown = false;

// Last known cursor position — fallback anchor when no event is available.
let _egLastMouse = { x: 0, y: 0 };

document.addEventListener('mousemove', e => {
    _egLastMouse.x = e.clientX;
    _egLastMouse.y = e.clientY;
});

// True while the endgame hub or gate screen is the active screen.
// Used to scope the Alt-key browser-menu suppression to the item UIs.
function _egIsItemScreenActive() {
    const hub = document.getElementById('screen-endgame-hub');
    const gate = document.getElementById('screen-endgame-gate');
    return (hub && hub.classList.contains('active'))
        || (gate && gate.classList.contains('active'));
}

window.addEventListener('keydown', e => {
    if (e.key === 'Alt') {
        // Suppress the browser's default Alt behaviour (Firefox/Chrome
        // focus the menu bar, which shifts the layout mid-comparison).
        if (_egIsItemScreenActive()) e.preventDefault();
        if (!_egAltDown) {
            _egAltDown = true;
            _egUpdateCompareTooltip();
        }
    }
});

window.addEventListener('keyup', e => {
    if (e.key === 'Alt') {
        // Firefox triggers the menu bar on Alt *release* — block that too.
        if (_egIsItemScreenActive()) e.preventDefault();
        _egAltDown = false;
        _egUpdateCompareTooltip();
    }
});

// Alt state is unreliable after alt-tabbing away — reset on blur.
window.addEventListener('blur', () => {
    _egAltDown = false;
    _egUpdateCompareTooltip();
});


// Resolves the equipped item to compare against the hovered item.
// Only equipment items have a matching paperdoll slot; for multi-slot
// types (rings, earrings, weapons) the first occupied slot wins.
// Returns null when there is nothing meaningful to compare.
function _egGetCompareItem(item) {
    if (!item || item.category !== 'equip' || !item.slotType) return null;
    if (typeof EG_SLOT_ACCEPTS === 'undefined') return null;
    const ids = Object.keys(EG_SLOT_ACCEPTS)
        .filter(id => EG_SLOT_ACCEPTS[id] === item.slotType);
    for (const id of ids) {
        if (_egEquipped[id]) return _egEquipped[id];
    }
    return null;
}


// Shows or hides the compare tooltip based on the current hover target
// and Alt key state. Only shown while Alt is held AND the hovered item
// is not itself the equipped one being compared.
function _egUpdateCompareTooltip() {
    const compareItem = (_egAltDown && _egTooltipItem)
        ? _egGetCompareItem(_egTooltipItem)
        : null;

    // Don't "compare" an equipped item with itself.
    if (compareItem === _egTooltipItem) {
        _egHideCompareTooltip();
        return;
    }

    if (compareItem) _egShowCompareTooltip(compareItem);
    else _egHideCompareTooltip();
}


// Lazily creates the compare tooltip element (visual twin of the main
// game tooltip, but with a yellow accent edge to tell them apart).
function _egGetCompareTip() {
    let tip = document.getElementById('eg-compare-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'eg-compare-tip';
        tip.style.cssText = `
            position: fixed;
            z-index: 9999;
            background: #12121e;
            border: 1px solid var(--accent, #5555aa);
            border-left: 3px solid var(--yellow, #c8a84b);
            color: var(--accent2, #ccc);
            font-family: var(--PX, monospace);
            font-size: 11px;
            line-height: 1.6;
            padding: 8px 12px;
            max-width: 380px;
            pointer-events: none;
            opacity: 0;
            transition: opacity .12s;
            white-space: normal;
        `;
        document.body.appendChild(tip);
    }
    return tip;
}


function _egShowCompareTooltip(item) {
    const tip = _egGetCompareTip();
    tip.innerHTML = `
<div class="eg-compare-label">${t('eg_tt_currently_equipped')}</div>
${_egBuildTooltipBodyHTML(item)}`;
    tip.style.opacity = '1';
    _egPositionCompareTooltip();
}


function _egHideCompareTooltip() {
    const tip = document.getElementById('eg-compare-tip');
    if (tip) tip.style.opacity = '0';
}


// Places the compare tooltip to the right of the main tooltip
// (flips to the left side when there is not enough room).
function _egPositionCompareTooltip() {
    const main = document.getElementById('ghud-floating-tip');
    const cmp = document.getElementById('eg-compare-tip');
    if (!main || !cmp || cmp.style.opacity !== '1') return;

    let x = main.offsetLeft + main.offsetWidth + 8;
    if (x + cmp.offsetWidth > window.innerWidth - 8) {
        x = Math.max(8, main.offsetLeft - cmp.offsetWidth - 8);
    }
    cmp.style.left = x + 'px';
    // Keep the compare tooltip fully on screen vertically as well.
    const clampedTop = Math.max(8, Math.min(
        main.offsetTop,
        window.innerHeight - cmp.offsetHeight - 8
    ));
    cmp.style.top = clampedTop + 'px';
}




//------------------------------------------------------------------------
//-------------------PERSISTENCE------------------------------------------
//------------------------------------------------------------------------

// Writes all hub state variables back into the global STATE object and saves.
function egSaveHubState() {
    STATE.egEquipped = _egEquipped;
    STATE.egInventory = _egInventory;
    STATE.egMapStash = _egMapStash;
    STATE.egCurrencyStash = _egCurrencyStash;
    STATE.egEssenceStash = _egEssenceStash;
    STATE.egMapSlotItem = _egMapSlotItem;
    STATE.egMapStashActiveTier = _egMapStashActiveTier;
    STATE.egCraftingBenchItem = _egCraftingBenchItem;
    // Unique collection
    STATE.egUniqueStash = _egUniqueStash || {};
    STATE.egUniqueCollected = _egUniqueCollected ? Array.from(_egUniqueCollected) : [];
    // Mass-sell filter (persisted alongside the stash so reconstructing the
    // hub after a reload restores the player's protection choices).
    if (_egMassSellKeep) STATE.egMassSellKeep = { ..._egMassSellKeep };
    if (typeof _egMassSellKeepUnique !== 'undefined') STATE.egMassSellKeepUnique = _egMassSellKeepUnique;
    STATE.egMassSellMinItemLevel = _egMassSellMinItemLevel;
    STATE.egMassSellMinReqLevel = _egMassSellMinReqLevel;
    save();
}

// Heals a stashed currency/shard item that was persisted without its
// full fields (legacy saves, vendor/drop race during save). Fills missing
// name/icon/description/category/rarity from the canonical defs so tooltips
// and right-click use-mode keep working.
function _egHealCurrencyItem(item) {
    if (!item || !item.id) return item;
    const def = (typeof EG_CURRENCY_DEFS !== 'undefined' && EG_CURRENCY_DEFS[item.id])
        || (typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS[item.id])
        || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'currency';
    if (!item.rarity) item.rarity = def.rarity || 'currency';
    return item;
}
function _egHealEssenceItem(item) {
    if (!item || !item.id) return item;
    const def = (typeof EG_ESSENCE_DEFS !== 'undefined' && EG_ESSENCE_DEFS[item.id]) || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'essence';
    if (!item.rarity) item.rarity = def.rarity || 'essence';
    // Critical for slot-type filtering: without these, _egRenderEssenceCell
    // can't determine what the essence can be applied to, and the item
    // silently bypasses the filter (shows up under every slot type).
    if (!item.guaranteedFamily && def.guaranteedFamily) item.guaranteedFamily = def.guaranteedFamily;
    if ((!item.guaranteedFamilies || !item.guaranteedFamilies.length) && def.guaranteedFamilies) {
        item.guaranteedFamilies = def.guaranteedFamilies;
    }
    return item;
}

// Deferred notice for the legacy hand migration below: _egLoadHubState also
// runs at script parse time (no visible screen yet), so the message waits
// here until showEndgameHub renders the sheet.
let _egPendingHandMigrationToast = null;

// Reads hub state from the global STATE object into local variables.
// Missing entries are initialised to their default empty structures.

// Explains a legacy hand migration (2H + shield equipped before the 1H/2H
// split): the off-hand was moved to the stash. One toast per moved item.
function _egShowHandMigrationToast(moves) {
    if (!Array.isArray(moves) || !moves.length) return;
    for (const mv of moves) {
        const nm = (mv.item && mv.item.name) || '?';
        let msg = null;
        try {
            if (mv.slotId === 'weapon2' && typeof _egIsTwoHandedWeapon === 'function'
                && _egEquipped && _egIsTwoHandedWeapon(_egEquipped.weapon1)) {
                const mainNm = (_egEquipped.weapon1 && _egEquipped.weapon1.name) || '?';
                let tpl = null;
                try { const s = t('eg_migrate_offhand_two_handed'); if (s && s !== 'eg_migrate_offhand_two_handed') tpl = s; } catch (e) {}
                msg = (tpl || '⚠️ {off} moved to your stash — {main} is two-handed and needs a free off-hand')
                    .replace('{off}', nm).replace('{main}', mainNm);
            } else {
                let tpl = null;
                try { const s = t('eg_migrate_hand_generic'); if (s && s !== 'eg_migrate_hand_generic') tpl = s; } catch (e) {}
                msg = (tpl || '⚠️ {name} moved to your stash — it cannot stay equipped in that slot')
                    .replace('{name}', nm);
            }
        } catch (e) {
            msg = `⚠️ ${nm} moved to your stash`;
        }
        try { if (typeof showToast === 'function') showToast(msg, '#f5b642'); } catch (e) {}
        try { if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'info' }); } catch (e) {}
    }
}

function _egLoadHubState() {
    _egEquipped = STATE.egEquipped || {};
    // Unlimited stash: keep whatever rows were saved; ensure at least the initial minimum
    if (Array.isArray(STATE.egInventory) && STATE.egInventory.length > 0) {
        _egInventory = STATE.egInventory;
        // Normalise column count and guarantee minimum rows
        if (_egInventory.length < EG_INV_INITIAL_ROWS) _egEnsureInvRows(EG_INV_INITIAL_ROWS);
        // Ensure every row has the correct column width
        for (let r = 0; r < _egInventory.length; r++) {
            if (!Array.isArray(_egInventory[r])) _egInventory[r] = Array(EG_INV_COLS).fill(null);
            else if (_egInventory[r].length < EG_INV_COLS) {
                while (_egInventory[r].length < EG_INV_COLS) _egInventory[r].push(null);
            } else if (_egInventory[r].length > EG_INV_COLS) {
                _egInventory[r] = _egInventory[r].slice(0, EG_INV_COLS);
            }
        }
    } else {
        _egInventory = Array.from({ length: EG_INV_INITIAL_ROWS }, () => Array(EG_INV_COLS).fill(null));
    }
    // Heal legacy equipment cells: any item that looks like gear (has a
    // slotType) but lost its category would be rejected by currency/essence
    // application with a confusing "cannot be used" error.
    if (Array.isArray(_egInventory)) {
        for (let r = 0; r < _egInventory.length; r++) {
            if (!Array.isArray(_egInventory[r])) continue;
            for (let c = 0; c < _egInventory[r].length; c++) {
                const it = _egInventory[r][c];
                if (it && it.slotType && !it.category) it.category = 'equip';
            }
        }
    }
    if (_egEquipped && typeof _egEquipped === 'object') {
        for (const k of Object.keys(_egEquipped)) {
            const it = _egEquipped[k];
            if (it && it.slotType && !it.category) it.category = 'equip';
        }
    }
    // ── Map stash: tiered 16× infinite stashes ──
    (function _migrateMapStash() {
        const saved = STATE.egMapStash;
        if (_egIsTieredMapStash(saved)) {
            _egMapStash = saved;
            // normalise each tier: ensure correct cols and at least initial rows
            for (let ti = 0; ti < EG_MAP_TIER_COUNT; ti++) {
                if (!Array.isArray(_egMapStash[ti])) _egMapStash[ti] = _egMakeMapTierGrid();
                if (_egMapStash[ti].length < EG_MAP_STASH_INITIAL_ROWS) {
                    for (let i = _egMapStash[ti].length; i < EG_MAP_STASH_INITIAL_ROWS; i++) _egMapStash[ti].push(Array(EG_MAP_STASH_COLS).fill(null));
                }
                for (let r = 0; r < _egMapStash[ti].length; r++) {
                    if (!Array.isArray(_egMapStash[ti][r])) _egMapStash[ti][r] = Array(EG_MAP_STASH_COLS).fill(null);
                    else if (_egMapStash[ti][r].length < EG_MAP_STASH_COLS) while(_egMapStash[ti][r].length < EG_MAP_STASH_COLS) _egMapStash[ti][r].push(null);
                    else if (_egMapStash[ti][r].length > EG_MAP_STASH_COLS) _egMapStash[ti][r] = _egMapStash[ti][r].slice(0, EG_MAP_STASH_COLS);
                }
            }
            // also migrate any maps that might be in wrong tier (e.g. tier changed via Horizons)
            // we leave them where they are — player can manually move via device
        } else if (Array.isArray(saved) && saved.length > 0 && Array.isArray(saved[0]) && !Array.isArray(saved[0][0])) {
            // legacy flat grid (e.g. 4×20) — distribute maps into tiered stashes by mapTier
            _egMapStash = _egMakeAllMapStashes();
            for (let r = 0; r < saved.length; r++) {
                if (!Array.isArray(saved[r])) continue;
                for (let c = 0; c < saved[r].length; c++) {
                    const it = saved[r][c];
                    if (!it) continue;
                    const tier = (it.mapTier != null) ? it.mapTier : 1;
                    const idx = _egMapTierToIndex(tier);
                    // find first free slot in that tier (may grow)
                    let placed = false;
                    for (let rr = 0; rr < _egMapStash[idx].length && !placed; rr++) {
                        for (let cc = 0; cc < EG_MAP_STASH_COLS; cc++) {
                            if (!_egMapStash[idx][rr][cc]) { _egMapStash[idx][rr][cc] = it; placed = true; break; }
                        }
                    }
                    if (!placed) {
                        _egMapStash[idx].push(Array(EG_MAP_STASH_COLS).fill(null));
                        _egMapStash[idx][_egMapStash[idx].length-1][0] = it;
                    }
                }
            }
            STATE.egMapStash = _egMapStash;
            try { if (typeof save === 'function') save(); } catch(e) {}
        } else {
            _egMapStash = _egMakeAllMapStashes();
        }
        // restore active tier if persisted
        if (STATE.egMapStashActiveTier != null) {
            const at = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(STATE.egMapStashActiveTier)));
            _egMapStashActiveTier = at;
        }
    })();
    if (STATE.egMapStashActiveTier != null) _egMapStashActiveTier = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(STATE.egMapStashActiveTier)));

    // ── Currency stash migration to fixed PoE-style slots ──
    // Old saves were 1×30; new is 6×5 with fixed positions. Migrate by collecting items
    // and re-inserting them into their assigned slots (stacking counts).
    (function _migrateCurrency() {
        const saved = STATE.egCurrencyStash;
        let needMigration = !Array.isArray(saved)
            || saved.length !== EG_CURRENCY_ROWS
            || (saved[0] && saved[0].length !== EG_CURRENCY_COLS);
        // Also migrate when items are not in their assigned fixed slots
        // (e.g. layout changed from old ordering to new requested ordering).
        if (!needMigration && Array.isArray(saved)) {
            outer: for (let r = 0; r < saved.length; r++) {
                if (!Array.isArray(saved[r])) continue;
                for (let c = 0; c < saved[r].length; c++) {
                    const it = saved[r][c];
                    if (!it || !it.id) continue;
                    const pos = _egCurrencySlotForId(it.id);
                    if (!pos || pos.r !== r || pos.c !== c) { needMigration = true; break outer; }
                }
            }
        }
        if (!needMigration) {
            _egCurrencyStash = saved;
            return;
        }
        // Collect all items from old grid (flat)
        const items = [];
        if (Array.isArray(saved)) {
            for (let r = 0; r < saved.length; r++) {
                if (!Array.isArray(saved[r])) continue;
                for (let c = 0; c < saved[r].length; c++) {
                    const it = saved[r][c];
                    if (it && it.id) {
                        _egHealCurrencyItem(it);
                        _egHealEssenceItem(it);
                        items.push(it);
                    }
                }
            }
        }
        // Build fresh fixed-slot grid
        _egCurrencyStash = Array.from({ length: EG_CURRENCY_ROWS }, () => Array(EG_CURRENCY_COLS).fill(null));
        // Merge stacks by id into assigned slot
        const merged = new Map(); // id → total count
        for (const it of items) {
            const key = it.id;
            const cnt = it.count || 1;
            merged.set(key, (merged.get(key) || 0) + cnt);
        }
        for (const [id, total] of merged.entries()) {
            const pos = _egCurrencySlotForId(id);
            if (!pos) continue; // unknown / unassigned currency — drop (should not happen)
            const def = _egCurrencyDefForId(id);
            // Preserve first item's full object as template (with heals)
            const template = items.find(x => x.id === id) || { id, category: 'currency', rarity: 'currency' };
            _egCurrencyStash[pos.r][pos.c] = {
                ...template,
                id,
                name: (def && def.name) || template.name,
                icon: (def && def.icon) || template.icon,
                description: (def && def.description) || template.description,
                category: 'currency',
                rarity: 'currency',
                count: total,
            };
        }
        // Persist migrated shape immediately
        STATE.egCurrencyStash = _egCurrencyStash;
        try { if (typeof save === 'function') save(); } catch(e) {}
    })();
    // Heal after migration as well
    if (Array.isArray(_egCurrencyStash)) {
        for (let r = 0; r < _egCurrencyStash.length; r++) {
            if (!Array.isArray(_egCurrencyStash[r])) { _egCurrencyStash[r] = Array(EG_CURRENCY_COLS).fill(null); continue; }
            // ensure row length
            if (_egCurrencyStash[r].length < EG_CURRENCY_COLS) while(_egCurrencyStash[r].length < EG_CURRENCY_COLS) _egCurrencyStash[r].push(null);
            if (_egCurrencyStash[r].length > EG_CURRENCY_COLS) _egCurrencyStash[r] = _egCurrencyStash[r].slice(0, EG_CURRENCY_COLS);
            for (let c = 0; c < _egCurrencyStash[r].length; c++) {
                const it = _egCurrencyStash[r][c];
                if (it) {
                    _egHealCurrencyItem(it);
                    _egHealEssenceItem(it);
                }
            }
        }
    }
    if (_egCurrencyStash.length < EG_CURRENCY_ROWS) {
        while(_egCurrencyStash.length < EG_CURRENCY_ROWS) _egCurrencyStash.push(Array(EG_CURRENCY_COLS).fill(null));
    }
    // EG_ESSENCE_ROWS/COLS are defined in endgame-essences.js which loads
    // after this file — guard so first-load initialisation never throws.
    // The stash is always normalised to the CURRENT grid dimensions: saves
    // created with an older (smaller) essence tab would otherwise leave
    // rows/cols undefined and crash the essence renderer.
    {
        const essR = typeof EG_ESSENCE_ROWS !== 'undefined' ? EG_ESSENCE_ROWS : 12;
        const essC = typeof EG_ESSENCE_COLS !== 'undefined' ? EG_ESSENCE_COLS : 8;
        const freshEssGrid = Array.from({ length: essR }, () => Array(essC).fill(null));
        const savedEssGrid = STATE.egEssenceStash;
        let needsFixedMigration = false;
        if (Array.isArray(savedEssGrid)) {
            // Detect old fixed-slot vs free-form: if any item is not in its assigned slot, migrate
            try {
                if (typeof _egEssenceSlotForId === 'function') {
                    for (let r = 0; r < savedEssGrid.length; r++) {
                        if (!Array.isArray(savedEssGrid[r])) continue;
                        for (let c = 0; c < savedEssGrid[r].length; c++) {
                            const it = savedEssGrid[r][c];
                            if (!it || !it.id) continue;
                            const pos = _egEssenceSlotForId(it.id);
                            if (!pos || pos.r !== r || pos.c !== c) { needsFixedMigration = true; break; }
                        }
                        if (needsFixedMigration) break;
                    }
                    // also if grid size differs from current
                    if (savedEssGrid.length !== essR || (savedEssGrid[0] && savedEssGrid[0].length !== essC)) needsFixedMigration = true;
                }
            } catch(e) { needsFixedMigration = false; }
            if (needsFixedMigration && typeof _egEssenceSlotForId === 'function') {
                // Collect all essence items and re-insert into correct fixed slots
                const allItems = [];
                for (let r = 0; r < savedEssGrid.length; r++) {
                    if (!Array.isArray(savedEssGrid[r])) continue;
                    for (let c = 0; c < savedEssGrid[r].length; c++) {
                        const it = savedEssGrid[r][c];
                        if (it && it.id) {
                            if (typeof _egHealEssenceItem === 'function') _egHealEssenceItem(it);
                            allItems.push(it);
                        }
                    }
                }
                const merged = new Map(); // id -> total count
                const leftover = []; // items with no assigned slot
                const LEGACY_ESSENCE_DISCARD = new Set(['essence_vitality','essence_might','essence_sorcery','essence_swiftness','essence_fortress','essence_elements','essence_puzzle']);
                for (const it of allItems) {
                    if (LEGACY_ESSENCE_DISCARD.has(it.id)) continue; // drop legacy group essences — replaced by per-modifier essences
                    const pos = _egEssenceSlotForId(it.id);
                    if (!pos) { leftover.push(it); continue; }
                    const cnt = it.count || 1;
                    merged.set(it.id, (merged.get(it.id) || 0) + cnt);
                }
                for (const [id, total] of merged.entries()) {
                    const pos = _egEssenceSlotForId(id);
                    if (!pos) continue;
                    const def = (typeof _egEssenceDefForId === 'function') ? _egEssenceDefForId(id) : null;
                    const src = allItems.find(x => x.id === id) || {};
                    freshEssGrid[pos.r][pos.c] = {
                        ...src,
                        id,
                        name: (def && def.name) || src.name || id,
                        icon: (def && def.icon) || src.icon || '🧬',
                        description: (def && def.description) || src.description || '',
                        category: 'essence',
                        rarity: 'essence',
                        count: total,
                    };
                }
                // Leftover unknown essences go to first decorative empty cells
                for (const it of leftover) {
                    let placed = false;
                    for (let r = 0; r < essR && !placed; r++) {
                        for (let c = 0; c < essC && !placed; c++) {
                            if (freshEssGrid[r][c]) continue;
                            const assigned = (typeof _egEssenceIdForSlot === 'function') ? _egEssenceIdForSlot(r,c) : null;
                            if (assigned) continue; // reserved
                            freshEssGrid[r][c] = it;
                            placed = true;
                        }
                    }
                    if (!placed) console.warn('[ESSENCE] leftover essence could not be placed', it.id);
                }
                // Persist migrated shape
                STATE.egEssenceStash = freshEssGrid;
                try { if (typeof save === 'function') save(); } catch(e) {}
            } else {
                for (let r = 0; r < Math.min(essR, savedEssGrid.length); r++) {
                    if (!Array.isArray(savedEssGrid[r])) continue;
                    for (let c = 0; c < Math.min(essC, savedEssGrid[r].length); c++) {
                        freshEssGrid[r][c] = savedEssGrid[r][c] || null;
                    }
                }
            }
        }
        _egEssenceStash = freshEssGrid;
    }
    _egMapSlotItem = STATE.egMapSlotItem || null;
    _egCraftingBenchItem = STATE.egCraftingBenchItem || null;
    // Heal legacy essence cells too (description/category missing from old saves).
    if (Array.isArray(_egEssenceStash)) {
        for (let r = 0; r < _egEssenceStash.length; r++) {
            if (!Array.isArray(_egEssenceStash[r])) continue;
            for (let c = 0; c < _egEssenceStash[r].length; c++) {
                const it = _egEssenceStash[r][c];
                if (it) _egHealEssenceItem(it);
            }
        }
    }
    // Mass-sell filter — load (or default-initialise) from the persisted save.
    _egLoadMassSellSettings();
    // Loot filter — load (or default-initialise) from the persisted save.
    if (typeof _egLoadLootFilter === 'function') _egLoadLootFilter();

    // Heal legacy equipment items that were saved before implicits existed.
    try {
        if (typeof _egHealItemImplicits === 'function') {
            if (Array.isArray(_egInventory)) {
                for (let r = 0; r < _egInventory.length; r++) {
                    for (let c = 0; c < EG_INV_COLS; c++) {
                        const it = _egInventory[r][c];
                        if (it && it.category === 'equip' && !it.isUnique) _egHealItemImplicits(it);
                    }
                }
            }
            if (typeof _egEquipped === 'object' && _egEquipped) {
                Object.values(_egEquipped).forEach(it => { if (it && !it.isUnique) _egHealItemImplicits(it); });
            }
        }
    } catch (e) { /* ignore */ }

    // Heal legacy uniques that were saved before base armor/damage was added.
    // Retroactively fills missing defenses/damage/blockChance from the
    // updated EG_UNIQUE_ITEMS definitions (or fallback). Persists if changed.
    try {
        if (typeof _egHealUniqueItem === 'function') {
            let uniqueChanged = false;
            const healGrid = (grid) => {
                if (!Array.isArray(grid)) return;
                for (let r = 0; r < grid.length; r++) {
                    if (!Array.isArray(grid[r])) continue;
                    for (let c = 0; c < grid[r].length; c++) {
                        const it = grid[r][c];
                        if (it && it.isUnique && _egHealUniqueItem(it)) uniqueChanged = true;
                    }
                }
            };
            healGrid(_egInventory);
            if (typeof _egEquipped === 'object' && _egEquipped) {
                for (const it of Object.values(_egEquipped)) if (it && it.isUnique && _egHealUniqueItem(it)) uniqueChanged = true;
            }
            if (_egMapSlotItem && _egMapSlotItem.isUnique && _egHealUniqueItem(_egMapSlotItem)) uniqueChanged = true;
            if (typeof _egCraftingBenchItem !== 'undefined' && _egCraftingBenchItem && _egCraftingBenchItem.isUnique && _egHealUniqueItem(_egCraftingBenchItem)) uniqueChanged = true;
            if (uniqueChanged && typeof egSaveHubState === 'function') { try { egSaveHubState(); } catch (e) {} }
        }
    } catch (e) { /* ignore */ }

    // ── Legacy weapon hands heal (pre-1H/2H saves) ──────────────────────
    try {
        if (typeof _egHealWeaponHands === 'function') {
            let handsChanged = false;
            const healWeaponGrid = (grid) => {
                if (!Array.isArray(grid)) return;
                for (let r = 0; r < grid.length; r++) {
                    if (!Array.isArray(grid[r])) continue;
                    for (let c = 0; c < grid[r].length; c++) {
                        const it = grid[r][c];
                        if (it && !_egHealWeaponHands(it)) continue;
                        handsChanged = true;
                    }
                }
            };
            healWeaponGrid(_egInventory);
            if (typeof _egEquipped === 'object' && _egEquipped) {
                for (const it of Object.values(_egEquipped)) if (it && _egHealWeaponHands(it)) handsChanged = true;
            }
            if (typeof _egCraftingBenchItem !== 'undefined' && _egCraftingBenchItem && _egHealWeaponHands(_egCraftingBenchItem)) handsChanged = true;
            if (handsChanged && typeof egSaveHubState === 'function') { try { egSaveHubState(); } catch (e) {} }
        }
    } catch (e) { /* ignore */ }

    // ── Legacy hand migration (pre-1H/2H saves) ────────────────────────
    // A 2H weapon + shield equipped before the patch is illegal now. Free the
    // off-hand into the stash so the very next sheet visit shows a legal,
    // working loadout (offense without block, as designed). Nothing is lost
    // (stash is unlimited); the notice toast is deferred to showEndgameHub so
    // it fires on the visible sheet.
    try {
        if (typeof _egMigrateIllegalHandsToStash === 'function') {
            const _handMoves = _egMigrateIllegalHandsToStash();
            if (_handMoves && _handMoves.length) {
                if (typeof egSaveHubState === 'function') { try { egSaveHubState(); } catch (e) {} }
                _egPendingHandMigrationToast = _handMoves;
            }
        }
    } catch (e) { /* ignore */ }

    // ── Unique Collection load + legacy migration ────────────────────────
    try {
        _egEnsureUniqueStash();
        // Load from STATE
        if (STATE.egUniqueStash && typeof STATE.egUniqueStash === 'object' && !Array.isArray(STATE.egUniqueStash)) {
            _egUniqueStash = STATE.egUniqueStash;
            // ensure arrays
            for (const k of Object.keys(_egUniqueStash)) if (!Array.isArray(_egUniqueStash[k])) _egUniqueStash[k] = _egUniqueStash[k] ? [_egUniqueStash[k]] : [];
        } else {
            _egUniqueStash = {};
        }
        if (Array.isArray(STATE.egUniqueCollected)) {
            _egUniqueCollected = new Set(STATE.egUniqueCollected);
        } else {
            _egUniqueCollected = new Set();
        }
        // Legacy migration: move any isUnique items still sitting in regular inventory into the unique stash
        let migrated = false;
        if (Array.isArray(_egInventory)) {
            for (let r = 0; r < _egInventory.length; r++) {
                for (let c = 0; c < EG_INV_COLS; c++) {
                    const it = _egInventory[r][c];
                    if (it && it.isUnique && it.baseId) {
                        const uid = it.baseId;
                        if (!_egUniqueStash[uid]) _egUniqueStash[uid] = [];
                        _egUniqueStash[uid].push(it);
                        _egUniqueCollected.add(uid);
                        _egInventory[r][c] = null;
                        migrated = true;
                    }
                }
            }
        }
        // Also ensure collected set contains every key present in stash
        for (const uid of Object.keys(_egUniqueStash)) _egUniqueCollected.add(uid);
        // Heal implicits/downsides on unique stash items as well
        if (typeof _egHealUniqueItem === 'function') {
            for (const arr of Object.values(_egUniqueStash)) {
                for (const it of arr) _egHealUniqueItem(it);
            }
        }
        if (migrated) {
            STATE.egUniqueStash = _egUniqueStash;
            STATE.egUniqueCollected = Array.from(_egUniqueCollected);
            try { if (typeof save === 'function') save(); } catch(e){}
            // persist via egSaveHubState shape (ensures other fields consistent)
            try { egSaveHubState(); } catch(e){}
        }
    } catch(e) { /* ignore unique load */ }

    // Evict any unique that leaked onto the crafting bench. Older builds
    // allowed uniques onto the bench, persisting one in BOTH the bench and
    // the Unique Collection → a duplicate after reload. Uniques are never
    // craftable, so clear the slot; if it isn't already collected, recover
    // it into the collection so nothing is lost. Placed OUTSIDE the unique-
    // stash try above so a migration hiccup can't skip it.
    try {
        if (_egCraftingBenchItem && _egCraftingBenchItem.isUnique) {
            if (typeof _egEnsureUniqueStash === 'function') _egEnsureUniqueStash();
            const buid = _egCraftingBenchItem.baseId || _egCraftingBenchItem.uniqueId || _egCraftingBenchItem.id;
            const present = buid && Array.isArray(_egUniqueStash[buid]) && _egUniqueStash[buid].length > 0;
            if (buid && !present) {
                if (!_egUniqueStash[buid]) _egUniqueStash[buid] = [];
                _egUniqueStash[buid].push(_egCraftingBenchItem);
                _egUniqueCollected.add(buid);
            }
            if (typeof _egHealUniqueItem === 'function') _egHealUniqueItem(_egCraftingBenchItem);
            _egCraftingBenchItem = null;
            STATE.egCraftingBenchItem = null;
            STATE.egUniqueStash = _egUniqueStash;
            STATE.egUniqueCollected = Array.from(_egUniqueCollected || []);
            try { if (typeof save === 'function') save(); } catch(e){}
        }
    } catch(e) { /* never break hub load for a bench cleanup */ }

    // Endgame achievements — retroactive sync for existing saves
    try {
        if (typeof setAchStat === 'function' && typeof egAtlasProgress === 'function' && STATE.egAtlasCompleted) {
            const _ap = egAtlasProgress();
            setAchStat('egAtlasRegions', _ap.completed);
            setAchStat('egAtlasHighestTier', _ap.highestTier);
            // count T16 regions separately
            let _pinn = 0;
            for (const _id in STATE.egAtlasCompleted) {
                const _node = (typeof egAtlasNodeById === 'function') ? egAtlasNodeById(_id) : null;
                if (_node && _node.tier === 16 && STATE.egAtlasCompleted[_id]) _pinn++;
            }
            setAchStat('egAtlasPinnacle', _pinn);
        }
        if (typeof setAchStat === 'function' && typeof _egUniqueCollected !== 'undefined' && _egUniqueCollected) {
            setAchStat('egUniquesCollected', _egUniqueCollected.size);
        }
        if (typeof setAchStat === 'function' && typeof _egGetPlayerLevel === 'function') {
            setAchStat('egPlayerLevel', _egGetPlayerLevel());
        }
        if (typeof setAchStat === 'function' && typeof egGetGold === 'function') {
            // gold earned is cumulative — can't reconstruct, seed with current balance as floor
            const _curGold = egGetGold();
            if (_curGold > 0 && (!ACH_STATE.stats.egGoldEarned || ACH_STATE.stats.egGoldEarned < _curGold)) {
                // use setAchStat to at least reflect balance; real earned will grow via _egAddGold
                setAchStat('egGoldEarned', _curGold);
            }
        }
    } catch(e){}
}

// Call this immideatly so the player does NOT have to open the hub first to re-load his item state.
// This way it runs on game restart automatically
_egLoadHubState();


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------

// Creates and injects the hub screen DOM element on first call.
// Also binds the delegated drag-start event listener (defined in endgame-hub-drag-and-drop.js).
function _egCreateScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-hub';
    screen.className = 'screen';
    screen.innerHTML = _egBuildFullScreenHTML();
    document.body.appendChild(screen);
    _egBindDragEvents();  // defined in endgame-hub-drag-and-drop.js
    _egInjectMassSellStyles();
}

// Ensures the hub screen element exists in the DOM; creates it on first call.
function ensureEndgameHubScreen() {
    if (!document.getElementById('screen-endgame-hub')) {
        _egCreateScreen();
    }
}

// Transitions to the Endgame Hub screen and fully refreshes all rendered zones.
// This is the main entry point called from elsewhere in the codebase.
function showEndgameHub() {
    ensureEndgameHubScreen();

    // Use the global screen-switcher if available, otherwise manually show/hide.
    if (typeof switchScreen === 'function') {
        switchScreen('screen-endgame-hub');
    } else {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('screen-endgame-hub').style.display = 'block';
    }

    _egLoadHubState();
    _egUpdateItemLevelToggleButton();
    _egRenderAll();
    // Flush any deferred legacy-hand-migration notice on the visible sheet.
    try {
        if (_egPendingHandMigrationToast && _egPendingHandMigrationToast.length
            && typeof _egShowHandMigrationToast === 'function') {
            _egShowHandMigrationToast(_egPendingHandMigrationToast);
        }
    } catch (e) {}
    _egPendingHandMigrationToast = null;
    _egClearTooltip();
}

// Navigates back from the character sheet & inventory screen.
// The Nexus of Worlds screen is the parent of all endgame screens,
// so the back button always returns there.
function safeGoBackFromHub() {
    showEndgameNexus();
}


//------------------------------------------------------------------------
//-------------------DEV / DEBUG UTILITIES--------------------------------
//------------------------------------------------------------------------

// Populates the main stash with a set of mock items for visual debugging.
// Should NOT be called in the production flow.
function egAddTestItems() {
    const testItems = [
        { id: 'map_tier1', name: 'Forge Vault (T1 Map)', icon: '🗺', rarity: 'common', type: 'map' },
        { id: 'map_tier5', name: 'Core Nexus (T5 Map)', icon: '🗺', rarity: 'uncommon', type: 'map' },
        { id: 'helm_01', name: 'Destroyer Greathelm', icon: '⛑', rarity: 'common', type: 'equip' },
        { id: 'chest_01', name: 'Chrono-Weaved Regalia', icon: '👘', rarity: 'rare', type: 'equip' },
        { id: 'ring_01', name: 'Loop of Eternity', icon: '💍', rarity: 'uncommon', type: 'equip' },
        { id: 'currency_1', name: 'Temporal Catalyst', icon: '🔮', rarity: 'currency', type: 'currency' },
        { id: 'currency_2', name: 'Fractured Shard', icon: '💠', rarity: 'currency', type: 'currency' },
        { id: 'weapon_01', name: 'Singularity Spire Staff', icon: '🔱', rarity: 'rare', type: 'equip' },
    ];

    testItems.forEach((item, i) => {
        const r = Math.floor(i / EG_INV_COLS);
        const c = i % EG_INV_COLS;
        _egEnsureInvRows(r + 1);
        _egInventory[r][c] = item;
    });

    _egRenderAll();
}










//-------------------MASS SELL (STASH)------------------------------------
//------------------------------------------------------------------------
// Two buttons live in the stash header ("STASH" row):
//   ⚙  opens the filter modal where the player marks which rarities are
//      PROTECTED (kept). Unchecked rarities are sold.
//   ⚒  sells every non-protected item in the stash in one go — same effect
//      as Ctrl+Click (shard or no-value destroy), but batched with a single
//      confirmation and a single save.

// Builds / returns the shared mass-sell modal element (creates once).
function _egEnsureMassSellModal() {
    _egInjectMassSellStyles();
    let modal = document.getElementById('eg-mass-sell-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'eg-mass-sell-modal';
    modal.className = 'eg-mass-sell-modal-bg';
    modal.innerHTML = `
<div class="eg-mass-sell-box" id="eg-mass-sell-box">
    <div class="eg-ms-head">
        <span class="eg-ms-head-icon">⚒</span>
        <span class="eg-ms-head-title">${t('eg_mass_sell_modal_title')}</span>
        <button class="eg-ms-close" onclick="_egCloseMassSellModal()"
                title="${t('eg_mass_sell_close')}" aria-label="${t('eg_mass_sell_close')}">✕</button>
    </div>
    <div class="eg-ms-body">
        <div class="eg-ms-how">
            <div class="eg-ms-how-title">${t('eg_mass_sell_how')}</div>
            <div class="eg-ms-how-li"><span class="eg-ms-how-b">▸</span><span>${t('eg_mass_sell_b1')}</span></div>
            <div class="eg-ms-how-li"><span class="eg-ms-how-b">▸</span><span>${t('eg_mass_sell_b2')}</span></div>
            <div class="eg-ms-how-li"><span class="eg-ms-how-b">▸</span><span>${t('eg_mass_sell_b3')}</span></div>
        </div>
        <div class="eg-ms-section-head">
            <span class="eg-ms-section-title">${t('eg_mass_sell_rarities_section')}</span>
            <span class="eg-ms-section-line"></span>
        </div>
        <div class="eg-mass-sell-rarities" id="eg-mass-sell-rarities"></div>
        <label class="eg-ms-toggle eg-ms-toggle-gold">
            <input type="checkbox" id="eg-mass-sell-keep-unique" class="eg-ms-check">
            <span>${t('eg_mass_sell_keep_unique')}</span>
        </label>
        <div class="eg-ms-section-head">
            <span class="eg-ms-section-title">${t('eg_mass_sell_levels_section')}</span>
            <span class="eg-ms-section-line"></span>
        </div>
        <div class="eg-ms-level-filters">
            <div class="eg-ms-field">
                <label for="eg-mass-sell-min-ilvl">${t('eg_mass_sell_min_ilvl')}</label>
                <input type="number" id="eg-mass-sell-min-ilvl" min="0" max="100" step="1" value="0">
                <span class="eg-ms-zero-hint">${t('eg_mass_sell_zero_off')}</span>
            </div>
            <div class="eg-ms-field">
                <label for="eg-mass-sell-min-reqlvl">${t('eg_mass_sell_min_reqlvl')}</label>
                <input type="number" id="eg-mass-sell-min-reqlvl" min="0" max="100" step="1" value="0">
                <span class="eg-ms-zero-hint">${t('eg_mass_sell_zero_off')}</span>
            </div>
        </div>
    </div>
    <div class="eg-ms-foot">
        <div class="eg-mass-sell-preview" id="eg-mass-sell-preview"></div>
        <div class="eg-mass-sell-btns">
            <button class="eg-mass-sell-btn eg-mass-sell-save" onclick="_egSaveMassSellModal()">${t('eg_mass_sell_save')}</button>
            <button class="eg-mass-sell-btn eg-mass-sell-cancel" onclick="_egCloseMassSellModal()">${t('reset_cancel')}</button>
        </div>
    </div>
</div>
<div class="eg-mass-sell-confirm" id="eg-mass-sell-confirm" style="display:none;">
    <div class="eg-ms-head">
        <span class="eg-ms-head-icon">⚒</span>
        <span class="eg-ms-head-title">${t('eg_mass_sell_confirm_title')}</span>
    </div>
    <div class="eg-ms-confirm-body">
        <div class="eg-mass-sell-confirm-text" id="eg-mass-sell-confirm-text"></div>
        <div class="eg-mass-sell-btns">
            <button class="eg-mass-sell-btn eg-mass-sell-confirm" onclick="_egConfirmMassSell()">${t('eg_mass_sell_confirm_btn')}</button>
            <button class="eg-mass-sell-btn eg-mass-sell-cancel" onclick="_egCancelMassSellConfirm()">${t('eg_mass_sell_cancel')}</button>
        </div>
    </div>
</div>`;
    // Clicking the dimmed backdrop closes the modal (but not clicks inside the box).
    modal.addEventListener('click', (e) => { if (e.target === modal) _egCloseMassSellModal(); });
    document.body.appendChild(modal);
    return modal;
}

function _egRarityLabel(rarity) {
    const keys = {
        common: 'rar_common', uncommon: 'rar_uncommon', rare: 'rar_rare',
        epic: 'eg_rar_epic', legendary: 'rar_legendary', cursed: 'rar_cursed',
        artifact: 'eg_rar_artifact',
    };
    const k = keys[rarity];
    if (k) { const tr = t(k); if (tr && tr !== k) return tr; }
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function _egRarityColor(rarity) {
    const map = {
        common: '#b0b0b0', uncommon: '#2ecc71', rare: '#3498db',
        epic: '#c39bd3', legendary: '#f5b642', cursed: '#e74c3c', artifact: '#f1c40f',
    };
    return map[rarity] || '#ccc';
}

function _egRenderMassSellModalContent() {
    const wrap = document.getElementById('eg-mass-sell-rarities');
    if (!wrap) return;
    if (!_egMassSellKeep) _egLoadMassSellSettings();
    const rows = EG_MASS_SELL_RARITIES.map(r => {
        const checked = _egMassSellKeep[r] ? 'checked' : '';
        const col = _egRarityColor(r);
        const label = _egRarityLabel(r);
        return `<label class="eg-mass-sell-row" style="--rar:${col};">
            <input type="checkbox" class="eg-ms-check" data-rarity="${r}" ${checked}>
            <span class="eg-mass-sell-dot"></span>
            <span class="eg-mass-sell-rarity-name">${label}</span>
            <span class="eg-mass-sell-keep-hint">${t('eg_mass_sell_keep_label').replace('{rarity}', label)}</span>
        </label>`;
    }).join('');
    wrap.innerHTML = rows;
    // wire preview updates
    wrap.querySelectorAll('input[data-rarity]').forEach(cb => {
        cb.addEventListener('change', _egUpdateMassSellPreview);
    });
    const uniqCb = document.getElementById('eg-mass-sell-keep-unique');
    if (uniqCb) {
        uniqCb.checked = !!_egMassSellKeepUnique;
        uniqCb.onchange = _egUpdateMassSellPreview;
    }
    // Level filters
    const minIlvlInput = document.getElementById('eg-mass-sell-min-ilvl');
    const minReqLvlInput = document.getElementById('eg-mass-sell-min-reqlvl');
    if (minIlvlInput) {
        minIlvlInput.value = _egMassSellMinItemLevel || 0;
        minIlvlInput.onchange = _egUpdateMassSellPreview;
    }
    if (minReqLvlInput) {
        minReqLvlInput.value = _egMassSellMinReqLevel || 0;
        minReqLvlInput.onchange = _egUpdateMassSellPreview;
    }
    _egUpdateMassSellPreview();
}

function _egUpdateMassSellPreview() {
    const preview = document.getElementById('eg-mass-sell-preview');
    if (!preview) return;
    // read current UI state (not yet saved) for live numbers
    const tempKeep = {};
    document.querySelectorAll('#eg-mass-sell-rarities input[data-rarity]').forEach(cb => {
        tempKeep[cb.dataset.rarity] = cb.checked;
    });
    const tempKeepUnique = !!document.getElementById('eg-mass-sell-keep-unique')?.checked;
    const tempMinItemLevel = parseInt(document.getElementById('eg-mass-sell-min-ilvl')?.value || '0', 10);
    const tempMinReqLevel = parseInt(document.getElementById('eg-mass-sell-min-reqlvl')?.value || '0', 10);
    let keep = 0, sell = 0;
    if (_egInventory) {
        for (let r = 0; r < _egInventory.length; r++) {
            for (let c = 0; c < EG_INV_COLS; c++) {
                const it = _egInventory[r][c];
                if (!it) continue;
                const rarity = (it.rarity || 'common').toLowerCase();
                const protectedByRarity = !!tempKeep[rarity];
                const protectedByUnique = tempKeepUnique && it.isUnique;
                const protectedByItemLevel = tempMinItemLevel > 0 && it.itemLevel != null && it.itemLevel >= tempMinItemLevel;
                const protectedByReqLevel = tempMinReqLevel > 0 && it.requirements && it.requirements.level != null && it.requirements.level >= tempMinReqLevel;
                if (protectedByRarity || protectedByUnique || protectedByItemLevel || protectedByReqLevel) keep++; else sell++;
            }
        }
    }
    preview.innerHTML = t('eg_mass_sell_preview')
        .replace('{keep}', `<span class="eg-ms-n-keep">${keep}</span>`)
        .replace('{sell}', `<span class="eg-ms-n-sell">${sell}</span>`);
    // also stash for confirm step
    preview.dataset.keep = String(keep);
    preview.dataset.sell = String(sell);
}

// Re-applies the static shell strings on every open so a language switch
// mid-session is picked up (the shell markup itself is built only once).
function _egMassSellRenderStaticText(modal) {
    const title = modal.querySelector('.eg-mass-sell-box .eg-ms-head-title');
    if (title) title.textContent = t('eg_mass_sell_modal_title');
    const close = modal.querySelector('.eg-ms-close');
    if (close) {
        close.title = t('eg_mass_sell_close');
        close.setAttribute('aria-label', t('eg_mass_sell_close'));
    }
    const howTitle = modal.querySelector('.eg-ms-how-title');
    if (howTitle) howTitle.textContent = t('eg_mass_sell_how');
    const bullets = ['eg_mass_sell_b1', 'eg_mass_sell_b2', 'eg_mass_sell_b3'];
    modal.querySelectorAll('.eg-ms-how-li > span:last-child').forEach((el, i) => {
        if (bullets[i]) el.textContent = t(bullets[i]);
    });
    const sections = modal.querySelectorAll('.eg-mass-sell-box .eg-ms-section-title');
    if (sections[0]) sections[0].textContent = t('eg_mass_sell_rarities_section');
    if (sections[1]) sections[1].textContent = t('eg_mass_sell_levels_section');
    const toggleSpan = modal.querySelector('.eg-ms-toggle-gold > span');
    if (toggleSpan) toggleSpan.textContent = t('eg_mass_sell_keep_unique');
    const ilvlLabel = modal.querySelector('label[for="eg-mass-sell-min-ilvl"]');
    if (ilvlLabel) ilvlLabel.textContent = t('eg_mass_sell_min_ilvl');
    const reqLabel = modal.querySelector('label[for="eg-mass-sell-min-reqlvl"]');
    if (reqLabel) reqLabel.textContent = t('eg_mass_sell_min_reqlvl');
    modal.querySelectorAll('.eg-ms-zero-hint').forEach(el => { el.textContent = t('eg_mass_sell_zero_off'); });
    const saveBtn = modal.querySelector('.eg-mass-sell-btn.eg-mass-sell-save');
    if (saveBtn) saveBtn.textContent = t('eg_mass_sell_save');
    const cancelBtn = modal.querySelector('.eg-mass-sell-box .eg-mass-sell-btn.eg-mass-sell-cancel');
    if (cancelBtn) cancelBtn.textContent = t('reset_cancel');
    const confirmTitle = modal.querySelector('.eg-mass-sell-confirm .eg-ms-head-title');
    if (confirmTitle) confirmTitle.textContent = t('eg_mass_sell_confirm_title');
    const confirmSell = modal.querySelector('.eg-mass-sell-btn.eg-mass-sell-confirm');
    if (confirmSell) confirmSell.textContent = t('eg_mass_sell_confirm_btn');
    const confirmCancel = modal.querySelector('.eg-mass-sell-confirm .eg-mass-sell-btn.eg-mass-sell-cancel');
    if (confirmCancel) confirmCancel.textContent = t('eg_mass_sell_cancel');
}

function _egOpenMassSellModal() {
    _egLoadMassSellSettings();
    const modal = _egEnsureMassSellModal();
    _egMassSellRenderStaticText(modal);
    _egRenderMassSellModalContent();
    // ensure filter view is visible, confirm hidden
    const box = modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    modal.classList.add('show');
}

function _egCloseMassSellModal() {
    const modal = document.getElementById('eg-mass-sell-modal');
    if (modal) modal.classList.remove('show');
}

function _egSaveMassSellModal() {
    // persist checkbox states
    const keep = {};
    document.querySelectorAll('#eg-mass-sell-rarities input[data-rarity]').forEach(cb => {
        keep[cb.dataset.rarity] = cb.checked;
    });
    _egMassSellKeep = _egNormaliseMassSellKeep(keep);
    _egMassSellKeepUnique = !!document.getElementById('eg-mass-sell-keep-unique')?.checked;
    _egMassSellMinItemLevel = Math.max(0, parseInt(document.getElementById('eg-mass-sell-min-ilvl')?.value || '0', 10));
    _egMassSellMinReqLevel = Math.max(0, parseInt(document.getElementById('eg-mass-sell-min-reqlvl')?.value || '0', 10));
    _egSaveMassSellSettings();
    _egCloseMassSellModal();
    if (typeof showToast === 'function') showToast(t('eg_mass_sell_saved'));
}

// ── Sell execution ───────────────────────────────────────────────────
function _egRequestMassSell() {
    _egLoadMassSellSettings();
    const { keep, sell } = _egMassSellCounts();
    if (sell === 0) {
        if (typeof showToast === 'function') showToast(t('eg_mass_sell_nothing_to_sell'));
        else alert(t('eg_mass_sell_nothing_to_sell'));
        return;
    }
    const modal = _egEnsureMassSellModal();
    // populate confirm text in the same modal (re-uses the overlay)
    _egMassSellRenderStaticText(modal);
    _egRenderMassSellModalContent();
    const box = modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    const confirmText = document.getElementById('eg-mass-sell-confirm-text');
    if (confirmText) {
        confirmText.textContent = t('eg_mass_sell_confirm_text')
            .replace('{n}', String(sell))
            .replace('{k}', String(keep));
    }
    if (box) box.style.display = 'none';
    if (confirm) confirm.style.display = '';
    modal.classList.add('show');
}

function _egCancelMassSellConfirm() {
    const modal = document.getElementById('eg-mass-sell-modal');
    if (!modal) return;
    const box = modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    // stay open on the filter view (user can tweak and sell again) — alternatively close:
    // _egCloseMassSellModal();
}

function _egConfirmMassSell() {
    const modal = document.getElementById('eg-mass-sell-modal');
    if (modal) modal.classList.remove('show');
    // Hide confirm sub-panel for next open
    const box = modal && modal.querySelector('.eg-mass-sell-box');
    const confirm = document.getElementById('eg-mass-sell-confirm');
    if (box) box.style.display = '';
    if (confirm) confirm.style.display = 'none';
    _egExecuteMassSell();
}

function _egExecuteMassSell() {
    if (!_egInventory) return;
    _egLoadMassSellSettings();
    // Snapshot targets first so mutation during iteration is safe.
    const targets = [];
    for (let r = 0; r < _egInventory.length; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            const it = _egInventory[r][c];
            if (!it) continue;
            if (_egIsProtectedFromMassSell(it)) continue;
            targets.push({ r, c, item: it });
        }
    }
    if (targets.length === 0) {
        if (typeof showToast === 'function') showToast(t('eg_mass_sell_nothing_to_sell'));
        return;
    }

    let sold = 0, noValue = 0, failed = 0;

    // Re-use the per-item shard logic: noSellValue → destroy without shard,
    // otherwise roll a shard. We batch the side-effects (single save, single
    // render pass at the end) instead of calling _egSellStashItem per cell
    // which would toast + save each time.
    for (const { r, c, item } of targets) {
        // Item may have been moved/cleared already if a previous failure left
        // it — verify the slot still holds the same item.
        if (_egInventory[r][c] !== item) continue;
        if (item.noSellValue) {
            _egInventory[r][c] = null;
            sold++; noValue++;
            continue;
        }
        // Try to grant a shard; if the shard stash is blocked the spec says
        // to keep the item and flash — mirror _egSellStashItem behaviour.
        // Unique items always grant an Ancient Shard.
        let shardDef = null;
        try {
            if (item.isUnique && typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS.shard_ancient) {
                shardDef = EG_SHARD_DEFS.shard_ancient;
            } else {
                shardDef = (typeof _egRollShardForItem === 'function') ? _egRollShardForItem(item) : null;
            }
        } catch (e) { shardDef = null; }
        if (!shardDef) {
            // shard system unavailable — treat as no-value destroy so the
            // inventory does not get stuck
            _egInventory[r][c] = null;
            sold++; noValue++;
            continue;
        }
        let granted = false;
        try {
            granted = (typeof egAddShard === 'function') ? egAddShard(shardDef.id, 1) : false;
        } catch (e) { granted = false; }
        if (!granted) {
            failed++;
            continue;
        }
        _egInventory[r][c] = null;
        sold++;
    }

    if (sold > 0) {
        _egRenderInventory();
        _egUpdateInvCount();
        _egClearTooltip();
        egSaveHubState();
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
            try { Audio_Manager.playSFX('player_equip_pickup'); } catch (e) {}
        }
        if (typeof showToast === 'function') {
            if (failed > 0) {
                showToast(t('eg_mass_sell_done')
                    .replace('{n}', String(sold))
                    + ' ' + t('eg_mass_sell_failed_shard_full').replace('{n}', String(failed)));
            } else if (noValue > 0) {
                showToast(t('eg_mass_sell_done_no_value')
                    .replace('{n}', String(sold))
                    .replace('{z}', String(noValue)));
            } else {
                showToast(t('eg_mass_sell_done').replace('{n}', String(sold)));
            }
        }
        if (failed > 0) {
            const grid = document.getElementById('eg-inv-grid');
            if (grid) {
                grid.classList.add('eg-slot-reject');
                setTimeout(() => grid.classList.remove('eg-slot-reject'), 600);
            }
        }
    } else if (failed > 0) {
        if (typeof showToast === 'function') showToast(t('eg_mass_sell_failed_shard_full').replace('{n}', String(failed)));
        const grid = document.getElementById('eg-inv-grid');
        if (grid) {
            grid.classList.add('eg-slot-reject');
            setTimeout(() => grid.classList.remove('eg-slot-reject'), 600);
        }
    }
}

// Global Escape handler for the endgame stash modals (only when open):
// closes the mass-sell overlay (confirm step steps back to filter view).
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const m = document.getElementById('eg-mass-sell-modal');
        if (m && m.classList.contains('show')) {
            // If confirm sub-panel is visible, first step back to the filter view.
            const confirm = document.getElementById('eg-mass-sell-confirm');
            if (confirm && confirm.style.display !== 'none') {
                _egCancelMassSellConfirm();
            } else {
                _egCloseMassSellModal();
            }
            e.preventDefault();
            e.stopPropagation();
        }
    }
});

function _egInjectMassSellStyles() {
    if (document.getElementById('eg-mass-sell-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-mass-sell-styles';
    style.textContent = `
        /* ── stash header buttons ── */
        .eg-stash-header {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .eg-stash-actions { display: flex; gap: 6px; align-items: center; }
        .eg-stash-btn {
            font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 1px;
            padding: 5px 10px; cursor: pointer;
            border: 1px solid var(--border2, #656f96); color: var(--accent2, #fff);
            background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2)), var(--surface, #303648);
            transition: all 0.12s;
            white-space: nowrap;
        }
        .eg-stash-btn:hover { color: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1); }
        .eg-stash-btn-sell { color: var(--yellow, #f5c518); border-color: rgba(245,197,24,0.55); }
        .eg-stash-btn-sell:hover {
            box-shadow: 0 0 8px rgba(245,197,24,0.3); color: #fff;
            border-color: var(--yellow, #f5c518);
        }

        /* ── backdrop ── */
        .eg-mass-sell-modal-bg {
            display: none; position: fixed; inset: 0;
            background: rgba(5,8,14,0.78);
            backdrop-filter: blur(2px);
            z-index: 10001;
            align-items: center; justify-content: center;
        }
        .eg-mass-sell-modal-bg.show { display: flex; }

        /* ── shell: fixed header, scrollable body, pinned footer ── */
        .eg-mass-sell-box {
            display: flex; flex-direction: column;
            box-sizing: border-box;
            background: var(--panel, #222630);
            border: 1px solid var(--border2, #656f96);
            border-radius: 8px;
            width: min(480px, 94vw);
            max-height: min(640px, 92vh);
            box-shadow: 0 0 0 1px rgba(0,0,0,0.55),
                        0 0 26px rgba(102,252,241,0.10),
                        0 22px 48px rgba(0,0,0,0.55);
            overflow: hidden;
        }
        .eg-mass-sell-confirm {
            box-sizing: border-box;
            background: var(--panel, #222630);
            border: 1px solid var(--border2, #656f96);
            border-radius: 8px;
            width: min(420px, 92vw);
            box-shadow: 0 0 0 1px rgba(0,0,0,0.55),
                        0 0 26px rgba(102,252,241,0.10),
                        0 22px 48px rgba(0,0,0,0.55);
            overflow: hidden;
        }

        /* ── header ── */
        .eg-ms-head {
            display: flex; align-items: center; gap: 10px;
            padding: 11px 14px;
            border-bottom: 1px solid var(--border, #4a5475);
            background: linear-gradient(180deg, rgba(102,252,241,0.07), rgba(102,252,241,0.02));
            flex-shrink: 0;
        }
        .eg-ms-head-icon {
            font-size: 16px; line-height: 1; color: var(--accent, #66fcf1);
            text-shadow: 0 0 8px rgba(102,252,241,0.5);
        }
        .eg-ms-head-title {
            flex: 1; min-width: 0;
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eg-ms-close {
            width: 24px; height: 24px; flex-shrink: 0;
            font-family: var(--PX, monospace); font-size: 10px; line-height: 1;
            color: var(--accent2, #fff); background: transparent;
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            cursor: pointer; transition: all 0.12s;
        }
        .eg-ms-close:hover {
            color: #ff6b6b; border-color: rgba(255,107,107,0.6);
            background: rgba(255,107,107,0.12);
        }

        /* ── scrollable body ── */
        .eg-ms-body {
            flex: 1; min-height: 0;
            overflow-y: auto; overflow-x: hidden;
            padding: 12px 14px;
            display: flex; flex-direction: column; gap: 10px;
            scrollbar-width: thin;
            scrollbar-color: var(--border2, #656f96) transparent;
        }
        .eg-ms-body::-webkit-scrollbar { width: 8px; }
        .eg-ms-body::-webkit-scrollbar-track { background: transparent; }
        .eg-ms-body::-webkit-scrollbar-thumb { background: var(--border2, #656f96); border-radius: 4px; }

        /* ── how-it-works ── */
        .eg-ms-how {
            border: 1px solid var(--border, #4a5475);
            border-left: 3px solid var(--accent, #66fcf1);
            border-radius: 4px;
            background: rgba(102,252,241,0.04);
            padding: 8px 10px;
        }
        .eg-ms-how-title {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 2px;
            color: var(--accent, #66fcf1); opacity: 0.9; margin-bottom: 6px;
        }
        .eg-ms-how-li {
            display: flex; gap: 7px; align-items: baseline;
            font-family: var(--F, monospace); font-size: 12.5px; line-height: 1.45;
            color: var(--accent2, #fff); opacity: 0.88;
        }
        .eg-ms-how-li + .eg-ms-how-li { margin-top: 3px; }
        .eg-ms-how-b { color: var(--accent, #66fcf1); flex-shrink: 0; }

        /* ── section headers ── */
        .eg-ms-section-head { display: flex; align-items: center; gap: 8px; }
        .eg-ms-section-title {
            font-family: var(--PX, monospace); font-size: 8px; letter-spacing: 2px;
            color: var(--accent, #66fcf1);
        }
        .eg-ms-section-line { flex: 1; height: 1px; background: var(--border, #4a5475); opacity: 0.6; }

        /* ── rarity rows ── */
        .eg-mass-sell-rarities { display: flex; flex-direction: column; gap: 4px; }
        .eg-mass-sell-row {
            display: flex; align-items: center; gap: 9px;
            padding: 5px 8px; border: 1px solid transparent; border-radius: 3px;
            background: transparent; cursor: pointer; user-select: none;
            font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff);
            transition: background 0.12s, border-color 0.12s;
        }
        .eg-mass-sell-row:hover { background: rgba(255,255,255,0.05); border-color: var(--rar, #888); }
        .eg-mass-sell-dot {
            width: 10px; height: 10px; border-radius: 2px; background: var(--rar);
            display: inline-block; flex-shrink: 0;
            box-shadow: 0 0 5px var(--rar);
        }
        .eg-mass-sell-rarity-name { font-weight: 700; color: var(--rar); }
        .eg-mass-sell-keep-hint {
            margin-left: auto;
            font-family: var(--F, monospace); font-size: 11px;
            opacity: 0.55; letter-spacing: 0.5px;
        }

        /* ── custom checkboxes (same look as the loot filter) ── */
        .eg-ms-check {
            appearance: none; -webkit-appearance: none;
            width: 15px; height: 15px; flex-shrink: 0; margin: 0;
            background: rgba(0,0,0,0.4);
            border: 1px solid var(--border2, #656f96); border-radius: 2px;
            cursor: pointer; position: relative;
            transition: all 0.12s;
        }
        .eg-ms-check:hover { border-color: var(--accent, #66fcf1); }
        .eg-ms-check:checked {
            background: var(--accent, #66fcf1); border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 7px rgba(102,252,241,0.55);
        }
        .eg-ms-check:checked::after {
            content: '✓'; position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; color: #0c1016;
        }

        /* ── gold toggle row ── */
        .eg-ms-toggle {
            display: flex; align-items: center; gap: 9px;
            padding: 5px 8px; border-radius: 3px; cursor: pointer; user-select: none;
            font-family: var(--F, monospace); font-size: 13px; color: var(--accent2, #fff);
            border: 1px solid transparent;
            transition: background 0.12s, border-color 0.12s;
        }
        .eg-ms-toggle:hover { background: rgba(102,252,241,0.05); border-color: var(--border, #4a5475); }
        .eg-ms-toggle-gold span { color: var(--yellow, #f5c518); }

        /* ── level filter fields ── */
        .eg-ms-level-filters { display: flex; flex-direction: column; gap: 8px; }
        .eg-ms-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .eg-ms-field > label {
            font-family: var(--PX, monospace); font-size: 7px; letter-spacing: 1px;
            color: var(--setup-opt-inactive, #8892a3); text-transform: uppercase;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .eg-ms-field input[type="number"] {
            width: 100%; box-sizing: border-box;
            font-family: var(--F, monospace); font-size: 13px;
            color: var(--accent, #66fcf1);
            background: rgba(0,0,0,0.35);
            border: 1px solid var(--border, #4a5475); border-radius: 3px;
            padding: 4px 7px;
            transition: border-color 0.12s, box-shadow 0.12s;
        }
        .eg-ms-field input[type="number"]:focus {
            outline: none; border-color: var(--accent, #66fcf1);
            box-shadow: 0 0 6px rgba(102,252,241,0.3);
        }
        .eg-ms-zero-hint {
            font-family: var(--F, monospace); font-size: 10px; line-height: 1;
            color: var(--setup-opt-inactive, #8892a3); opacity: 0.85;
        }

        /* ── footer (pinned: preview + save/cancel always visible) ── */
        .eg-ms-foot {
            flex-shrink: 0;
            border-top: 1px solid var(--border, #4a5475);
            background: rgba(0,0,0,0.18);
            padding: 9px 14px 12px;
        }
        .eg-mass-sell-preview {
            text-align: center; min-height: 17px; margin-bottom: 8px;
            font-family: var(--F, monospace); font-size: 13px; letter-spacing: 0.5px;
            color: var(--accent2, #fff);
        }
        .eg-ms-n-keep { color: var(--green, #3ddc84); }
        .eg-ms-n-sell { color: var(--orange, #ff8c42); }
        .eg-mass-sell-btns { display: flex; gap: 10px; justify-content: center; }
        .eg-mass-sell-btn {
            font-family: var(--PX, monospace); font-size: 10px; letter-spacing: 1px;
            padding: 9px 20px; cursor: pointer;
            color: var(--accent2, #fff);
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border2, #656f96); border-radius: 4px;
            transition: all 0.12s;
        }
        .eg-mass-sell-btn:hover { border-color: var(--accent, #66fcf1); color: var(--accent, #66fcf1); }
        .eg-mass-sell-btn.eg-mass-sell-save {
            color: #0c1016; background: var(--accent, #66fcf1);
            border-color: var(--accent, #66fcf1); font-weight: 700;
        }
        .eg-mass-sell-btn.eg-mass-sell-save:hover { box-shadow: 0 0 12px rgba(102,252,241,0.5); }

        /* ── confirm view ── */
        .eg-ms-confirm-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
        .eg-mass-sell-confirm-text {
            font-family: var(--F, monospace); font-size: 13px; line-height: 1.5;
            color: var(--accent2, #fff); text-align: center;
        }
        /* Destructive action — red fill, matching the game's delete-confirm button */
        .eg-mass-sell-btn.eg-mass-sell-confirm {
            color: #fff; background: var(--red, #e74c3c);
            border-color: var(--red, #e74c3c); font-weight: 700;
        }
        .eg-mass-sell-btn.eg-mass-sell-confirm:hover {
            filter: brightness(1.1); box-shadow: 0 0 10px rgba(231,76,60,0.4);
        }

        /* ── narrow screens ── */
        @media (max-width: 500px) {
            .eg-ms-body { padding: 10px; }
            .eg-ms-foot { padding: 8px 10px 10px; }
        }
    `;
    document.head.appendChild(style);
}