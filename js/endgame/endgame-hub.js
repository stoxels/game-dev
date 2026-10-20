//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// ENDGAME HUB SCREEN - facade module. Handles the Endgame Hub UI:
//   - Character panel with paperdoll equipment slots and stats
//   - Currency strip (Runes & Orbs row) + full-width equipment stash
//   - Floating item tooltip on mouseover (+ Alt-hold compare tooltip)
//   - Drag-and-drop is handled in endgame-hub-drag-and-drop.js
//   - The Probability Gate (map device + map stash) - see endgame-gate.js
//
// Phase 4 split: stash/currency/map-stash/mass-sell/topbar/load/modal
// now live in their own modules and are re-exported below unchanged.
// This file keeps screen assembly, render orchestration, overlay control
// and the stats panel.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
import { Audio_Manager } from '../audio/audio.js';
import { cur } from '../state.js';

try { Object.defineProperty(globalThis, '_tooltipItem', { get() { return _tooltipItem; }, set(v) { _tooltipItem = v; }, configurable: true }); } catch (e) {}

import { buildClassHUD } from '../classes/class-hud.js';
import { _getPlayerMaxMana, updateClassHUDManaBar } from '../classes/class-mana.js';
import { switchScreen } from '../screens/screens.js';
import { renderSkillHotbar } from '../skills/skill-hotbar.js';
import { pauseTimer, resumeTimer } from '../timer/timer.js';
import { LANG, t } from '../translation/translations.js';
import { GAME_ART } from './endgame-art.js';
import { _showHubTooltip } from '../loot/loot-currency-tooltip.js';
import { _onPause, _onResume } from '../combat/encounter-tick-support.js';
import { _getEncounterBaseLevel, _getTarget, _renderPanel } from '../combat/encounter.js';
import { _buildEssenceTabHTML, _renderEssenceStash } from '../loot/loot-essences-render.js';
import { _egRenderMapSlot, _egRenderMapStash } from './endgame-gate.js';
import { _flushRunLootToStash } from '../combat/combat-grid-pickups-loot.js';
import { _bindDragEvents, _renderCurrencyCell } from './endgame-hub-drag-and-drop.js';
import { _buildTooltipBodyHTML, _clearTooltip } from './endgame-hub-tooltips.js';
import { _ensureUniqueStash, _getUniqueCount, _isUniqueCollected, _moveUniqueToInventory, _updateUniqueTabBadge } from './endgame-hub-uniques.js';
import { LEVELING_CONFIG, _getPlayerLevel, _renderLevelHUD } from './endgame-leveling.js';
import { _egMapPlayerLifeMult } from './endgame-map-launch.js';
import { showEndgameNexus } from './endgame-nexus.js';
import { PLAYER_STATS, _buildGroupedStats, _calcAccuracyMissChance, _calcArmourReductionPct, _calcEvasionDodgeChance, _computePlayerStats } from './endgame-player-stats.js';
import { _isItemBlocked } from '../loot/loot-requirements.js';
import { CURRENCY_COLS, CURRENCY_ROWS, _buildCraftingBenchSlotHTML, _currencyDefForId, _currencyIdForSlot, _currencyStash } from '../loot/hub-currency.js';
import { _pendingHandMigrationToast, _showHandMigrationToast } from './hub-save.js';
import { _cancelMassSellConfirm, _closeMassSellModal, _injectMassSellStyles } from './hub-mass-sell-modal.js';
import { _buildItemChipHTML, _showItemLevel } from './hub-mass-sell.js';
import { INV_COLS, _ensureInvRows, _equipped, _getInvCapacity, _getInvRows, _inventory, _stashTab } from './hub-stash.js';
import { _buildTopbarHTML, _updateItemLevelToggleButton, _updatePassiveTreeButton } from './hub-topbar.js';
import { UNIQUE_ITEMS } from '../loot/unique-item-data.js';


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
//     screen - see endgame-gate.js
//------------------------------------------------------------------------


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


