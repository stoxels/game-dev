//------------------------------------------------------------------------
//-------------------HUB SCREEN-------------------------------------------
//------------------------------------------------------------------------
// The character sheet and stash screen: the paperdoll, currency strip, stash
// panel and full-screen assembly, the render functions, and the open / close
// logic (including the in-puzzle overlay). Stash, currency, mass-sell, topbar,
// save/load, unique UI and the stats panel live in their own modules and are
// re-exported at the bottom, so other files keep importing everything from here.
//------------------------------------------------------------------------

import '../audio/audio.js';
import { cur } from '../state.js';

// Accessor: other files reassign the previewed item through globalThis.
try { Object.defineProperty(globalThis, '_tooltipItem', { get() { return _tooltipItem; }, set(v) { _tooltipItem = v; }, configurable: true }); } catch (e) {}

import { buildClassHUD } from '../classes/class-hud.js';
import { _getPlayerMaxMana, updateClassHUDManaBar } from '../classes/class-mana.js';
import { switchScreen } from '../screens/screens.js';
import { renderSkillHotbar } from '../skills/skill-hotbar.js';
import { pauseTimer, resumeTimer } from '../timer/timer.js';
import { t } from '../translation/translations.js';
import { GAME_ART } from '../combat/combat-art.js';
import '../loot/loot-currency-tooltip.js';
import { _onPause, _onResume } from '../combat/encounter-tick-support.js';
import { _renderPanel } from '../combat/encounter.js';
import { _buildEssenceTabHTML, _renderEssenceStash } from '../loot/loot-essences-render.js';
import { _egRenderMapSlot, _egRenderMapStash } from '../endgame/endgame-gate.js';
import { _flushRunLootToStash } from '../combat/combat-grid-pickups-loot.js';
import { _bindDragEvents, _renderCurrencyCell } from './hub-drag-and-drop.js';
import { _clearTooltip } from './hub-tooltips.js';
import { _updateUniqueTabBadge } from './hub-uniques.js';
import { _renderLevelHUD } from './hub-leveling.js';
import { _egMapPlayerLifeMult } from '../endgame/endgame-map-launch.js';
import { showEndgameNexus } from '../endgame/endgame-nexus.js';
import { PLAYER_STATS, _computePlayerStats } from '../combat/combat-player-stats.js';
import { _isItemBlocked } from '../loot/loot-requirements.js';
import { CURRENCY_COLS, CURRENCY_ROWS, _buildCraftingBenchSlotHTML, _currencyDefForId, _currencyIdForSlot, _currencyStash } from '../loot/hub-currency.js';
import { _pendingHandMigrationToast, _showHandMigrationToast } from './hub-save.js';
import { _cancelMassSellConfirm, _closeMassSellModal } from './hub-mass-sell-modal.js';

import { _injectMassSellStyles } from './hub-mass-sell-styles.js';
import { _buildItemChipHTML, _showItemLevel } from './hub-mass-sell.js';
import { INV_COLS, _ensureInvRows, _equipped, _getInvCapacity, _getInvRows, _inventory, _stashTab } from './hub-stash.js';
import { _buildTopbarHTML, _updateItemLevelToggleButton, _updatePassiveTreeButton } from './hub-topbar.js';
import { UNIQUE_ITEMS } from '../loot/unique-item-data.js';
// Imported last so the module evaluation order inside the hub import cycle is unchanged.
import { _buildUniqueGridHTML, _renderUniqueStash } from './hub-unique-ui.js';
import { _renderStatsList } from './hub-stats-panel.js';


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

