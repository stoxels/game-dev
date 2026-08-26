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
    <button class="eg-level-btn"
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
// topbar → character panel (left) + essence tab (right) → runes & orbs
// strip → stash.
// The item tooltip is a floating mouseover tooltip (no dedicated panel),
// and the probability gate / map device lives on its own screen.
function _egBuildFullScreenHTML() {
    return `
<div class="eg-hub-layout">
    ${_egBuildTopbarHTML()}
    <div class="eg-body">
        <div class="eg-upper-row">
            <div class="eg-char-wrap">
                ${_egBuildCharPanelHTML()}
            </div>
            <div class="eg-essence-col">
                ${typeof _egBuildEssenceTabHTML === 'function' ? _egBuildEssenceTabHTML() : ''}
            </div>
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
        } else if (descKey === 'eg_statdesc_accuracy'
            && typeof _egGetTarget === 'function' && typeof _egGetEncounterBaseLevel === 'function') {
            // Live miss chance for melee strikes AND projectiles, measured
            // against the current target's level (falls back to the
            // encounter's base level when nothing is targeted).
            const target = _egGetTarget();
            const monsterLevel = (target && target.level) || _egGetEncounterBaseLevel() || 1;
            const missPct = _egCalcAccuracyMissChance(stats.accuracy, monsterLevel);
            const label = t('eg_statdesc_accuracy_value')
                .replace('{p}', missPct.toFixed(1))
                .replace('{n}', monsterLevel);
            html += `<br><span style="color:var(--accent,#66fcf1)">${label}</span>`;
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
    _egInventory = STATE.egInventory || Array.from({ length: EG_INV_ROWS }, () => Array(EG_INV_COLS).fill(null));
    _egMapStash = STATE.egMapStash || Array.from({ length: EG_MAP_STASH_ROWS }, () => Array(EG_MAP_STASH_COLS).fill(null));
    _egCurrencyStash = STATE.egCurrencyStash || Array.from({ length: EG_CURRENCY_ROWS }, () => Array(EG_CURRENCY_COLS).fill(null));
    // Heal legacy currency/shard cells that were saved without description/category.
    if (Array.isArray(_egCurrencyStash)) {
        for (let r = 0; r < _egCurrencyStash.length; r++) {
            if (!Array.isArray(_egCurrencyStash[r])) continue;
            for (let c = 0; c < _egCurrencyStash[r].length; c++) {
                const it = _egCurrencyStash[r][c];
                if (it) {
                    _egHealCurrencyItem(it);
                    // Also handle essences that were mistakenly stored in currency strip
                    // (very old saves) — let essence heal attempt as fallback.
                    _egHealEssenceItem(it);
                }
            }
        }
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