// Tooltip state: tracks which item is currently being previewed in the tooltip panel
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
     ondragover="egDragOver(event)"
     ondrop="egDropOnEquip(event, '${slot.id}')"
     ondragleave="egDragLeave(event)">
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
     ondragover="egDragOver(event)"
     ondrop="egDropOnCurrency(event, ${row}, ${col})"
     ondragleave="egDragLeave(event)">
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
     ondragover="egDragOver(event)"
     ondrop="egDropOnInv(event, ${row}, ${col})"
     ondragleave="egDragLeave(event)">
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
        <span>${t('eg_stash_label')}</span>
        <div id="sx-stash-info" class="sx-stash-info" aria-live="polite"></div>
        <div class="sx-stash-actions">
            <button class="sx-stash-btn sx-stash-btn-config" id="sx-toggle-ilvl-btn"
                     onclick="_toggleItemLevelDisplay()"
                     onmouseenter="_showItemLevelToggleTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">${_showItemLevel ? '🔢' : '👤'} ${t(_showItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}</button>
            <button class="sx-stash-btn sx-stash-btn-config" id="sx-loot-filter-btn"
                     onclick="_openLootFilterModal()"
                     onmouseenter="_showLootFilterTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">⚗ ${t('eg_loot_filter_btn')}</button>
            <button class="sx-stash-btn sx-stash-btn-config" onclick="_openMassSellModal()"
                     onmouseenter="_showMassSellConfigTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">⚙ ${t('eg_mass_sell_config')}</button>
            <button class="sx-stash-btn sx-stash-btn-sell" onclick="_requestMassSell()"
                     onmouseenter="_showMassSellTooltip(event)"
                     onmousemove="moveGameTooltip(event)"
                     onmouseleave="hideGameTooltip()">⚒ ${t('eg_mass_sell_btn')}</button>
        </div>
    </div>
    <div class="sx-stash-tabs" id="sx-stash-tabs">
        <button class="sx-stash-tab ${invActive ? 'active' : ''}" id="sx-tab-inventory" data-tab="inventory" onclick="_switchStashTab('inventory')">${t('eg_tab_inventory') || 'INVENTORY'}</button>
        <button class="sx-stash-tab ${uniqActive ? 'active' : ''}" id="sx-tab-uniques" data-tab="uniques" onclick="_switchStashTab('uniques')">${t('eg_tab_uniques') || 'UNIQUES'} <span class="sx-tab-count">${foundUniques}/${totalUniques}</span></button>
    </div>
    <div class="sx-stash-tab-body ${invActive ? 'active' : ''}" id="sx-stash-tab-inventory">
        <div class="sx-inv-grid" id="sx-inv-grid" style="grid-template-columns: repeat(${INV_COLS}, 1fr);">
            ${_buildInventoryGridHTML()}
        </div>
    </div>
    <div class="sx-stash-tab-body ${uniqActive ? 'active' : ''}" id="sx-stash-tab-uniques">
        <div class="sx-unique-hint">${t('eg_unique_stash_hint')}</div>
        <div class="sx-unique-count" id="sx-unique-count">${t('eg_uniques_collected').replace('{found}', foundUniques).replace('{total}', totalUniques)}</div>
        <div class="sx-unique-grid" id="sx-unique-grid" data-eg-dropzone="uniques" ondragover="egDragOver(event)" ondragleave="egDragLeave(event)">
            ${_buildUniqueGridHTML()}
        </div>
    </div>
</div>`;
}
export function _switchStashTab(tab) {
    Audio_Manager.playSFX('ui_tab_switch');
    globalThis._stashTab = (tab === 'uniques' ? 'uniques' : 'inventory');
    const invBody = document.getElementById('sx-stash-tab-inventory');
    const uniqBody = document.getElementById('sx-stash-tab-uniques');
    const invTab = document.getElementById('sx-tab-inventory');
    const uniqTab = document.getElementById('sx-tab-uniques');
    if (invBody) invBody.classList.toggle('active', _stashTab === 'inventory');
    if (uniqBody) uniqBody.classList.toggle('active', _stashTab === 'uniques');
    if (invTab) invTab.classList.toggle('active', _stashTab === 'inventory');
    if (uniqTab) uniqTab.classList.toggle('active', _stashTab === 'uniques');
    if (_stashTab === 'uniques') _renderUniqueStash();
    else _renderInventory();
}
export function _buildUniqueGridHTML() {
    if (typeof UNIQUE_ITEMS === 'undefined' || !Array.isArray(UNIQUE_ITEMS)) return '<div class="sx-unique-empty">No uniques defined</div>';
    let html = '';
    for (let i = 0; i < UNIQUE_ITEMS.length; i++) {
        const def = UNIQUE_ITEMS[i];
        const uid = def.uniqueId;
        const collected = _isUniqueCollected(uid);
        const count = _getUniqueCount(uid);
        const items = collected ? (globalThis._uniqueStash[uid] || []) : [];
        const displayName = (LANG === 'de' ? (def.nameDe || def.nameEn) : def.nameEn) || uid;
        let cellCls;
        if (!collected) cellCls = 'locked';
        else if (count === 0) cellCls = 'collected-empty';
        else cellCls = 'collected';
        const icon = collected ? (items[0] ? (items[0].icon || def.icon || '❓') : (def.icon || '❓')) : '?';
        const countBadge = count > 1 ? `<span class="sx-unique-count-badge">${t('eg_unique_count').replace('{n}', count)}</span>` : (count === 0 && collected ? `<span class="sx-unique-count-badge" style="background:#888;">0</span>` : '');
        const lockedOverlay = !collected ? '<span class="sx-unique-lock">?</span>' : '';
        html += `<div class="sx-unique-cell ${cellCls}" data-unique-id="${uid}" data-uid="${uid}" data-eg-dropzone="uniques"
            ondragover="egDragOver(event)" ondragleave="egDragLeave(event)"
            onmouseenter="_onUniqueCellEnter('${uid}', event)"
            onmousemove="_onUniqueCellMove('${uid}', event)"
            onmouseleave="_onUniqueCellLeave('${uid}', event)"
            oncontextmenu="_onUniqueCellRightClick(event, '${uid}')"
            onclick="_onUniqueCellClick(event, '${uid}')">
            <div class="sx-unique-cell-name">${displayName}</div>
            <div class="sx-unique-cell-icon">${GAME_ART ? GAME_ART.html('item', uid, icon) : icon}${countBadge}${lockedOverlay}</div>
        </div>`;
    }
    return html;
}
export function _renderUniqueStash() {
    const grid = document.getElementById('sx-unique-grid');
    if (!grid) return;
    grid.innerHTML = _buildUniqueGridHTML();
    const total = (typeof UNIQUE_ITEMS !== 'undefined' ? UNIQUE_ITEMS.length : 0);
    const found = (globalThis._uniqueCollected ? globalThis._uniqueCollected.size : 0);
    const cntEl = document.getElementById('sx-unique-count');
    if (cntEl) cntEl.textContent = t('eg_uniques_collected').replace('{found}', found).replace('{total}', total);
    _updateUniqueTabBadge();
}
export function _onUniqueCellClick(e, uid) {
    // left click does nothing except ensure tooltip stays; right-click handles transfer via contextmenu
    if (e.button === 0) e.preventDefault();
}
export function _onUniqueCellRightClick(e, uid) {
    e.preventDefault();
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    if (!arr || arr.length === 0) {
        if (typeof _showStashInfo === 'function') _showStashInfo(t('eg_unique_not_collected'), {type:'info'});
        return;
    }
    _clearTooltip();
    globalThis.hideGameTooltip();
    const ok = _moveUniqueToInventory(uid);
    if (ok) _renderInventory();
}
export function _onUniqueCellEnter(uid, e) {
    _ensureUniqueStash();
    const arr = globalThis._uniqueStash[uid];
    // Ensure previous multi-tip inline overrides don't leak into next tooltip
    const prevTip = document.getElementById('ghud-floating-tip');
    if (prevTip && prevTip.classList.contains('sx-unique-multi')) {
        prevTip.classList.remove('sx-unique-multi','sx-wide-tip');
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
        const isCollected = _isUniqueCollected(uid);
        const def = (typeof UNIQUE_ITEMS !== 'undefined') ? UNIQUE_ITEMS.find(u=>u.uniqueId===uid) : null;
        const name = def ? ((LANG==='de'?def.nameDe:def.nameEn)||def.nameEn) : uid;
        const icon = def ? (def.icon || '?') : '?';
        if (isCollected) {
            const html = `<div class="sx-tt-frame" style="--tt-border:#c8a84b;"><div class="sx-tt-header"><div class="sx-tt-icon" style="opacity:0.6;">${GAME_ART ? GAME_ART.html('item', uid, icon) : icon}</div><div class="sx-tt-name" style="color:#c8a84b;">${name}</div><div class="sx-tt-rarity-line" style="color:#f5d98a;">${t('eg_unique_in_inventory') || 'Collected - in Inventory (0 remaining)'}</div></div><div class="sx-tt-section"><div class="sx-tt-desc" style="opacity:.8;">${t('eg_unique_empty_hint') || 'All copies moved to Inventory. Drag one back or loot another.'}</div></div></div>`;
            globalThis.showGameTooltip(html, e);
        } else {
            const html = `<div class="sx-tt-frame" style="--tt-border:#555;"><div class="sx-tt-header"><div class="sx-tt-icon">?</div><div class="sx-tt-name" style="color:#888;">${name}</div><div class="sx-tt-rarity-line" style="color:#888;">${t('eg_unique_not_collected')}</div></div><div class="sx-tt-section"><div class="sx-tt-desc" style="opacity:.6;">${t('eg_unique_stash_hint')}</div></div></div>`;
            globalThis.showGameTooltip(html, e);
        }
        return;
    }
    // Build multi-tooltip: container with flex row of each variant's full tooltip body
    if (arr.length === 1) {
        _showHubTooltip(arr[0], e);
        // append right-click hint
        // we could inject after, but just let normal tooltip; right-click hint via extra line handled in custom?
        // add hint via stash info? Instead append to tooltip DOM after show
        setTimeout(()=>{
            const tip=document.getElementById('ghud-floating-tip');
            if(tip && !tip.querySelector('.sx-unique-tip-hint')){
                const h=document.createElement('div');
                h.className='sx-unique-tip-hint';
                h.textContent=t('eg_unique_right_click_hint');
                h.style.cssText='margin-top:6px;padding-top:4px;border-top:1px dashed #444;font-size:9px;color:#f5d98a;text-align:center;';
                tip.appendChild(h);
            }
        },10);
        return;
    }
    // Multiple copies: build side-by-side frames – scrollable, stays open while hovering tip
    const frames = arr.map(it=>_buildTooltipBodyHTML(it)).join('');
    const header = `<div style="text-align:center;font-family:var(--PX);font-size:9px;color:#f5d98a;margin-bottom:6px;letter-spacing:1px;">${t('eg_unique_tooltip_count').replace('{n}', arr.length)} - ${t('eg_unique_right_click_hint')}</div>`;
    const html = `<div class="sx-unique-multi-tip">${header}<div class="sx-unique-multi-row">${frames}</div></div>`;
    globalThis.showGameTooltip(html, e);
    const tip=document.getElementById('ghud-floating-tip');
    if(tip){
        tip.classList.add('sx-wide-tip','sx-unique-multi');
        tip.style.maxWidth = '96vw';
        tip.style.width = 'auto';
        tip.style.maxHeight = '85vh';
        tip.style.overflowY = 'auto';
        tip.style.pointerEvents = 'auto';
        // keep tip open when mouse moves from cell onto the tip itself
        tip.onmouseenter = null;
        tip.onmouseleave = (ev) => {
            // hide when leaving the tip unless re-entering the originating cell
            const stillOverCell = document.querySelector(`.sx-unique-cell[data-uid="${uid}"]:hover`);
            if (!stillOverCell) {
                globalThis.hideGameTooltip();
                tip.classList.remove('sx-wide-tip','sx-unique-multi');
                tip.style.maxWidth = '380px';
                tip.style.width = '';
                tip.style.maxHeight = '';
                tip.style.overflowY = '';
                tip.style.pointerEvents = 'none';
                tip.onmouseenter = null;
                tip.onmouseleave = null;
            }
        };
        if (typeof moveGameTooltip === 'function') globalThis.moveGameTooltip(e);
        else if (typeof _calcGameTooltipPos === 'function') {
            const pos = globalThis._calcGameTooltipPos(e, tip.offsetWidth, tip.offsetHeight);
            tip.style.left = pos.x + 'px';
            tip.style.top = pos.y + 'px';
        }
    }
}
export function _onUniqueCellMove(uid, e){
    // support both signatures: (uid, e) and (e)
    if (e === undefined) { e = uid; uid = null; }
    const tip=document.getElementById('ghud-floating-tip');
    if (tip && tip.classList.contains('sx-unique-multi')) return; // multi tip is pinned, don't follow mouse
    if(typeof moveGameTooltip==='function') globalThis.moveGameTooltip(e);
}
export function _onUniqueCellLeave(uid, e){
    if (e === undefined && typeof uid === 'object' && uid && uid.type) { e = uid; uid = null; }
    const tip=document.getElementById('ghud-floating-tip');
    if(tip && tip.classList.contains('sx-unique-multi')) {
        // don't hide immediately – let tip's own mouseleave handle it, or delay to allow moving onto tip
        setTimeout(()=>{
            const tipNow=document.getElementById('ghud-floating-tip');
            if(!tipNow) return;
            const overTip = tipNow.matches(':hover');
            const overCell = uid ? document.querySelector(`.sx-unique-cell[data-uid="${uid}"]:hover`) : null;
            if (!overTip && !overCell) {
                globalThis.hideGameTooltip();
                tipNow.classList.remove('sx-wide-tip','sx-unique-multi');
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
    globalThis.hideGameTooltip();
    if(tip) {
        tip.classList.remove('sx-wide-tip','sx-unique-multi');
        tip.style.maxWidth = '380px';
        tip.style.width = '';
        tip.style.maxHeight = '';
        tip.style.overflowY = '';
        tip.style.pointerEvents = 'none';
        tip.onmouseenter = null;
        tip.onmouseleave = null;
    }
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
                ${typeof _buildEssenceTabHTML === 'function' ? _buildEssenceTabHTML() : ''}
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

// Re-renders a single cell in the currency stash grid.
// Empty assigned slots show a faint placeholder icon and dashed border.
// _renderCurrencyCell is defined ONCE, in
// endgame-hub-drag-and-drop.js: it renders a currency-stash cell into BOTH
// the hub grid (sx-currency-cell-*) and the gate grid
// (eg-gate-currency-cell-*) using drag-and-drop chips. The earlier copy
// that lived here (hub-only, non-dnd chips) was removed in 2026-09 - the
// drag-and-drop version already won via load order, so behaviour is
// unchanged; hub's stash render loop below calls the shared global.
// Re-renders the entire currency stash grid.
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
// Moved to endgame-gate.js - the map stash and map device live on the
// separate Probability Gate screen. _renderAll() still calls
// _egRenderMapSlot() / _egRenderMapStash(); they no-op while the gate
// screen is not in the DOM.


//------------------------------------------------------------------------
//-------------------RENDER: FULL REFRESH---------------------------------
//------------------------------------------------------------------------


// Re-renders the three aggregated stat regions of the character panel:
//   offense - upper left corner block, defense - upper right corner block,
//   puzzle  - center column between the paperdoll slots.
// Reads live gear via _computePlayerStats() / _buildGroupedStats()
// (endgame-player-stats.js) so it always reflects whatever is equipped.
export function _renderStatsList() {
    const stats = _computePlayerStats();
    const groups = _buildGroupedStats(stats);

    const emptyHTML = `
<div class="sx-stat-row sx-stat-placeholder">
    <span class="sx-stat-name">${t('eg_no_stats_yet')}</span>
</div>`;

    function renderSide(listId, categories) {
        const el = document.getElementById(listId);
        if (!el) return;
        if (!categories.length) {
            el.innerHTML = emptyHTML;
            return;
        }
        el.innerHTML = categories.map(cat => `
<div class="sx-stats-category">
    <div class="sx-stats-category-title">${cat.title}</div>
    ${cat.lines.map(line => `
    <div class="sx-stat-row" data-desc-key="${line.descKey}" data-desc-label="${line.label}"${line.resTotal != null ? ` data-res-total="${line.resTotal}" data-res-cap="${line.resCap}" data-res-penalty="${line.resPenalty || 0}"` : ''}>
        <span class="sx-stat-name">${line.label}</span>
        <span class="sx-stat-value">${line.value}</span>
    </div>`).join('')}
</div>`).join('');
    }

    renderSide('sx-offense-stats-list', groups.offense);
    renderSide('sx-defense-stats-list', groups.defense);
    renderSide('sx-stats-list', groups.puzzle);
    _bindStatTooltips();
}


// Builds the hover tooltip body for a single stat row: stat name as the
// title plus its mechanic description. For armour and evasion the live
// combat values (damage reduction / dodge chance) are appended, using the
// exact formulas from endgame-player-stats.js. For resistance rows the
// uncapped gear total and the effective cap are revealed (the row itself
// shows the capped value).
export function _buildStatDescTooltipHTML(descKey, label, row) {
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
                + (capped ? ` - ${t('eg_statdesc_res_capped').replace('{c}', cap.toFixed(0))}` : '')
                + `</span>`;
            const penalty = parseFloat(row.dataset.resPenalty) || 0;
            if (penalty > 0) {
                html += `<br><span style="color:#ff8a6a">${t('eg_statdesc_res_penalty').replace('{p}', penalty.toFixed(0))}</span>`;
            }
        }
        const stats = _computePlayerStats();
        // Armour/evasion live values are measured against a representative
        // monster: the current target's level, else the encounter's base
        // level - same convention as the accuracy tooltip below.
        const hasLevelCtx = typeof _getTarget === 'function' && typeof _getEncounterBaseLevel === 'function';
        const refMonsterLevel = hasLevelCtx
            ? ((_getTarget() && _getTarget().level) || _getEncounterBaseLevel() || 1)
            : 1;
        // Character level for multi-level display (falls back to ref level if unavailable)
        const playerLevel = (typeof _getPlayerLevel === 'function')
            ? Math.max(1, Number(_getPlayerLevel()) || 1)
            : refMonsterLevel;
        const maxLvl = (typeof LEVELING_CONFIG !== 'undefined' && LEVELING_CONFIG.maxLevel)
            ? LEVELING_CONFIG.maxLevel : 100;

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
                const reductionPct = _calcArmourReductionPct(stats.armour, refDamage) * 100;
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
                const dodgeChance = Math.min(75, stats.dodgeChance + _calcEvasionDodgeChance(stats.evasion, lvl));
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
                const missPct = (typeof _calcAccuracyMissChance === 'function')
                    ? _calcAccuracyMissChance(stats.accuracy, lvl) : 0;
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
// makes repeated calls after each _renderStatsList() a no-op).
export function _bindStatTooltips() {
    ['sx-offense-stats-list', 'sx-stats-list', 'sx-defense-stats-list'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.statTipBound) return;
        el.dataset.statTipBound = '1';

        el.addEventListener('mouseover', e => {
            const row = e.target.closest ? e.target.closest('.sx-stat-row') : null;
            if (row && !row.classList.contains('sx-stat-placeholder')) {
                globalThis.showGameTooltip(_buildStatDescTooltipHTML(row.dataset.descKey, row.dataset.descLabel, row), e);
            }
        });
        el.addEventListener('mousemove', e => {
            if (e.target.closest && e.target.closest('.sx-stat-row')) globalThis.moveGameTooltip(e);
        });
        el.addEventListener('mouseout', e => {
            const row = e.target.closest ? e.target.closest('.sx-stat-row') : null;
            if (row && !(e.relatedTarget && row.contains(e.relatedTarget))) globalThis.hideGameTooltip();
        });
    });
}


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
    if (typeof _renderLevelHUD === 'function') _renderLevelHUD();
    _updatePassiveTreeButton();
    const craftingSlot = document.getElementById('sx-crafting-bench-launch-slot');
    if (craftingSlot) {
        const item = typeof _craftingBenchItem !== 'undefined' ? globalThis._craftingBenchItem : null;
        craftingSlot.innerHTML = item ? _buildItemChipHTML(item) : 'Drop equipment here';
    }
}



//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------

// Creates and injects the hub screen DOM element on first call.
// Also binds the delegated drag-start event listener (defined in endgame-hub-drag-and-drop.js).
export function _createScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-hub';
    screen.className = 'screen';
    screen.innerHTML = _buildFullScreenHTML();
    document.body.appendChild(screen);
    _bindDragEvents();  // defined in endgame-hub-drag-and-drop.js
    _injectMassSellStyles();
}

// Ensures the hub screen element exists in the DOM; creates it on first call.
export function ensureEndgameHubScreen() {
    if (!document.getElementById('screen-endgame-hub')) {
        _createScreen();
    }
}

// Transitions to the Endgame Hub screen and fully refreshes all rendered zones.
// This is the main entry point called from elsewhere in the codebase.
export function showEndgameHub() {
    ensureEndgameHubScreen();

    // Use the global screen-switcher if available, otherwise manually show/hide.
    if (typeof switchScreen === 'function') {
        switchScreen('screen-endgame-hub');
    } else {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('screen-endgame-hub').style.display = 'block';
    }

    globalThis._loadHubState();
    _updateItemLevelToggleButton();
    _renderAll();
    _applyOverlayChrome();
    // Flush any deferred legacy-hand-migration notice on the visible sheet.
    try {
        if (_pendingHandMigrationToast && _pendingHandMigrationToast.length
            && typeof _showHandMigrationToast === 'function') {
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
// both ways on every showEndgameHub).
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
        if (typeof pauseTimer === 'function') pauseTimer();
        globalThis._gamePaused = true;
        if (typeof _onPause === 'function') { try { _onPause(); } catch (e) {} }
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
        if (typeof _onResume === 'function') { try { _onResume(); } catch (e) {} }
        if (typeof resumeTimer === 'function') resumeTimer();
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
    try { if (typeof _flushRunLootToStash === 'function') _flushRunLootToStash(); } catch (e) {}
    showEndgameHub();
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
        if (typeof _computePlayerStats !== 'function') return;
        if (typeof cur === 'undefined' || !cur) return;
        const stats = _computePlayerStats() || {};
        // ── HP ──
        if (typeof playerMaxHP !== 'undefined' && typeof playerCurrentHP !== 'undefined') {
            const baseHP = (typeof PLAYER_STATS !== 'undefined') ? PLAYER_STATS.baseHP : 100;
            let newMax = baseHP + (Number(stats.health) || 0);
            if (Number(stats.healthMorePct) > 0) newMax = Math.round(newMax * (1 + stats.healthMorePct / 100));
            if (typeof _egMapPlayerLifeMult === 'function') {
                try { newMax = Math.round(newMax * _egMapPlayerLifeMult()); } catch (e) {}
            }
            if (Number(stats.lifeBecomesOne) > 0) newMax = 1;
            newMax = Math.max(1, newMax);
            const delta = newMax - globalThis.playerMaxHP;
            globalThis.playerMaxHP = newMax;
            if (delta > 0) globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + delta);
            else globalThis.playerCurrentHP = Math.max(0, Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP));
        }
        // ── Mana snapshot (bar itself reads live max, snapshot keeps regen/clamp sane) ──
        if (typeof playerMaxMana !== 'undefined' && typeof playerCurrentMana !== 'undefined'
            && typeof _getPlayerMaxMana === 'function') {
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
    if (typeof switchScreen === 'function') switchScreen(returnScreen);
    if (returnScreen !== 'screen-game') return;   // map / level select: nothing to resync
    _hubShowAvatars();
    // Gear edited mid-puzzle must apply instantly: sync pools first, then
    // repaint every HUD surface that displays damage done/received or pools.
    try { _syncOverlayGearPools(); } catch (e) {}
    try { if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth(); } catch (e) {}
    try { if (typeof updateClassHUDManaBar === 'function') updateClassHUDManaBar(); } catch (e) {}
    try { if (typeof _renderPanel === 'function') _renderPanel(); } catch (e) {}
    try { if (typeof buildClassHUD === 'function') buildClassHUD(); } catch (e) {}
    try { if (typeof renderSkillHotbar === 'function') renderSkillHotbar(); } catch (e) {}
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
// closes the mass-sell overlay (confirm step steps back to filter view).
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const m = document.getElementById('sx-mass-sell-modal');
        if (m && m.classList.contains('show')) {
            // If confirm sub-panel is visible, first step back to the filter view.
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
} from './hub-map-stash.js';

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
    _cancelMassSellConfirm,
    _closeMassSellModal,
    _confirmMassSell,
    _ensureMassSellModal,
    _executeMassSell,
    _injectMassSellStyles,
    _massSellRenderStaticText,
    _openMassSellModal,
    _rarityColor,
    _itemRarityLabel,
    _renderMassSellModalContent,
    _requestMassSell,
    _saveMassSellModal,
    _updateMassSellPreview,
} from './hub-mass-sell-modal.js';