// Equipment slot definitions - each entry maps a slot id to its icon and
// which column of the paperdoll it belongs to (left / right / bottom).
export const EQUIP_SLOTS = [
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


// The item currently previewed in the tooltip panel.
let _tooltipItem = null;


//------------------------------------------------------------------------
//-------------------HTML HELPERS: EQUIPMENT PANEL------------------------
//------------------------------------------------------------------------

// Builds a single equipment slot div (the outer drop-target container).
export function _buildEquipSlotHTML(slot) {
    return `
<div class="sx-equip-slot"
     id="sx-equip-slot-${slot.id}"
     data-slot-id="${slot.id}"
     data-eg-dropzone="equip"
     ondragover="hubDragOver(event)"
     ondrop="hubDropOnEquip(event, '${slot.id}')"
     ondragleave="hubDragLeave(event)">
    <div class="sx-equip-slot-item" id="sx-equip-item-${slot.id}">
        <span class="sx-equip-slot-placeholder">${slot.icon || '◻'}</span>
    </div>
</div>`;
}

// Builds all equipment slot divs for a given paperdoll column.
export function _buildEquipColHTML(col) {
    return EQUIP_SLOTS
        .filter(s => s.col === col)
        .map(s => _buildEquipSlotHTML(s))
        .join('');
}

// Assembles the full character panel: offense stats (upper left), left slots,
// center puzzle stats, right slots, defense stats (upper right), weapon row.
export function _buildCharPanelHTML() {
    return `
<div class="sx-panel sx-panel-char">
    <div class="sx-panel-label sx-char-label-row"><span>${t('eg_char_label')}</span><span id="sx-char-level-inline"></span></div>
    <div class="sx-char-panel sx-char-panel-no-model">
        <div class="sx-stat-block" id="sx-stats-offense">
            <div class="sx-stats-header">${t('eg_stats_offense_label')}</div>
            <div class="sx-stats-list" id="sx-offense-stats-list"></div>
        </div>
        <div class="sx-equip-col sx-equip-left" id="sx-equip-left">
            ${_buildEquipColHTML('left')}
        </div>
        <div class="sx-char-stats-panel" id="sx-char-stats-panel">
            <div class="sx-stats-header">${t('eg_stats_label')}</div>
            <div class="sx-stats-list" id="sx-stats-list"></div>
        </div>
        <div class="sx-equip-col sx-equip-right" id="sx-equip-right">
            ${_buildEquipColHTML('right')}
        </div>
        <div class="sx-stat-block" id="sx-stats-defense">
            <div class="sx-stats-header">${t('eg_stats_defense_label')}</div>
            <div class="sx-stats-list" id="sx-defense-stats-list"></div>
        </div>
    </div>
    <div class="sx-equip-bottom-row" id="sx-equip-bottom">
        ${_buildEquipColHTML('bottom')}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: CURRENCY STASH-------------------------
//------------------------------------------------------------------------

// Builds a single currency stash cell div (drop target).
// Empty assigned slots get a faint icon + hover tooltip stating the assigned orb/shard name.
export function _buildCurrencyCellHTML(row, col) {
    // Placeholder tooltip handled via JS hover helpers; cell carries data for empty display.
    return `
<div class="sx-inv-cell sx-currency-cell"
     id="sx-currency-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="currency"
     onmouseenter="_onCurrencyCellEnter(${row}, ${col}, event)"
     onmousemove="_onCurrencyCellMove(event)"
     onmouseleave="_onCurrencyCellLeave()"
     ondragover="hubDragOver(event)"
     ondrop="hubDropOnCurrency(event, ${row}, ${col})"
     ondragleave="hubDragLeave(event)">
</div>`;
}

// Builds the full currency grid by iterating over all rows and columns.
export function _buildCurrencyGridHTML() {
    let html = '';
    for (let r = 0; r < CURRENCY_ROWS; r++) {
        for (let c = 0; c < CURRENCY_COLS; c++) {
            html += _buildCurrencyCellHTML(r, c);
        }
    }
    return html;
}

// Hub: left-side Orbs & Shards panel (currency tab style)
export function _buildCurrencyPanelHTML() {
    return `
<div class="sx-currency-col">
    <div class="sx-panel-label">${t('eg_runes_orbs')}</div>
    <div class="sx-currency-grid" id="sx-currency-grid"
         style="grid-template-columns: repeat(${CURRENCY_COLS}, 1fr);">
        ${_buildCurrencyGridHTML()}
    </div>
    ${_buildCraftingBenchSlotHTML()}
</div>`;
}

// Gate: horizontal Orbs & Shards strip (same fixed slots, shared data)
export function _buildCurrencyStripHTML() {
    return `
<div class="sx-currency-strip">
    <div class="sx-panel-label">${t('eg_runes_orbs')}</div>
    <div class="sx-currency-row" id="sx-currency-grid"
         style="grid-template-columns: repeat(${CURRENCY_COLS}, 1fr);">
        ${_buildCurrencyGridHTML()}
    </div>
</div>`;
}

// Hover helpers for empty assigned slots - show placeholder name without needing an item.
export function _onCurrencyCellEnter(row, col, e) {
    document.getElementById(`sx-currency-cell-${row}-${col}`);
    const item = _currencyStash[row] && _currencyStash[row][col];
    if (item) return; // occupied → chip's own onmouseenter handles tooltip
    const assignedId = _currencyIdForSlot(row, col);
    if (!assignedId) return;
    const def = _currencyDefForId(assignedId);
    if (!def) return;
    // Build a minimal currency-like tooltip for the empty slot
    const ttName = def.name || assignedId;
    const ttIcon = def.icon || '◻';
    const ttDesc = def.description || '';
    // Respect LANG for shards/orbs already translated; just use def fields
    const html = `
<div class="sx-tt-frame" style="--tt-border:#b59248;">
    <div class="sx-tt-header">
        <div class="sx-tt-icon" style="opacity:0.55;">${GAME_ART.html('item', assignedId, ttIcon)}</div>
        <div class="sx-tt-name" style="color:#f5d98a; opacity:0.9;">${ttName}</div>
        <div class="sx-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_currency')} - ${t('eg_empty_slot_hint') || 'Empty slot'}</div>
    </div>
    <div class="sx-tt-section"><div class="sx-tt-desc" style="opacity:0.85;">${ttDesc}</div></div>
</div>`;
    if (typeof showGameTooltip === 'function') globalThis.showGameTooltip(html, e);
}
export function _onCurrencyCellMove(e) {
    // Only move tooltip when hovering an empty assigned slot (occupied chips manage themselves)
    const cell = e.currentTarget || e.target.closest && e.target.closest('.sx-currency-cell');
    if (!cell) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const item = _currencyStash[r] && _currencyStash[r][c];
    if (item) return;
    if (_currencyIdForSlot(r,c) && typeof moveGameTooltip === 'function') globalThis.moveGameTooltip(e);
}
export function _onCurrencyCellLeave() {
    // Only clear if we were showing an empty-slot tooltip (occupied chip leave already handled)
    if (typeof hideGameTooltip === 'function') globalThis.hideGameTooltip();
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: EQUIPMENT STASH (BOTTOM)---------------
//------------------------------------------------------------------------

// Builds a single equipment stash cell div (drop target).
export function _buildInventoryCellHTML(row, col) {
    return `
<div class="sx-inv-cell"
     id="sx-inv-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="inv"
     ondragover="hubDragOver(event)"
     ondrop="hubDropOnInv(event, ${row}, ${col})"
     ondragleave="hubDragLeave(event)">
</div>`;
}

// Builds the full equipment stash grid by iterating over all rows and columns.
export function _buildInventoryGridHTML() {
    let html = '';
    const rows = _getInvRows();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < INV_COLS; c++) {
            html += _buildInventoryCellHTML(r, c);
        }
    }
    return html;
}

// Assembles the full-width stash panel at the bottom of the screen.
// Now with two tabs: INVENTORY (regular stash) and UNIQUES (stash collection).
export function _buildStashPanelHTML() {
    const invActive = _stashTab !== 'uniques';
    const uniqActive = _stashTab === 'uniques';
    const totalUniques = (typeof UNIQUE_ITEMS !== 'undefined' ? UNIQUE_ITEMS.length : 0);
    const foundUniques = (globalThis._uniqueCollected ? globalThis._uniqueCollected.size : 0);
    return `
<div class="sx-panel sx-panel-inv">
    <div class="sx-panel-label sx-stash-header">
        <div class="sx-stash-tabs" id="sx-stash-tabs">
            <button class="sx-stash-tab ${invActive ? 'active' : ''}" id="sx-tab-inventory" data-tab="inventory" onclick="_switchStashTab('inventory')">${t('eg_tab_inventory') || 'INVENTORY'}</button>
            <button class="sx-stash-tab ${uniqActive ? 'active' : ''}" id="sx-tab-uniques" data-tab="uniques" onclick="_switchStashTab('uniques')">${t('eg_tab_uniques') || 'UNIQUES'} <span class="sx-tab-count">${foundUniques}/${totalUniques}</span></button>
        </div>
        <div id="sx-stash-info" class="sx-stash-info" aria-live="polite"></div>
        <div class="sx-stash-actions">
            <button class="sx-stash-btn sx-stash-btn-config" id="sx-toggle-ilvl-btn"
                     onclick="_toggleItemLevelDisplay()"
                     onmouseenter="_showItemLevelToggleTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">${t(_showItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}</button>
            <button class="sx-stash-btn sx-stash-btn-config" id="sx-loot-filter-btn"
                     onclick="_openLootFilterModal()"
                     onmouseenter="_showLootFilterTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">${t('eg_loot_filter_btn')}</button>
            <button class="sx-stash-btn sx-stash-btn-config" onclick="_openMassSellModal()"
                     onmouseenter="_showMassSellConfigTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">${t('eg_mass_sell_config')}</button>
            <button class="sx-stash-btn sx-stash-btn-sell" onclick="_requestMassSell()"
                     onmouseenter="_showMassSellTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">${t('eg_mass_sell_btn')}</button>
        </div>
    </div>
    <div class="sx-stash-tab-body ${invActive ? 'active' : ''}" id="sx-stash-tab-inventory">
        <div class="sx-inv-grid" id="sx-inv-grid" style="grid-template-columns: repeat(${INV_COLS}, 1fr);">
            ${_buildInventoryGridHTML()}
        </div>
    </div>
    <div class="sx-stash-tab-body ${uniqActive ? 'active' : ''}" id="sx-stash-tab-uniques">
        <div class="sx-unique-hint">${t('eg_unique_stash_hint')}</div>
        <div class="sx-unique-count" id="sx-unique-count">${t('eg_uniques_collected').replace('{found}', foundUniques).replace('{total}', totalUniques)}</div>
        <div class="sx-unique-progress"><i id="sx-unique-progress-fill" style="width:${totalUniques ? Math.round(foundUniques / totalUniques * 100) : 0}%"></i></div>
        <div class="sx-unique-grid" id="sx-unique-grid" data-eg-dropzone="uniques" ondragover="hubDragOver(event)" ondragleave="hubDragLeave(event)">
            ${_buildUniqueGridHTML()}
        </div>
    </div>
</div>`;
}
export let _stashInfoTimer = null;

export function _ensureStashInfoEl() {
    let el = document.getElementById('sx-stash-info');
    if (el) return el;
    const header = document.querySelector('.sx-stash-header');
    if (!header) return null;
    el = document.createElement('div');
    el.id = 'sx-stash-info';
    el.className = 'sx-stash-info';
    el.setAttribute('aria-live', 'polite');
    // insert between label and actions (as 2nd child)
    const actions = header.querySelector('.sx-stash-actions');
    if (actions) header.insertBefore(el, actions);
    else header.appendChild(el);
    return el;
}

export function _showStashInfo(message, opts = {}) {
    const el = _ensureStashInfoEl();
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
    el.className = 'sx-stash-info show sx-stash-info--' + type;
    if (_stashInfoTimer) clearTimeout(_stashInfoTimer);
    _stashInfoTimer = setTimeout(() => {
        el.classList.remove('show');
    }, effectiveDuration);
}

export function _clearStashInfo() {
    const el = document.getElementById('sx-stash-info');
    if (el) el.classList.remove('show');
    if (_stashInfoTimer) { clearTimeout(_stashInfoTimer); _stashInfoTimer = null; }
}


// Assembles the complete hub screen layout:
// topbar → [ Orbs & Shards (left) | character panel (center) | Essence (right) ] → stash.
// The Orbs & Shards tab uses fixed slots; the item tooltip is a floating mouseover.
export function _buildFullScreenHTML() {
    return `
<div class="sx-hub-layout">
    ${_buildTopbarHTML()}
    <div class="sx-body">
        <div class="sx-upper-row">
            ${_buildCurrencyPanelHTML()}
            <div class="sx-char-wrap">
                ${_buildCharPanelHTML()}
            </div>
            <div class="sx-essence-col">
                ${_buildEssenceTabHTML()}
            </div>
        </div>
        ${_buildStashPanelHTML()}
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
export function _renderEquipSlot(slotId) {
    const slotEl = document.getElementById(`sx-equip-slot-${slotId}`);
    const el = document.getElementById(`sx-equip-item-${slotId}`);
    if (!el) return;
    const slot = EQUIP_SLOTS.find(s => s.id === slotId);
    const item = _equipped[slotId] || null;

    // Empty slots show their slot art (slot_<type> from images/items/) once
    // loaded, else the classic emoji placeholder. weapon2 is the offhand.
    let placeholderIcon = slot ? slot.icon : '◻';
    if (slot) {
        const artKey = slot.id === 'weapon2' ? 'slot_shield' : 'slot_' + String(slot.id).replace(/[0-9]+$/, '');
        const artHtml = GAME_ART.html('item', artKey, '');
        if (artHtml) placeholderIcon = artHtml;
    }

    el.innerHTML = item
        ? _buildItemChipHTML(item)
        : `<span class="sx-equip-slot-placeholder">${placeholderIcon}</span>`;

    if (slotEl) {
        if (item) {
            const fill = _getCellFill(item);
            slotEl.style.background = fill;
            slotEl.style.borderColor = fill.replace(/[\d.]+\)$/, '0.9)');
        } else {
            slotEl.style.background = '';
            slotEl.style.borderColor = '';
        }
    }
}

// Re-renders all paperdoll equipment slots.
export function _renderEquipSlots() {
    EQUIP_SLOTS.forEach(slot => _renderEquipSlot(slot.id));
}


//------------------------------------------------------------------------
//-------------------RENDER: MAIN STASH-----------------------------------
//------------------------------------------------------------------------

// Full-cell rarity tint used by the main stash - each occupied cell is
// filled with its item's rarity color (instead of only a chip glow).
// Items with unmet stat requirements override the rarity tint with red.
export const RARITY_CELL_FILL = {
    common: 'rgba(122, 122, 122, 0.40)',
    uncommon: 'rgba(46, 204, 113, 0.35)',
    rare: 'rgba(52, 152, 219, 0.40)',
    epic: 'rgba(155, 89, 182, 0.45)',
    legendary: 'rgba(243, 156, 18, 0.45)',
    cursed: 'rgba(231, 76, 60, 0.40)',
    artifact: 'rgba(241, 196, 15, 0.40)',
    currency: 'rgba(181, 146, 72, 0.35)',
};
export const REQ_BLOCKED_FILL = 'rgba(231, 76, 60, 0.45)';

// Cell fill color for an item: red when its requirements cannot currently
// be met, otherwise its rarity color.
export function _getCellFill(item) {
    if (item && _isItemBlocked(item)) return REQ_BLOCKED_FILL;
    return RARITY_CELL_FILL[item && item.rarity] || RARITY_CELL_FILL.common;
}

// Re-renders a single cell in the main stash grid.
export function _renderInventoryCell(row, col) {
    const cell = document.getElementById(`sx-inv-cell-${row}-${col}`);
    if (!cell) return;
    const item = _inventory[row][col];
    cell.innerHTML = item
        ? _buildItemChipHTML(item)
        : '';

    // Fill the whole cell with the item's rarity color (red when its stat
    // requirements cannot currently be met); reset when empty.
    if (item) {
        const fill = _getCellFill(item);
        cell.style.background = fill;
        cell.style.borderColor = fill.replace(/[\d.]+\)$/, '0.9)');
    } else {
        cell.style.background = '';
        cell.style.borderColor = '';
    }
}

// Re-renders the entire main stash grid.
export function _renderInventory() {
    for (let r = 0; r < _getInvRows(); r++) {
        for (let c = 0; c < INV_COLS; c++) {
            _renderInventoryCell(r, c);
        }
    }
}

// Updates the stash item-count label (if present in the DOM).
export function _updateInvCount() {
    const el = document.getElementById('sx-inv-count');
    if (!el) return;
    let used = 0;
    _inventory.forEach(row => row.forEach(cell => { if (cell) used++; }));
    // Unlimited stash: show used / capacity (capacity grows with rows) - keeps the familiar counter
    el.textContent = `${used} / ${_getInvCapacity()}`;
}


//------------------------------------------------------------------------
//-------------------RENDER: CURRENCY STASH-------------------------------
//------------------------------------------------------------------------

// Re-renders the entire currency stash grid. Each cell is drawn by
// _renderCurrencyCell (hub-drag-and-drop.js), which fills both the hub grid and
// the gate screen's grid.
export function _renderCurrencyStash() {
    for (let r = 0; r < CURRENCY_ROWS; r++) {
        for (let c = 0; c < CURRENCY_COLS; c++) {
            _renderCurrencyCell(r, c);
        }
    }
}

// Item art arrives asynchronously (images/items/manifest.json is fetched
// lazily on first use). Cells rendered with emoji fallbacks before that
// refresh here so they swap to art without needing a reload.
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('sx-art-loaded', function () {
        try {
            if (document.getElementById('sx-currency-cell-0-0') || document.getElementById('eg-gate-currency-cell-0-0')) {
                _renderCurrencyStash();
            }
        } catch (e) { /* hub not open - safe to ignore */ }
    });
}


