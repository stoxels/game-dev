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
    const pos = _egFindFreeInvCell();
    _egInventory[pos.r][pos.c] = item;
    _egRenderInventoryCell(pos.r, pos.c);
    _egUpdateInvCount();
    return pos;
}

// ── Orbs & Shards currency tab (PoE-style fixed slots) ──
// 5 cols × 6 rows = 30 cells; 17 orbs + 8 shards = 25 assigned, 5 decorative empties.
// Layout groups common orbs top-left, rarer centre, mirror + ancient orb, shards bottom.
const EG_CURRENCY_COLS = 5;
const EG_CURRENCY_ROWS = 6;

// Fixed assignment: currency id → {r,c}. Mirrors PoE currency tab ordering.
const EG_CURRENCY_SLOT_MAP = {
    // Row 0 — common transmutation / alteration line
    'orb_transmutation': { r: 0, c: 0 },
    'orb_alteration':    { r: 0, c: 1 },
    'orb_augmentation':  { r: 0, c: 2 },
    'orb_alchemy':       { r: 0, c: 3 },
    'orb_chance':        { r: 0, c: 4 },
    // Row 1 — mid progression
    'orb_regal':         { r: 1, c: 0 },
    'orb_chaos':         { r: 1, c: 1 },
    'orb_scouring':      { r: 1, c: 2 },
    'orb_exalted':       { r: 1, c: 3 },
    'orb_divine':        { r: 1, c: 4 },
    // Row 2 — higher & specialised
    'orb_annulment':     { r: 2, c: 0 },
    'orb_ascension':     { r: 2, c: 1 },
    'orb_elevation':     { r: 2, c: 2 },
    'orb_cataclysm':     { r: 2, c: 3 },
    'orb_horizons':      { r: 2, c: 4 },
    // Row 3 — mirror + ancient orb
    'orb_ancient':       { r: 3, c: 0 },
    'mirror_of_kalandra':{ r: 3, c: 2 },
    // Row 4-5 — shards (bottom section)
    'shard_transmutation':{ r: 4, c: 0 },
    'shard_alchemy':     { r: 4, c: 1 },
    'shard_chaos':       { r: 4, c: 2 },
    'shard_elevation':   { r: 4, c: 3 },
    'shard_ascension':   { r: 4, c: 4 },
    'shard_cataclysm':   { r: 5, c: 1 },
    'shard_horizon':     { r: 5, c: 3 },
    'shard_ancient':     { r: 5, c: 0 },
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

// Map stash dimensions
const EG_MAP_STASH_ROWS = 4;
const EG_MAP_STASH_COLS = 20;

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

// Map stash: 2D grid of map item objects (null = empty cell)
let _egMapStash = Array.from({ length: EG_MAP_STASH_ROWS }, () => Array(EG_MAP_STASH_COLS).fill(null));

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
}
function _egSaveMassSellSettings() {
    if (typeof STATE !== 'undefined') {
        STATE.egMassSellKeep = { ..._egMassSellKeep };
        STATE.egMassSellKeepUnique = _egMassSellKeepUnique;
        if (typeof save === 'function') try { save(); } catch (e) {}
    }
    // also persist via the main hub save path
    if (typeof egSaveHubState === 'function') try { egSaveHubState(); } catch (e) {}
}
// Returns true when the item should be KEPT (NOT sold) under the current filter.
function _egIsProtectedFromMassSell(item) {
    if (!item) return true;
    if (_egMassSellKeepUnique && item.isUnique) return true;
    const rarity = (item.rarity || 'common').toLowerCase();
    // Unknown rarity → treat as common (i.e. sold unless keep toggled)
    if (_egMassSellKeep && _egMassSellKeep.hasOwnProperty(rarity)) return !!_egMassSellKeep[rarity];
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
    // Equipment items show their item level in the top-left corner of the slot.
    const ilvlBadge = (item.category === 'equip' && item.itemLevel != null)
        ? `<span class="eg-item-ilvl">${item.itemLevel}</span>`
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
     draggable="true"
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
// Header now carries two stash actions: ⚙ opens the mass-sell filter modal,
// ⚒ sells every stashed item whose rarity is NOT protected (same effect as
// Ctrl+left-click, i.e. shards / no-value destroy).
// The center span (#eg-stash-info) is an absolutely-positioned overlay that
// shows transient feedback (orb failures, equip/unequip blocks, etc.) without
// affecting layout — see endgame-hub.css .eg-stash-info.
function _egBuildStashPanelHTML() {
    return `
<div class="eg-panel eg-panel-inv">
    <div class="eg-panel-label eg-stash-header">
        <span>${t('eg_stash_label')}</span>
        <div id="eg-stash-info" class="eg-stash-info" aria-live="polite"></div>
        <div class="eg-stash-actions">
            <button class="eg-stash-btn eg-stash-btn-config" onclick="_egOpenMassSellModal()"
                    title="${t('eg_mass_sell_config_title')}">⚙ ${t('eg_mass_sell_config')}</button>
            <button class="eg-stash-btn eg-stash-btn-sell" onclick="_egRequestMassSell()"
                    title="${t('eg_mass_sell_title')}">⚒ ${t('eg_mass_sell_btn')}</button>
        </div>
    </div>
    <div class="eg-inv-grid" id="eg-inv-grid" style="grid-template-columns: repeat(${EG_INV_COLS}, 1fr);">
        ${_egBuildInventoryGridHTML()}
    </div>
</div>`;
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


// Builds the tooltip body shown when hovering the "?" info button in the
// top-right of the Nexus of Worlds screen. Uses the shared game tooltip
// engine (tooltips-hud.js) — not the browser title tooltip.
function _egBuildHubInfoTooltipHTML() {
    const line = (key) => `<div class="eg-tt-mod">${t(key)}</div>`;
    return `
<div class="eg-tt-frame" style="--tt-border:#c8a84b;">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">❓</div>
        <div class="eg-tt-name" style="color:#f5d98a;">${t('eg_hub_info_title')}</div>
    </div>
    <div class="eg-tt-section">
        ${line('eg_hub_info_dragdrop')}
        ${line('eg_hub_info_compare')}
        ${line('eg_hub_info_quickmove')}
        ${line('eg_hub_info_sell')}
        ${line('eg_hub_info_mass_sell')}
        ${line('eg_hub_info_currency')}
        ${line('eg_hub_info_essence')}
        ${line('eg_hub_info_destroy')}
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
        ? _egBuildItemChipHTML(item) + _egBuildDeleteBtnHTML(row, col)   // ← delete btn added
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
        cell.title = def ? def.name : assignedId;
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
    <div class="eg-stat-row" data-desc-key="${line.descKey}" data-desc-label="${line.label}">
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
// exact formulas from endgame-player-stats.js.
function _egBuildStatDescTooltipHTML(descKey, label) {
    let html = `<strong style="color:var(--accent,#66fcf1)">${label}</strong>`;
    if (descKey) {
        const desc = t(descKey);
        // t() falls back to the raw key when a translation is missing
        if (desc && desc !== descKey) {
            html += `<br><span style="opacity:.75;font-size:.9em">${desc}</span>`;
        }
        const stats = _egComputePlayerStats();
        // Armour/evasion live values are measured against a representative
        // monster: the current target's level, else the encounter's base
        // level — same convention as the accuracy tooltip below.
        const hasLevelCtx = typeof _egGetTarget === 'function' && typeof _egGetEncounterBaseLevel === 'function';
        const refMonsterLevel = hasLevelCtx
            ? ((_egGetTarget() && _egGetTarget().level) || _egGetEncounterBaseLevel() || 1)
            : 1;
        if (descKey === 'eg_statdesc_armour') {
            // Representative raw hit size at the reference level (matches the
            // average monster base damage scaled by the per-level damage curve).
            const refDamage = Math.round(12 * (1 + 0.12 * (refMonsterLevel - 1)));
            const reductionPct = _egCalcArmourReductionPct(stats.armour, refDamage) * 100;
            html += `<br><span style="color:var(--accent,#66fcf1)">${t('eg_statdesc_armour_value').replace('{p}', reductionPct.toFixed(1))}</span>`;
        } else if (descKey === 'eg_statdesc_evasion') {
            const dodgeChance = Math.min(75, stats.dodgeChance + _egCalcEvasionDodgeChance(stats.evasion, refMonsterLevel));
            html += `<br><span style="color:var(--accent,#66fcf1)">${t('eg_statdesc_evasion_value').replace('{p}', dodgeChance.toFixed(1))}</span>`;
        } else if (descKey === 'eg_statdesc_accuracy') {
            // Miss chance scaled to the character's own level and the next
            // three monster levels (e.g. at player level 12 -> 12/13/14/15).
            // Falls back to level 1 when the leveling system is unavailable.
            const playerLevel = (typeof _egGetPlayerLevel === 'function')
                ? Math.max(1, Number(_egGetPlayerLevel()) || 1) : 1;
            const maxLvl = (typeof EG_LEVELING_CONFIG !== 'undefined' && EG_LEVELING_CONFIG.maxLevel)
                ? EG_LEVELING_CONFIG.maxLevel : 100;
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
                showGameTooltip(_egBuildStatDescTooltipHTML(row.dataset.descKey, row.dataset.descLabel), e);
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


// Triggers a full re-render of every zone in the hub.
// Call this after any state-changing operation.
function _egRenderAll() {
    _egRenderEquipSlots();
    _egRenderInventory();
    _egRenderMapSlot();
    _egRenderCurrencyStash();
    _egRenderEssenceStash();
    _egRenderMapStash();
    _egUpdateInvCount();
    _egRenderStatsList();
    if (typeof _egRenderLevelHUD === 'function') _egRenderLevelHUD();
    _egUpdatePassiveTreeButton();
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
        implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_block_chance')}: <span class="eg-tt-val">${item.blockChance}%</span></div>`);
    }
    const implicitHTML = implicitLines.length
        ? `<div class="eg-tt-section">${implicitLines.join('')}</div>`
        : '';


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

    // ── Explicit mods ─────────────────────────────────────────────────
    const mods = Array.isArray(item.mods) ? item.mods : [];
    let modsHTML = '';
    if (mods.length > 0) {
        // Mods sharing the same stat (e.g. flat Health + the Health half of
        // a hybrid roll) are merged into one combined line per stat.
        const mergedLines = _egBuildMergedModLines(mods);
        const lines = mergedLines.map(entry => {
            // Unique downsides render in warning red instead of mod blue.
            const cls = entry.downside ? 'eg-tt-mod eg-tt-mod-downside' : 'eg-tt-mod';
            return `<div class="${cls}">${entry.label}</div>`;
        });
        if (lines.length) {
            modsHTML = `<div class="eg-tt-section eg-tt-mods-section">${lines.join('')}</div>`;
        }
    }

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
    </div>
    ${implicitHTML}
    ${reqHTML}
    ${chainHTML}
    ${modsHTML}
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
    // Mass-sell filter (persisted alongside the stash so reconstructing the
    // hub after a reload restores the player's protection choices).
    if (_egMassSellKeep) STATE.egMassSellKeep = { ..._egMassSellKeep };
    if (typeof _egMassSellKeepUnique !== 'undefined') STATE.egMassSellKeepUnique = _egMassSellKeepUnique;
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
    return item;
}

