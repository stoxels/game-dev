//------------------------------------------------------------------------
//-------------------ENDGAME HUB SCREEN----------------------------------
//------------------------------------------------------------------------
// Handles the Endgame Hub UI:
//   - Character panel with paperdoll equipment slots and stats
//   - Tooltip panel (center column, shows hovered item details)
//   - Map Device panel (right column: orb slot + map stash below)
//   - Currency strip (Runes & Orbs row)
//   - Full-width equipment stash (bottom panel)
//   - Drag-and-drop is handled in endgame-hub-drag-and-drop.js
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
    { id: 'earring2', icon: '🦪', col: 'left' },
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
const EG_INV_ROWS = 5;
const EG_INV_COLS = 24;

// Currency stash dimensions (single row strip)
const EG_CURRENCY_COLS = 30;
const EG_CURRENCY_ROWS = 1;

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


//------------------------------------------------------------------------
//-------------------HTML HELPERS: ITEM CHIP------------------------------
//------------------------------------------------------------------------


// Builds the draggable item chip markup used in every grid zone.
// size: 'normal' (default) or 'large' (used inside the map device slot).

function _egBuildItemChipHTML(item, size = 'normal') {
    const rarityClass = item.rarity ? `eg-rarity-${item.rarity}` : '';
    const sizeClass = size === 'large' ? 'eg-item-chip-large' : '';
    const chipId = `egchip-${++_egChipCounter}`;
    _egChipRegistry.set(chipId, item);

    return `
<div class="eg-item-chip ${rarityClass} ${sizeClass}"
     id="${chipId}"
     title="${(item.name || '').replace(/"/g, '&quot;')}"
     draggable="true"
     onmouseenter="_egShowTooltipFromChip('${chipId}')"
     onmouseleave="_egClearTooltip()">
    <span class="eg-item-chip-icon">${item.icon || '📦'}</span>
    <span class="eg-item-chip-name">${item.name || '???'}</span>
</div>`;
}