//------------------------------------------------------------------------
//-------------------RENDER: MAP STASH / MAP DEVICE-----------------------
//------------------------------------------------------------------------
// Lives in endgame-gate.js; _renderAll() calls _egRenderMapSlot() and
// _egRenderMapStash(), which do nothing while the gate screen is not shown.


//------------------------------------------------------------------------
//-------------------RENDER: CRAFTING SLOT & FULL REFRESH-----------------
//------------------------------------------------------------------------

// Re-renders the launcher slot for the crafting bench (in the currency panel).
export function _updateCraftingBenchLauncherSlot() {
    const craftingSlot = document.getElementById('sx-crafting-bench-launch-slot');
    if (craftingSlot) {
        const item = typeof _craftingBenchItem !== 'undefined' ? globalThis._craftingBenchItem : null;
        craftingSlot.innerHTML = item ? _buildItemChipHTML(item) : 'Drop equipment here';
    }
}

// Triggers a full re-render of every zone in the hub.
// Call this after any state-changing operation.
export function _renderAll() {
    _renderEquipSlots();
    _renderInventory();
    _renderUniqueStash();
    _updateUniqueTabBadge();
    // keep tab visibility in sync
    const invBody = document.getElementById('sx-stash-tab-inventory');
    const uniqBody = document.getElementById('sx-stash-tab-uniques');
    const invTab = document.getElementById('sx-tab-inventory');
    const uniqTab = document.getElementById('sx-tab-uniques');
    if (invBody) invBody.classList.toggle('active', _stashTab !== 'uniques');
    if (uniqBody) uniqBody.classList.toggle('active', _stashTab === 'uniques');
    if (invTab) invTab.classList.toggle('active', _stashTab !== 'uniques');
    if (uniqTab) uniqTab.classList.toggle('active', _stashTab === 'uniques');
    _egRenderMapSlot();
    _renderCurrencyStash();
    _renderEssenceStash();
    _egRenderMapStash();
    _updateInvCount();
    _renderStatsList();
    _renderLevelHUD();
    _updatePassiveTreeButton();
    _updateCraftingBenchLauncherSlot();
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------

// Creates and injects the hub screen DOM element on first call.
// Also binds the delegated drag-start event listener (defined in hub-drag-and-drop.js).
export function _createScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-hub';
    screen.className = 'screen';
    screen.innerHTML = _buildFullScreenHTML();
    document.body.appendChild(screen);
    _bindDragEvents();  // defined in hub-drag-and-drop.js
    _injectMassSellStyles();
}