// Reads hub state from the global STATE object into local variables.
// Missing entries are initialised to their default empty structures.
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
    _egMapStash = STATE.egMapStash || Array.from({ length: EG_MAP_STASH_ROWS }, () => Array(EG_MAP_STASH_COLS).fill(null));
    // ── Currency stash migration to fixed PoE-style slots ──
    // Old saves were 1×30; new is 6×5 with fixed positions. Migrate by collecting items
    // and re-inserting them into their assigned slots (stacking counts).
    (function _migrateCurrency() {
        const saved = STATE.egCurrencyStash;
        const needMigration = !Array.isArray(saved)
            || saved.length !== EG_CURRENCY_ROWS
            || (saved[0] && saved[0].length !== EG_CURRENCY_COLS);
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
        const essR = typeof EG_ESSENCE_ROWS !== 'undefined' ? EG_ESSENCE_ROWS : 6;
        const essC = typeof EG_ESSENCE_COLS !== 'undefined' ? EG_ESSENCE_COLS : 8;
        const freshEssGrid = Array.from({ length: essR }, () => Array(essC).fill(null));
        const savedEssGrid = STATE.egEssenceStash;
        if (Array.isArray(savedEssGrid)) {
            for (let r = 0; r < Math.min(essR, savedEssGrid.length); r++) {
                if (!Array.isArray(savedEssGrid[r])) continue;
                for (let c = 0; c < Math.min(essC, savedEssGrid[r].length); c++) {
                    freshEssGrid[r][c] = savedEssGrid[r][c] || null;
                }
            }
        }
        _egEssenceStash = freshEssGrid;
    }
    _egMapSlotItem = STATE.egMapSlotItem || null;
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
    _egInjectDeleteUIStyles();
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
    _egRenderAll();
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









// Builds the small "destroy" button overlaid on a stash cell's item chip.
// Row/col are baked into the onclick so the confirm flow knows which cell to clear.
function _egBuildDeleteBtnHTML(row, col) {
    return `<button class="eg-item-delete-btn" title="${t('eg_destroy_item_title')}"
        onclick="event.stopPropagation(); _egRequestDeleteItem(${row}, ${col});">✕</button>`;
}


//------------------------------------------------------------------------
//-------------------ITEM DELETE (STASH ONLY)------------------------------
//------------------------------------------------------------------------

// Cell awaiting confirmation, or null when no delete is pending.
let _egPendingDeleteCell = null;

// Lazily creates the confirm modal DOM (once).
function _egEnsureDeleteModal() {
    if (document.getElementById('eg-delete-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'eg-delete-modal';
    modal.className = 'eg-delete-modal-bg';
    modal.innerHTML = `
<div class="eg-delete-modal-box">
    <div class="eg-delete-modal-title">${t('eg_destroy_item_confirm_title')}</div>
    <div class="eg-delete-modal-text" id="eg-delete-modal-text"></div>
    <div class="eg-delete-modal-btns">
        <button class="eg-delete-modal-btn eg-delete-modal-confirm" onclick="_egConfirmDeleteItem()">${t('eg_destroy_btn')}</button>
        <button class="eg-delete-modal-btn eg-delete-modal-cancel" onclick="_egCancelDeleteItem()">${t('reset_cancel')}</button>
    </div>
</div>`;
    document.body.appendChild(modal);
}

// Opens the confirm modal for the given stash cell.
function _egRequestDeleteItem(row, col) {
    const item = _egInventory[row][col];
    if (!item) return;

    _egEnsureDeleteModal();
    _egPendingDeleteCell = { row, col };

    const textEl = document.getElementById('eg-delete-modal-text');
    if (textEl) {
        textEl.innerHTML = t('eg_destroy_confirm_text').replace('{n}', item.name || t('eg_this_item'));
    }
    document.getElementById('eg-delete-modal').classList.add('show');
}

// Confirms the pending delete: clears the cell, re-renders, saves.
function _egConfirmDeleteItem() {
    if (!_egPendingDeleteCell) return;
    const { row, col } = _egPendingDeleteCell;

    _egInventory[row][col] = null;
    _egRenderInventoryCell(row, col);
    _egUpdateInvCount();
    _egClearTooltip();
    egSaveHubState();

    _egCancelDeleteItem();
}

// Closes the modal without deleting anything.
function _egCancelDeleteItem() {
    _egPendingDeleteCell = null;
    const modal = document.getElementById('eg-delete-modal');
    if (modal) modal.classList.remove('show');
}



// Injects styles for the stash delete button and confirm modal. Runs once.
function _egInjectDeleteUIStyles() {
    if (document.getElementById('eg-delete-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'eg-delete-ui-styles';
    style.textContent = `
        .eg-inv-cell { position: relative; }

        .eg-item-delete-btn {
            display: none;
            position: absolute;
            top: 1px; right: 1px;
            width: 14px; height: 14px;
            line-height: 12px;
            font-size: 10px;
            text-align: center;
            background: rgba(180,20,20,0.85);
            color: #fff;
            border: 1px solid #700;
            border-radius: 3px;
            cursor: pointer;
            z-index: 5;
            padding: 0;
        }
        .eg-inv-cell:hover .eg-item-delete-btn { display: block; }
        .eg-item-delete-btn:hover { background: #ff3333; }

        .eg-delete-modal-bg {
            display: none;
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 10000;
            align-items: center; justify-content: center;
        }
        .eg-delete-modal-bg.show { display: flex; }
        .eg-delete-modal-box {
            background: #1a1a2e;
            border: 2px solid #e74c3c;
            border-radius: 8px;
            padding: 20px 24px;
            max-width: 340px;
            text-align: center;
        }
        .eg-delete-modal-title { color: #e74c3c; font-weight: 700; margin-bottom: 10px; }
        .eg-delete-modal-text { color: #ddd; margin-bottom: 16px; font-size: 0.9rem; }
        .eg-delete-modal-btns { display: flex; gap: 10px; justify-content: center; }
        .eg-delete-modal-btn { padding: 8px 14px; border-radius: 4px; border: none; cursor: pointer; font-weight: 700; }
        .eg-delete-modal-confirm { background: #e74c3c; color: #fff; }
        .eg-delete-modal-confirm:hover { background: #ff5c4d; }
        .eg-delete-modal-cancel { background: #444; color: #ddd; }
        .eg-delete-modal-cancel:hover { background: #555; }
    `;
    document.head.appendChild(style);
}

//------------------------------------------------------------------------
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
<div class="eg-mass-sell-box">
    <div class="eg-mass-sell-title">${t('eg_mass_sell_modal_title')}</div>
    <div class="eg-mass-sell-desc">${t('eg_mass_sell_modal_desc')}</div>
    <div class="eg-mass-sell-rarities" id="eg-mass-sell-rarities"></div>
    <label class="eg-mass-sell-unique-row">
        <input type="checkbox" id="eg-mass-sell-keep-unique">
        <span>${t('eg_mass_sell_keep_unique')}</span>
    </label>
    <div class="eg-mass-sell-preview" id="eg-mass-sell-preview"></div>
    <div class="eg-mass-sell-btns">
        <button class="eg-mass-sell-btn eg-mass-sell-save" onclick="_egSaveMassSellModal()">${t('eg_mass_sell_save')}</button>
        <button class="eg-mass-sell-btn eg-mass-sell-cancel" onclick="_egCloseMassSellModal()">${t('reset_cancel')}</button>
    </div>
</div>
<div class="eg-mass-sell-confirm" id="eg-mass-sell-confirm" style="display:none;">
    <div class="eg-mass-sell-confirm-title">${t('eg_mass_sell_confirm_title')}</div>
    <div class="eg-mass-sell-confirm-text" id="eg-mass-sell-confirm-text"></div>
    <div class="eg-mass-sell-btns">
        <button class="eg-mass-sell-btn eg-mass-sell-confirm" onclick="_egConfirmMassSell()">${t('eg_mass_sell_confirm_btn')}</button>
        <button class="eg-mass-sell-btn eg-mass-sell-cancel" onclick="_egCancelMassSellConfirm()">${t('eg_mass_sell_cancel')}</button>
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
            <input type="checkbox" data-rarity="${r}" ${checked}>
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
    let keep = 0, sell = 0;
    if (_egInventory) {
        for (let r = 0; r < _egInventory.length; r++) {
            for (let c = 0; c < EG_INV_COLS; c++) {
                const it = _egInventory[r][c];
                if (!it) continue;
                const rarity = (it.rarity || 'common').toLowerCase();
                const protectedByRarity = !!tempKeep[rarity];
                const protectedByUnique = tempKeepUnique && it.isUnique;
                if (protectedByRarity || protectedByUnique) keep++; else sell++;
            }
        }
    }
    preview.textContent = t('eg_mass_sell_preview')
        .replace('{keep}', String(keep))
        .replace('{sell}', String(sell));
    // also stash for confirm step
    preview.dataset.keep = String(keep);
    preview.dataset.sell = String(sell);
}

function _egOpenMassSellModal() {
    _egLoadMassSellSettings();
    const modal = _egEnsureMassSellModal();
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

// Global Escape handler for the mass-sell overlay (only when it is open).
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
        .eg-stash-header {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .eg-stash-actions { display: flex; gap: 6px; align-items: center; }
        .eg-stash-btn {
            font-family: var(--PX, monospace); font-size: 9px; letter-spacing: 1px;
            padding: 5px 10px; cursor: pointer;
            border: 1px solid var(--border2, #444); color: var(--accent2, #ccc);
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            transition: all 0.12s;
            white-space: nowrap;
        }
        .eg-stash-btn:hover { color: var(--accent, #c8a84b); border-color: var(--accent, #c8a84b); }
        .eg-stash-btn-sell { color: #f5d98a; border-color: rgba(200,168,75,0.6); }
        .eg-stash-btn-sell:hover { box-shadow: 0 0 8px rgba(200,168,75,0.3); color: #fff; }
        .eg-mass-sell-modal-bg {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.65); z-index: 10001;
            align-items: center; justify-content: center;
        }
        .eg-mass-sell-modal-bg.show { display: flex; }
        .eg-mass-sell-box, .eg-mass-sell-confirm {
            background: #1a1a2e; border: 1px solid var(--accent, #c8a84b);
            border-radius: 10px; padding: 18px 20px; width: min(420px, 92vw);
            box-shadow: 0 0 18px rgba(200,168,75,0.2);
        }
        .eg-mass-sell-confirm { text-align: center; }
        .eg-mass-sell-title, .eg-mass-sell-confirm-title {
            font-family: var(--PX, monospace); font-size: 13px; letter-spacing: 2px;
            color: var(--accent, #c8a84b); text-align: center; margin-bottom: 8px;
        }
        .eg-mass-sell-desc, .eg-mass-sell-confirm-text {
            font-family: var(--PX, monospace); font-size: 10px; line-height: 1.6;
            color: var(--accent2, #ccc); text-align: center; margin-bottom: 12px;
            opacity: 0.9;
        }
        .eg-mass-sell-rarities { display: flex; flex-direction: column; gap: 6px; margin: 10px 0; }
        .eg-mass-sell-row {
            display: flex; align-items: center; gap: 8px;
            padding: 6px 10px; border: 1px solid var(--border, #333);
            background: rgba(255,255,255,0.03); cursor: pointer; user-select: none;
            font-family: var(--PX, monospace); font-size: 11px; color: #ddd;
        }
        .eg-mass-sell-row:hover { border-color: var(--rar, #888); background: rgba(255,255,255,0.06); }
        .eg-mass-sell-row input { accent-color: var(--rar, #c8a84b); }
        .eg-mass-sell-dot { width: 10px; height: 10px; border-radius: 2px; background: var(--rar); display:inline-block; flex-shrink:0; }
        .eg-mass-sell-rarity-name { font-weight: 700; color: var(--rar); }
        .eg-mass-sell-keep-hint { margin-left: auto; font-size: 9px; opacity: 0.6; letter-spacing: 1px; }
        .eg-mass-sell-unique-row {
            display: flex; align-items: center; gap: 8px; margin: 8px 0 4px;
            font-family: var(--PX, monospace); font-size: 10px; color: #f1c40f; cursor: pointer;
        }
        .eg-mass-sell-preview {
            font-family: var(--PX, monospace); font-size: 10px; text-align: center;
            color: #f5d98a; letter-spacing: 1px; margin: 10px 0 12px; min-height: 14px;
        }
        .eg-mass-sell-btns { display: flex; gap: 10px; justify-content: center; }
        .eg-mass-sell-btn {
            font-family: var(--PX, monospace); font-size: 11px; letter-spacing: 1px;
            padding: 8px 16px; cursor: pointer; border: 1px solid var(--border2, #444);
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            color: var(--accent2, #ccc); transition: all 0.12s;
        }
        .eg-mass-sell-btn:hover { border-color: var(--accent, #c8a84b); color: var(--accent, #c8a84b); }
        .eg-mass-sell-btn.eg-mass-sell-save, .eg-mass-sell-btn.eg-mass-sell-confirm {
            color: #1a1a2e; background: var(--accent, #c8a84b); border-color: var(--accent, #c8a84b); font-weight: 700;
        }
        .eg-mass-sell-btn.eg-mass-sell-save:hover, .eg-mass-sell-btn.eg-mass-sell-confirm:hover { filter: brightness(1.1); }
    `;
    document.head.appendChild(style);
}