function _egShowTooltipFromChip(chipId) {
    const item = _egChipRegistry.get(chipId);
    if (item) {
        console.log('[tooltip] item:', JSON.stringify(item));
        _egShowTooltip(item);
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

// Assembles the full character panel: left slots, center stats, right slots, weapon row.
function _egBuildCharPanelHTML() {
    return `
<div class="eg-panel eg-panel-char">
    <div class="eg-panel-label">${t('eg_char_label')}</div>
    <div class="eg-char-panel eg-char-panel-no-model">
        <div class="eg-equip-col eg-equip-left" id="eg-equip-left">
            ${_egBuildEquipColHTML('left')}
        </div>
        <div class="eg-char-stats-panel" id="eg-char-stats-panel">
            <div class="eg-stats-header">${t('eg_stats_label')}</div>
            <div class="eg-stats-list" id="eg-stats-list">
                <div class="eg-stat-row eg-stat-placeholder">
                    <span class="eg-stat-name">${t('eg_no_stats_yet')}</span>
                </div>
            </div>
        </div>
        <div class="eg-equip-col eg-equip-right" id="eg-equip-right">
            ${_egBuildEquipColHTML('right')}
        </div>
    </div>
    <div class="eg-equip-bottom-row" id="eg-equip-bottom">
        ${_egBuildEquipColHTML('bottom')}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: TOOLTIP PANEL--------------------------
//------------------------------------------------------------------------

// Builds the center tooltip panel (initially shows placeholder text).
function _egBuildTooltipPanelHTML() {
    return `
<div class="eg-panel eg-panel-tooltip">
    <div class="eg-panel-label">${t('eg_item_tooltip_label')}</div>
    <div class="eg-tooltip-panel-body" id="eg-tooltip-panel-body">
        <span class="eg-tooltip-empty">${t('eg_tooltip_hover_hint')}</span>
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: CURRENCY STASH-------------------------
//------------------------------------------------------------------------

// Builds a single currency stash cell div (drop target).
function _egBuildCurrencyCellHTML(row, col) {
    return `
<div class="eg-inv-cell eg-currency-cell"
     id="eg-currency-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="currency"
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

// Assembles the currency strip panel: label + the currency cell grid.
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


//------------------------------------------------------------------------
//-------------------HTML HELPERS: MAP DEVICE-----------------------------
//------------------------------------------------------------------------

// Builds the decorative orb-ring with cardinal rune markers (pure visual).
function _egBuildMapOrbRingHTML() {
    return `
<div class="eg-map-orb-ring">
    <div class="eg-map-orb-rune eg-rune-top">✦</div>
    <div class="eg-map-orb-rune eg-rune-right">✦</div>
    <div class="eg-map-orb-rune eg-rune-bottom">✦</div>
    <div class="eg-map-orb-rune eg-rune-left">✦</div>
</div>`;
}

// Builds the four coloured sockets shown beneath the map device frame (pure visual).
function _egBuildMapSocketRowHTML() {
    return `
<div class="eg-map-socket-row">
    <div class="eg-map-socket eg-socket-red"></div>
    <div class="eg-map-socket eg-socket-green"></div>
    <div class="eg-map-socket eg-socket-blue"></div>
    <div class="eg-map-socket eg-socket-white"></div>
</div>`;
}

// Builds the central orb drop slot where the player inserts a map.
function _egBuildMapOrbSlotHTML() {
    return `
<div class="eg-map-slot"
     id="eg-map-slot"
     data-eg-dropzone="map"
     ondragover="egDragOver(event)"
     ondrop="egDropOnMap(event)"
     ondragleave="egDragLeave(event)">
    <div class="eg-map-slot-inner" id="eg-map-slot-inner">
        <span class="eg-map-slot-empty-text">${t('eg_insert_map')}</span>
    </div>
</div>`;
}

// Assembles the complete map device block: orb frame, drop slot, activate button.
function _egBuildMapDeviceHTML() {
    return `
<div class="eg-map-device">
    <div class="eg-map-device-frame">
        ${_egBuildMapOrbRingHTML()}
        ${_egBuildMapOrbSlotHTML()}
    </div>
    <button class="eg-activate-btn" id="eg-activate-btn" disabled onclick="egActivateMap()">
        ${t('eg_activate_map')}
    </button>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: MAP STASH------------------------------
//------------------------------------------------------------------------

// Builds a single map stash cell div (drop target).
function _egBuildMapStashCellHTML(row, col) {
    return `
<div class="eg-inv-cell eg-map-stash-cell"
     id="eg-map-stash-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="mapstash"
     ondragover="egDragOver(event)"
     ondrop="egDropOnMapStash(event, ${row}, ${col})"
     ondragleave="egDragLeave(event)">
</div>`;
}

// Builds the full map stash grid by iterating over all rows and columns.
function _egBuildMapStashGridHTML() {
    let html = '';
    for (let r = 0; r < EG_MAP_STASH_ROWS; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) {
            html += _egBuildMapStashCellHTML(r, c);
        }
    }
    return html;
}

// Assembles the right-side panel: map device on top, map stash grid below.
function _egBuildMapPanelHTML() {
    return `
<div class="eg-panel eg-panel-map">
    <div class="eg-panel-label">${t('mg_gate_badge')}</div>
    ${_egBuildMapDeviceHTML()}
    <div class="eg-map-stash-section">
        <div class="eg-panel-label">${t('eg_maps_label')}</div>
        <div class="eg-map-stash-grid" id="eg-map-stash-grid">
            ${_egBuildMapStashGridHTML()}
        </div>
    </div>
</div>`;
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
    for (let r = 0; r < EG_INV_ROWS; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            html += _egBuildInventoryCellHTML(r, c);
        }
    }
    return html;
}

// Assembles the full-width stash panel at the bottom of the screen.
function _egBuildStashPanelHTML() {
    return `
<div class="eg-panel eg-panel-inv">
    <div class="eg-panel-label">${t('eg_stash_label')}</div>
    <div class="eg-inv-grid" id="eg-inv-grid" style="grid-template-columns: repeat(${EG_INV_COLS}, 1fr);">
        ${_egBuildInventoryGridHTML()}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY: FULL SCREEN---------------------------
//------------------------------------------------------------------------

// Builds the top navigation bar with back button and hub title.
function _egBuildTopbarHTML() {
    return `
<div class="eg-topbar">
    <button class="eg-back-btn" onclick="safeGoToLevelSelect()">${t('btn_back')}</button>
    <span class="eg-topbar-title">${t('eg_nexus_title')}</span>
</div>`;
}

// Assembles the complete hub screen layout:
// topbar → three-column body (char | tooltip | map) → currency strip → stash.
function _egBuildFullScreenHTML() {
    return `
<div class="eg-hub-layout">
    ${_egBuildTopbarHTML()}
    <div class="eg-body">
        <div class="eg-body-top">
            ${_egBuildCharPanelHTML()}
            ${_egBuildTooltipPanelHTML()}
            ${_egBuildMapPanelHTML()}
        </div>
        ${_egBuildCurrencyStripHTML()}
        ${_egBuildStashPanelHTML()}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------RENDER: EQUIPMENT SLOTS------------------------------
//------------------------------------------------------------------------

// Re-renders a single equipment slot from current state.
// Shows the equipped item chip, or the slot's placeholder icon if empty.
function _egRenderEquipSlot(slotId) {
    const el = document.getElementById(`eg-equip-item-${slotId}`);
    if (!el) return;
    const slot = EG_EQUIP_SLOTS.find(s => s.id === slotId);
    const item = _egEquipped[slotId] || null;

    el.innerHTML = item
        ? _egBuildItemChipHTML(item)
        : `<span class="eg-equip-slot-placeholder">${slot ? slot.icon : '◻'}</span>`;
}

// Re-renders all paperdoll equipment slots.
function _egRenderEquipSlots() {
    EG_EQUIP_SLOTS.forEach(slot => _egRenderEquipSlot(slot.id));
}


//------------------------------------------------------------------------
//-------------------RENDER: MAIN STASH-----------------------------------
//------------------------------------------------------------------------

// Re-renders a single cell in the main stash grid.
function _egRenderInventoryCell(row, col) {
    const cell = document.getElementById(`eg-inv-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egInventory[row][col];
    cell.innerHTML = item
        ? _egBuildItemChipHTML(item) + _egBuildDeleteBtnHTML(row, col)   // ← delete btn added
        : '';
}

// Re-renders the entire main stash grid.
function _egRenderInventory() {
    for (let r = 0; r < EG_INV_ROWS; r++) {
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
    el.textContent = `${used} / ${EG_INV_ROWS * EG_INV_COLS}`;
}


//------------------------------------------------------------------------
//-------------------RENDER: CURRENCY STASH-------------------------------
//------------------------------------------------------------------------

// Re-renders a single cell in the currency stash grid.
function _egRenderCurrencyCell(row, col) {
    const cell = document.getElementById(`eg-currency-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egCurrencyStash[row][col];
    cell.innerHTML = item ? _egBuildItemChipHTML(item) : '';
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
//-------------------RENDER: MAP STASH------------------------------------
//------------------------------------------------------------------------

// Re-renders a single cell in the map stash grid.
function _egRenderMapStashCell(row, col) {
    const cell = document.getElementById(`eg-map-stash-cell-${row}-${col}`);
    if (!cell) return;
    const item = _egMapStash[row][col];
    cell.innerHTML = item ? _egBuildItemChipHTML(item) : '';
}

// Re-renders the entire map stash grid.
function _egRenderMapStash() {
    for (let r = 0; r < EG_MAP_STASH_ROWS; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) {
            _egRenderMapStashCell(r, c);
        }
    }
}


//------------------------------------------------------------------------
//-------------------RENDER: MAP DEVICE-----------------------------------
//------------------------------------------------------------------------

// Updates the activate button enabled/disabled state based on whether a map is loaded.
function _egRenderMapDeviceButton() {
    const btn = document.getElementById('eg-activate-btn');
    if (!btn) return;
    btn.disabled = !_egMapSlotItem;
}

// Re-renders the map device orb slot: shows the loaded map chip, or the empty prompt.
// Also refreshes the activate button state.
function _egRenderMapSlot() {
    const inner = document.getElementById('eg-map-slot-inner');
    if (!inner) return;

    inner.innerHTML = _egMapSlotItem
        ? _egBuildItemChipHTML(_egMapSlotItem, 'large')
        : `<span class="eg-map-slot-empty-text">${t('eg_insert_map')}</span>`;

    _egRenderMapDeviceButton();
}


//------------------------------------------------------------------------
//-------------------RENDER: FULL REFRESH---------------------------------
//------------------------------------------------------------------------


// Re-renders the aggregated stats list in the character panel's center
// column. Reads live gear via _egComputePlayerStats() / _egBuildStatsSummaryLines()
// (endgame-player-stats.js) so it always reflects whatever is currently equipped.
function _egRenderStatsList() {
    const el = document.getElementById('eg-stats-list');
    if (!el) return;

    const stats = _egComputePlayerStats();
    const lines = _egBuildStatsSummaryLines(stats);

    if (lines.length === 0) {
        el.innerHTML = `
<div class="eg-stat-row eg-stat-placeholder">
    <span class="eg-stat-name">${t('eg_no_stats_yet')}</span>
</div>`;
        return;
    }

    el.innerHTML = lines.map(line => `
<div class="eg-stat-row">
    <span class="eg-stat-name">${line.label}</span>
    <span class="eg-stat-value">${line.value}</span>
</div>`).join('');
}


// Triggers a full re-render of every zone in the hub.
// Call this after any state-changing operation.
function _egRenderAll() {
    _egRenderEquipSlots();
    _egRenderInventory();
    _egRenderMapSlot();
    _egRenderCurrencyStash();
    _egRenderMapStash();
    _egUpdateInvCount();
    _egRenderStatsList();   
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
        ranged: 'eg_slot_ranged',
    };

    const rarityLabel = EG_TT_RARITY_KEYS[rarity]
        ? t(EG_TT_RARITY_KEYS[rarity])
        : rarity.charAt(0).toUpperCase() + rarity.slice(1);
    const slotLabel = item.slotType
        ? (EG_TT_SLOT_KEYS[item.slotType]
            ? t(EG_TT_SLOT_KEYS[item.slotType])
            : item.slotType.charAt(0).toUpperCase() + item.slotType.slice(1))
        : '';

    // ── Implicit defenses ────────────────────────────────────────────
    const implicitLines = [];
    const def = item.defenses || {};
    if ((def.armour || 0) > 0) implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_armour')}: <span class="eg-tt-val">${def.armour}</span></div>`);
    if ((def.evasion || 0) > 0) implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_evasion')}: <span class="eg-tt-val">${def.evasion}</span></div>`);
    if ((def.absorption || 0) > 0) implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_absorption')}: <span class="eg-tt-val">${def.absorption}</span></div>`);
    if (item.damage) {
        implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_damage')}: <span class="eg-tt-val">${item.damage.min}–${item.damage.max}</span></div>`);
        implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_attacks_sec')}: <span class="eg-tt-val">${item.attacksPerSecond}</span></div>`);
    }
    if (item.blockChance) {
        implicitLines.push(`<div class="eg-tt-implicit">${t('eg_tt_block_chance')}: <span class="eg-tt-val">${item.blockChance}%</span></div>`);
    }
    const implicitHTML = implicitLines.length
        ? `<div class="eg-tt-section">${implicitLines.join('')}</div>`
        : '';


    // ── Requirements ─────────────────────────────────────────────────
    const req = item.requirements || {};
    const reqParts = [];
    if (req.level > 0) reqParts.push(t('eg_req_level').replace('{n}', req.level));
    if (req.str > 0) reqParts.push(`${req.str} ${t('eg_attr_str')}`);
    if (req.agi > 0) reqParts.push(`${req.agi} ${t('eg_attr_agi')}`);
    if (req.int > 0) reqParts.push(`${req.int} ${t('eg_attr_int')}`);
    const reqHTML = reqParts.length
        ? `<div class="eg-tt-section"><div class="eg-tt-req">${t('eg_requires')} ${reqParts.join(', ')}</div></div>`
        : '';

    // ── Explicit mods ─────────────────────────────────────────────────
    const mods = Array.isArray(item.mods) ? item.mods : [];
    let modsHTML = '';
    if (mods.length > 0) {
        const lines = [];
        for (const mod of mods) {
            if (!Array.isArray(mod.rolledStats)) continue;
            for (const stat of mod.rolledStats) {
                if (stat.label) lines.push(`<div class="eg-tt-mod">${stat.label}</div>`);
            }
        }
        if (lines.length) {
            modsHTML = `<div class="eg-tt-section eg-tt-mods-section">${lines.join('')}</div>`;
        }
    }

    // ── Item level ────────────────────────────────────────────────────
    const ilvlHTML = item.itemLevel != null
        ? `<div class="eg-tt-ilvl">${t('eg_item_level').replace('{n}', item.itemLevel)}</div>`
        : '';

    return `
<div class="eg-tt-frame" style="--tt-border:${rc.border};">
    <div class="eg-tt-header">
        <div class="eg-tt-icon">${item.icon || '📦'}</div>
        <div class="eg-tt-name" style="color:${rc.color};">${item.baseName || item.name || '???'}</div>
        <div class="eg-tt-rarity-line" style="color:${rc.color};">${rarityLabel} ${slotLabel}</div>
    </div>
    ${implicitHTML}
    ${reqHTML}
    ${modsHTML}
    ${ilvlHTML}
</div>`;
}



// Updates the center tooltip panel with the hovered item's data.
// Pass null (or call _egClearTooltip) to reset to the placeholder message.

function _egShowTooltip(item) {
    _egTooltipItem = item;
    const panel = document.getElementById('eg-tooltip-panel-body');
    if (!panel) return;
    panel.innerHTML = item
        ? _egBuildTooltipBodyHTML(item)
        : `<span class="eg-tooltip-empty">${t('eg_tooltip_hover_hint')}</span>`;
}




function _egClearTooltip() {
    _egShowTooltip(null);
}




//------------------------------------------------------------------------
//-------------------MAP ACTIVATION PIPELINE------------------------------
//------------------------------------------------------------------------

// Triggers the map run sequence using whatever map is loaded in the device slot.
// Uses the global showModal() if available, otherwise falls back to alert().
function egActivateMap() {
    if (!_egMapSlotItem) return;

    if (typeof showModal === 'function') {
        showModal(t('eg_map_warning_title'), t('eg_map_activating').replace('{n}', _egMapSlotItem.name));
    } else {
        alert(t('eg_map_alert_activated').replace('{n}', _egMapSlotItem.name));
    }
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
    STATE.egMapSlotItem = _egMapSlotItem;
    save();
}

// Reads hub state from the global STATE object into local variables.
// Missing entries are initialised to their default empty structures.
function _egLoadHubState() {
    _egEquipped = STATE.egEquipped || {};
    _egInventory = STATE.egInventory || Array.from({ length: EG_INV_ROWS }, () => Array(EG_INV_COLS).fill(null));
    _egMapStash = STATE.egMapStash || Array.from({ length: EG_MAP_STASH_ROWS }, () => Array(EG_MAP_STASH_COLS).fill(null));
    _egCurrencyStash = STATE.egCurrencyStash || Array.from({ length: EG_CURRENCY_ROWS }, () => Array(EG_CURRENCY_COLS).fill(null));
    _egMapSlotItem = STATE.egMapSlotItem || null;
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

// Navigates back to the level select screen.
// Falls back to a console warning if goToLevelSelect() is not yet declared.
function safeGoToLevelSelect() {
    if (typeof goToLevelSelect === 'function') {
        goToLevelSelect();
    } else {
        console.warn('[EG] goToLevelSelect() is not declared. Redirecting to console fallback.');
        alert(t('eg_returning_level_select'));
    }
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
        if (r < EG_INV_ROWS) _egInventory[r][c] = item;
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