// Ensures the hub screen element exists in the DOM; creates it on first call.
export function ensureHubScreen() {
    if (!document.getElementById('screen-hub')) {
        _createScreen();
    }
}

// Transitions to the Endgame Hub screen and fully refreshes all rendered zones.
// This is the main entry point called from elsewhere in the codebase.
export function showHub() {
    ensureHubScreen();

    switchScreen('screen-hub');

    globalThis._loadHubState();
    _updateItemLevelToggleButton();
    _renderAll();
    _applyOverlayChrome();
    // Flush any deferred legacy-hand-migration notice on the visible sheet.
    try {
        if (_pendingHandMigrationToast && _pendingHandMigrationToast.length) {
            _showHandMigrationToast(_pendingHandMigrationToast);
        }
    } catch (e) {}
    globalThis._pendingHandMigrationToast = null;
    _clearTooltip();
}

// Navigates back from the character sheet & inventory screen.
// The Nexus of Worlds screen is the parent of all endgame screens,
// so the back button returns there - EXCEPT in game-overlay mode (B
// keybind mid-puzzle), where it returns to the running puzzle instead:
// the Nexus path would strand the paused run with no way back.
export function safeGoBackFromHub() {
    if (_hubGameOverlay) { closeHubToGame(); return; }
    showEndgameNexus();
}

export let _hubGameOverlay = false;
// Screen the overlay returns to on close: the running puzzle ('screen-game')
// or, when B was pressed on the world map / level selection, that screen.
let _hubReturnScreen = 'screen-game';
// True only if THIS overlay open paused the game (a pause menu may already
// have been up when B was pressed - then pause state is left untouched).
export let _hubOverlayPaused = false;

// True while the hub is open as an overlay over a running puzzle.
export function isHubGameOverlay() {
    return _hubGameOverlay === true;
}

// Hides the exits to other progression screens (probability tree, atlas of
// statistica, probability gate) while the sheet floats over a paused run -
// leaving them would strand that run with no way back. Restores them on
// every normal open (the hub DOM persists across opens, so this must run
// both ways on every showHub).
export function _applyOverlayChrome() {
    const hide = _hubGameOverlay === true;
    ['sx-btn-passive-tree', 'sx-btn-atlas', 'sx-btn-gate'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = hide ? 'none' : '';
    });
}

// Silently pauses the run WITHOUT the pause overlay (same recipe the
// tutorial's _tqSetPaused uses). No-op unless a level is actually running.
export function _hubOverlayPause() {
    _hubOverlayPaused = false;
    try {
        if (typeof dead !== 'undefined' && globalThis.dead) return;
        if (typeof cur === 'undefined' || !cur) return;
        if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;  // pause menu already up
        pauseTimer();
        globalThis._gamePaused = true;
        try { _onPause(); } catch (e) {}
        _hubOverlayPaused = true;
    } catch (e) {}
}

// Resumes a run paused by _hubOverlayPause. Never touches pause state
// owned by someone else (pause menu, tutorial lessons).
export function _hubOverlayResume() {
    if (!_hubOverlayPaused) return;
    _hubOverlayPaused = false;
    try {
        globalThis._gamePaused = false;
        try { _onResume(); } catch (e) {}
        resumeTimer();
    } catch (e) {}
}

export function _hubHideAvatars() {
    try { if (typeof _hidePlayerAvatarSimple === 'function') globalThis._hidePlayerAvatarSimple(); } catch (e) {}
    try { if (typeof _hidePlayerAvatar === 'function') globalThis._hidePlayerAvatar(); } catch (e) {}
}

export function _hubShowAvatars() {
    try { if (typeof _showPlayerAvatarSimple === 'function') globalThis._showPlayerAvatarSimple(); } catch (e) {}
    try { if (typeof _showPlayerAvatar === 'function') globalThis._showPlayerAvatar(); } catch (e) {}
}

// Opens the sheet over a running puzzle (B keybind path).
export function openHubFromGame(returnScreen = 'screen-game') {
    _hubGameOverlay = true;
    _hubReturnScreen = returnScreen;
    // Only a running puzzle has anything to pause or hide; on the world map
    // / level selection the sheet simply floats over the screen it came from.
    const overGame = returnScreen === 'screen-game';
    if (overGame) {
        _hubOverlayPause();
        _hubHideAvatars();
    } else {
        _hubOverlayPaused = false;
    }
    // Safety net: loot claimed this run must already be visible. Claims now
    // stash instantly (see _checkLootClaim), but a pending item from an
    // older save or a pre-flush code path would otherwise stay hidden in
    // _runLoot until map clear. The flush is idempotent (_stashed skip).
    try { _flushRunLootToStash(); } catch (e) {}
    showHub();
}

// Reconciles the live combat pools with the loadout edited in the overlay.
// Damage done/received already read _computePlayerStats() live, but the
// snapshotted pools (max HP / max mana / absorption) are only set at level
// start - equipping +health/+mana/+absorption mid-puzzle would otherwise do
// nothing until the next level. Grants max-increases to the current pool
// and clamps decreases, then refreshes every combat HUD element
// so the new values are visible the instant B closes the sheet.
export function _syncOverlayGearPools() {
    try {
        if (typeof cur === 'undefined' || !cur) return;
        const stats = _computePlayerStats() || {};
        // ── HP ──
        if (typeof playerMaxHP !== 'undefined' && typeof playerCurrentHP !== 'undefined') {
            const baseHP = PLAYER_STATS.baseHP;
            let newMax = baseHP + (Number(stats.health) || 0);
            if (Number(stats.healthMorePct) > 0) newMax = Math.round(newMax * (1 + stats.healthMorePct / 100));
            try { newMax = Math.round(newMax * _egMapPlayerLifeMult()); } catch (e) {}
            if (Number(stats.lifeBecomesOne) > 0) newMax = 1;
            newMax = Math.max(1, newMax);
            const delta = newMax - globalThis.playerMaxHP;
            globalThis.playerMaxHP = newMax;
            if (delta > 0) globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + delta);
            else globalThis.playerCurrentHP = Math.max(0, Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP));
        }
        // ── Mana snapshot (bar itself reads live max, snapshot keeps regen/clamp sane) ──
        if (typeof playerMaxMana !== 'undefined' && typeof playerCurrentMana !== 'undefined') {
            try {
                const newManaMax = _getPlayerMaxMana();
                const deltaM = newManaMax - globalThis.playerMaxMana;
                globalThis.playerMaxMana = newManaMax;
                if (deltaM > 0) globalThis.playerCurrentMana = Math.min(globalThis.playerMaxMana, globalThis.playerCurrentMana + deltaM);
                else globalThis.playerCurrentMana = Math.max(0, Math.min(globalThis.playerMaxMana, globalThis.playerCurrentMana));
            } catch (e) {}
        }
        // ── Absorption shield ──
        // Regen caps at the live stats max, so clamping is enough: a raised
        // cap refills via regen, a lowered cap trims the current shield now.
        if (typeof _playerAbsorptionCurrent !== 'undefined') {
            try {
                const newAbs = Math.max(0, Number(stats.absorption) || 0);
                globalThis._playerAbsorptionCurrent = Math.max(0, Math.min(newAbs, globalThis._playerAbsorptionCurrent));
            } catch (e) {}
        }
    } catch (e) {}
}

// Closes the overlay and returns to the running puzzle exactly where it was.
export function closeHubToGame() {
    _hubGameOverlay = false;
    const returnScreen = _hubReturnScreen;
    _hubReturnScreen = 'screen-game';
    switchScreen(returnScreen);
    if (returnScreen !== 'screen-game') return;   // map / level select: nothing to resync
    _hubShowAvatars();
    // Gear edited mid-puzzle must apply instantly: sync pools first, then
    // repaint every HUD surface that displays damage done/received or pools.
    try { _syncOverlayGearPools(); } catch (e) {}
    try { if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth(); } catch (e) {}
    try { updateClassHUDManaBar(); } catch (e) {}
    try { _renderPanel(); } catch (e) {}
    try { buildClassHUD(); } catch (e) {}
    try { renderSkillHotbar(); } catch (e) {}
    _hubOverlayResume();
}


//------------------------------------------------------------------------
//-------------------DEV / DEBUG UTILITIES--------------------------------
//------------------------------------------------------------------------

// Populates the main stash with a set of mock items for visual debugging.
// Should NOT be called in the production flow.
export function addTestItems() {
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
        const r = Math.floor(i / INV_COLS);
        const c = i % INV_COLS;
        _ensureInvRows(r + 1);
        _inventory[r][c] = item;
    });

    _renderAll();
}


// Global Escape handler for the endgame stash modals (only when open):
// closes the mass-sell overlay.
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const m = document.getElementById('sx-mass-sell-modal');
        if (m && m.classList.contains('show')) {
            // Cancelling the confirm step also closes the overlay.
            const confirm = document.getElementById('sx-mass-sell-confirm');
            if (confirm && confirm.style.display !== 'none') {
                _cancelMassSellConfirm();
            } else {
                _closeMassSellModal();
            }
            e.preventDefault();
            e.stopPropagation();
        }
    }
});

// ---- re-exports from the focused split modules (public surface preserved) ----

export {
    INV_COLS,
    INV_INITIAL_ROWS,
    INV_ROWS,
    _addItemToStash,
    _ensureInvRows,
    _equipped,
    _expandStashByOneRow,
    _findFreeInvCell,
    _getInvCapacity,
    _getInvRows,
    _inventory,
    _rebuildInventoryGrid,
    _stashTab,
} from './hub-stash.js';

export {
    CURRENCY_COLS,
    CURRENCY_ROWS,
    CURRENCY_SLOT_MAP,
    CURRENCY_SLOT_REVERSE,
    _buildCraftingBenchSlotHTML,
    _currencyDefForId,
    _currencyIdForSlot,
    _currencySlotForId,
    _currencyStash,
} from '../loot/hub-currency.js';

export {
    EG_MAP_STASH_COLS,
    EG_MAP_STASH_INITIAL_ROWS,
    EG_MAP_STASH_ROWS,
    EG_MAP_TIER_COUNT,
    EG_MAP_TIER_ROMANS,
    _egEnsureMapTierRows,
    _egFindFreeMapCellForTier,
    _egGetMapStashRowsForTier,
    _egGetMapTierGrid,
    _egIsLegacyFlatMapStash,
    _egIsTieredMapStash,
    _egMakeAllMapStashes,
    _egMakeMapTierGrid,
    _egMapStash,
    _egMapTierToIndex,
    _egRebuildMapStashGrid,
} from '../endgame/endgame-map-stash.js';

export {
    MASS_SELL_RARITIES,
    _buildItemChipHTML,
    _chipCounter,
    _chipRegistry,
    _defaultMassSellKeep,
    _handleChipMouseDown,
    _isProtectedFromMassSell,
    _loadMassSellSettings,
    _massSellCounts,
    _massSellKeep,
    _massSellKeepUnique,
    _massSellMinItemLevel,
    _massSellMinReqLevel,
    _normaliseMassSellKeep,
    _saveMassSellSettings,
    _showItemLevel,
    _showTooltipFromChip,
} from './hub-mass-sell.js';

export {
    _buildHubInfoTooltipHTML,
    _buildTopbarHTML,
    _exportBuildSnapshot,
    _hideHubInfoTooltip,
    _showHubInfoTooltip,
    _showItemLevelToggleTooltip,
    _showMassSellConfigTooltip,
    _showMassSellTooltip,
    _toggleItemLevelDisplay,
    _updateItemLevelToggleButton,
    _updatePassiveTreeButton,
} from './hub-topbar.js';

export {
    _healCurrencyItem,
    _healEssenceItem,
    _pendingHandMigrationToast,
    _showHandMigrationToast,
    saveHubState,
} from './hub-save.js';

export {
    _bindStatTooltips,
    _buildStatDescTooltipHTML,
    _renderStatsList,
} from './hub-stats-panel.js';

export {
    _buildUniqueGridHTML,
    _onUniqueCellClick,
    _onUniqueCellEnter,
    _onUniqueCellLeave,
    _onUniqueCellMove,
    _onUniqueCellRightClick,
    _renderUniqueStash,
    _switchStashTab,
} from './hub-unique-ui.js';

export { _injectMassSellStyles } from './hub-mass-sell-styles.js';

export {
    _cancelMassSellConfirm,
    _closeMassSellModal,
    _confirmMassSell,
    _ensureMassSellModal,
    _executeMassSell,
    _massSellRenderStaticText,
    _openMassSellModal,
    _rarityColor,
    _itemRarityLabel,
    _renderMassSellModalContent,
    _requestMassSell,
    _saveMassSellModal,
    _updateMassSellPreview,
} from './hub-mass-sell-modal.js';
