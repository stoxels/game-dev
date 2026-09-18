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
import { cur } from '../state.js';

try { Object.defineProperty(globalThis, '_egTooltipItem', { get() { return _egTooltipItem; }, set(v) { _egTooltipItem = v; }, configurable: true }); } catch (e) {}

import { buildClassHUD } from '../classes/class-hud.js';
import { _getPlayerMaxMana, updateClassHUDManaBar } from '../classes/class-mana.js';
import { switchScreen } from '../screens/screens.js';
import { renderSkillHotbar } from '../skills/skill-hotbar.js';
import { pauseTimer, resumeTimer } from '../timer/timer.js';
import { LANG, t } from '../translation/translations.js';
import { EG_ART } from './endgame-art.js';
import { _egShowTooltip } from '../loot/loot-currency.js';
import { _egOnPause, _egOnResume } from '../combat/encounter-tick.js';
import { _egGetEncounterBaseLevel, _egGetTarget, _egRenderPanel } from '../combat/encounter.js';
import { _egBuildEssenceTabHTML, _egRenderEssenceStash } from '../loot/loot-essences.js';
import { _egRenderMapSlot, _egRenderMapStash } from './endgame-gate.js';
import { _egFlushRunLootToStash } from '../combat/combat-grid-pickups.js';
import { _egBindDragEvents, _egRenderCurrencyCell } from './endgame-hub-drag-and-drop.js';
import { _egBuildTooltipBodyHTML, _egClearTooltip } from './endgame-hub-tooltips.js';
import { _egEnsureUniqueStash, _egGetUniqueCount, _egIsUniqueCollected, _egMoveUniqueToInventory, _egUpdateUniqueTabBadge } from './endgame-hub-uniques.js';
import { EG_LEVELING_CONFIG, _egGetPlayerLevel, _egRenderLevelHUD } from './endgame-leveling.js';
import { _egMapPlayerLifeMult } from './endgame-map-launch.js';
import { showEndgameNexus } from './endgame-nexus.js';
import { EG_PLAYER_STATS, _egBuildGroupedStats, _egCalcAccuracyMissChance, _egCalcArmourReductionPct, _egCalcEvasionDodgeChance, _egComputePlayerStats } from './endgame-player-stats.js';
import { _egIsItemBlocked } from '../loot/loot-requirements.js';
import { EG_CURRENCY_COLS, EG_CURRENCY_ROWS, _egBuildCraftingBenchSlotHTML, _egCurrencyDefForId, _egCurrencyIdForSlot, _egCurrencyStash } from '../loot/hub-currency.js';
import { _egPendingHandMigrationToast, _egShowHandMigrationToast } from './hub-save.js';
import { _egCancelMassSellConfirm, _egCloseMassSellModal, _egInjectMassSellStyles } from './hub-mass-sell-modal.js';
import { _egBuildItemChipHTML, _egShowItemLevel } from './hub-mass-sell.js';
import { EG_INV_COLS, _egEnsureInvRows, _egEquipped, _egGetInvCapacity, _egGetInvRows, _egInventory, _egStashTab } from './hub-stash.js';
import { _egBuildTopbarHTML, _egUpdateItemLevelToggleButton, _egUpdatePassiveTreeButton } from './hub-topbar.js';
import { EG_UNIQUE_ITEMS } from '../loot/unique-item-data.js';


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
export const EG_EQUIP_SLOTS = [
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
let _egTooltipItem = null;





//------------------------------------------------------------------------
//-------------------HTML HELPERS: EQUIPMENT PANEL------------------------
//------------------------------------------------------------------------

// Builds a single equipment slot div (the outer drop-target container).
export function _egBuildEquipSlotHTML(slot) {
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
export function _egBuildEquipColHTML(col) {
    return EG_EQUIP_SLOTS
        .filter(s => s.col === col)
        .map(s => _egBuildEquipSlotHTML(s))
        .join('');
}

// Assembles the full character panel: offense stats (upper left), left slots,
// center puzzle stats, right slots, defense stats (upper right), weapon row.
export function _egBuildCharPanelHTML() {
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
export function _egBuildCurrencyCellHTML(row, col) {
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
export function _egBuildCurrencyGridHTML() {
    let html = '';
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            html += _egBuildCurrencyCellHTML(r, c);
        }
    }
    return html;
}

// Hub: left-side Orbs & Shards panel (PoE currency tab style)
export function _egBuildCurrencyPanelHTML() {
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
export function _egBuildCurrencyStripHTML() {
    return `
<div class="eg-currency-strip">
    <div class="eg-panel-label">${t('eg_runes_orbs')}</div>
    <div class="eg-currency-row" id="eg-currency-grid"
         style="grid-template-columns: repeat(${EG_CURRENCY_COLS}, 1fr);">
        ${_egBuildCurrencyGridHTML()}
    </div>
</div>`;
}

// Hover helpers for empty assigned slots - show placeholder name without needing an item.
export function _egOnCurrencyCellEnter(row, col, e) {
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
        <div class="eg-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_currency')} - ${t('eg_empty_slot_hint') || 'Empty slot'}</div>
    </div>
    <div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:0.85;">${ttDesc}</div></div>
</div>`;
    if (typeof showGameTooltip === 'function') globalThis.showGameTooltip(html, e);
}
export function _egOnCurrencyCellMove(e) {
    // Only move tooltip when hovering an empty assigned slot (occupied chips manage themselves)
    const cell = e.currentTarget || e.target.closest && e.target.closest('.eg-currency-cell');
    if (!cell) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const item = _egCurrencyStash[r] && _egCurrencyStash[r][c];
    if (item) return;
    if (_egCurrencyIdForSlot(r,c) && typeof moveGameTooltip === 'function') globalThis.moveGameTooltip(e);
}
export function _egOnCurrencyCellLeave() {
    // Only clear if we were showing an empty-slot tooltip (occupied chip leave already handled)
    if (typeof hideGameTooltip === 'function') globalThis.hideGameTooltip();
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: EQUIPMENT STASH (BOTTOM)---------------
//------------------------------------------------------------------------

// Builds a single equipment stash cell div (drop target).
export function _egBuildInventoryCellHTML(row, col) {
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
export function _egBuildInventoryGridHTML() {
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
export function _egBuildStashPanelHTML() {
    const invActive = _egStashTab !== 'uniques';
    const uniqActive = _egStashTab === 'uniques';
    const totalUniques = (typeof EG_UNIQUE_ITEMS !== 'undefined' ? EG_UNIQUE_ITEMS.length : 0);
    const foundUniques = (globalThis._egUniqueCollected ? globalThis._egUniqueCollected.size : 0);
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
export function _egSwitchStashTab(tab) {
    globalThis._egStashTab = (tab === 'uniques' ? 'uniques' : 'inventory');
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
export function _egBuildUniqueGridHTML() {
    if (typeof EG_UNIQUE_ITEMS === 'undefined' || !Array.isArray(EG_UNIQUE_ITEMS)) return '<div class="eg-unique-empty">No uniques defined</div>';
    let html = '';
    for (let i = 0; i < EG_UNIQUE_ITEMS.length; i++) {
        const def = EG_UNIQUE_ITEMS[i];
        const uid = def.uniqueId;
        const collected = _egIsUniqueCollected(uid);
        const count = _egGetUniqueCount(uid);
        const items = collected ? (globalThis._egUniqueStash[uid] || []) : [];
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
export function _egRenderUniqueStash() {
    const grid = document.getElementById('eg-unique-grid');
    if (!grid) return;
    grid.innerHTML = _egBuildUniqueGridHTML();
    const total = (typeof EG_UNIQUE_ITEMS !== 'undefined' ? EG_UNIQUE_ITEMS.length : 0);
    const found = (globalThis._egUniqueCollected ? globalThis._egUniqueCollected.size : 0);
    const cntEl = document.getElementById('eg-unique-count');
    if (cntEl) cntEl.textContent = t('eg_uniques_collected').replace('{found}', found).replace('{total}', total);
    _egUpdateUniqueTabBadge();
}
export function _egOnUniqueCellClick(e, uid) {
    // left click does nothing except ensure tooltip stays; right-click handles transfer via contextmenu
    if (e.button === 0) e.preventDefault();
}
export function _egOnUniqueCellRightClick(e, uid) {
    e.preventDefault();
    _egEnsureUniqueStash();
    const arr = globalThis._egUniqueStash[uid];
    if (!arr || arr.length === 0) {
        if (typeof _egShowStashInfo === 'function') _egShowStashInfo(t('eg_unique_not_collected'), {type:'info'});
        return;
    }
    _egClearTooltip();
    globalThis.hideGameTooltip();
    const ok = _egMoveUniqueToInventory(uid);
    if (ok) _egRenderInventory();
}
export function _egOnUniqueCellEnter(uid, e) {
    _egEnsureUniqueStash();
    const arr = globalThis._egUniqueStash[uid];
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
            const html = `<div class="eg-tt-frame" style="--tt-border:#c8a84b;"><div class="eg-tt-header"><div class="eg-tt-icon" style="opacity:0.6;">${EG_ART ? EG_ART.html('item', uid, icon) : icon}</div><div class="eg-tt-name" style="color:#c8a84b;">${name}</div><div class="eg-tt-rarity-line" style="color:#f5d98a;">${t('eg_unique_in_inventory') || 'Collected - in Inventory (0 remaining)'}</div></div><div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:.8;">${t('eg_unique_empty_hint') || 'All copies moved to Inventory. Drag one back or loot another.'}</div></div></div>`;
            globalThis.showGameTooltip(html, e);
        } else {
            const html = `<div class="eg-tt-frame" style="--tt-border:#555;"><div class="eg-tt-header"><div class="eg-tt-icon">?</div><div class="eg-tt-name" style="color:#888;">${name}</div><div class="eg-tt-rarity-line" style="color:#888;">${t('eg_unique_not_collected')}</div></div><div class="eg-tt-section"><div class="eg-tt-desc" style="opacity:.6;">${t('eg_unique_stash_hint')}</div></div></div>`;
            globalThis.showGameTooltip(html, e);
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
    const header = `<div style="text-align:center;font-family:var(--PX);font-size:9px;color:#f5d98a;margin-bottom:6px;letter-spacing:1px;">${t('eg_unique_tooltip_count').replace('{n}', arr.length)} - ${t('eg_unique_right_click_hint')}</div>`;
    const html = `<div class="eg-unique-multi-tip">${header}<div class="eg-unique-multi-row">${frames}</div></div>`;
    globalThis.showGameTooltip(html, e);
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
                globalThis.hideGameTooltip();
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
        if (typeof moveGameTooltip === 'function') globalThis.moveGameTooltip(e);
        else if (typeof _calcGameTooltipPos === 'function') {
            const pos = globalThis._calcGameTooltipPos(e, tip.offsetWidth, tip.offsetHeight);
            tip.style.left = pos.x + 'px';
            tip.style.top = pos.y + 'px';
        }
    }
}
export function _egOnUniqueCellMove(uid, e){
    // support both signatures: (uid, e) and (e)
    if (e === undefined) { e = uid; uid = null; }
    const tip=document.getElementById('ghud-floating-tip');
    if (tip && tip.classList.contains('eg-unique-multi')) return; // multi tip is pinned, don't follow mouse
    if(typeof moveGameTooltip==='function') globalThis.moveGameTooltip(e);
}
export function _egOnUniqueCellLeave(uid, e){
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
                globalThis.hideGameTooltip();
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
    globalThis.hideGameTooltip();
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

export let _egStashInfoTimer = null;

export function _egEnsureStashInfoEl() {
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

export function _egShowStashInfo(message, opts = {}) {
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

export function _egClearStashInfo() {
    const el = document.getElementById('eg-stash-info');
    if (el) el.classList.remove('show');
    if (_egStashInfoTimer) { clearTimeout(_egStashInfoTimer); _egStashInfoTimer = null; }
}


// Assembles the complete hub screen layout:
// topbar → [ Orbs & Shards (left) | character panel (center) | Essence (right) ] → stash.
// The Orbs & Shards tab uses fixed PoE-style slots; the item tooltip is a floating mouseover.
export function _egBuildFullScreenHTML() {
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
export function _egRenderEquipSlot(slotId) {
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
export function _egRenderEquipSlots() {
    EG_EQUIP_SLOTS.forEach(slot => _egRenderEquipSlot(slot.id));
}


//------------------------------------------------------------------------
//-------------------RENDER: MAIN STASH-----------------------------------
//------------------------------------------------------------------------

// Full-cell rarity tint used by the main stash - each occupied cell is
// filled with its item's rarity color (instead of only a chip glow).
// Items with unmet stat requirements override the rarity tint with red.
export const EG_RARITY_CELL_FILL = {
    common: 'rgba(122, 122, 122, 0.40)',
    uncommon: 'rgba(46, 204, 113, 0.35)',
    rare: 'rgba(52, 152, 219, 0.40)',
    epic: 'rgba(155, 89, 182, 0.45)',
    legendary: 'rgba(243, 156, 18, 0.45)',
    cursed: 'rgba(231, 76, 60, 0.40)',
    artifact: 'rgba(241, 196, 15, 0.40)',
    currency: 'rgba(181, 146, 72, 0.35)',
};
export const EG_REQ_BLOCKED_FILL = 'rgba(231, 76, 60, 0.45)';

// Cell fill color for an item: red when its requirements cannot currently
// be met, otherwise its rarity color.
export function _egGetCellFill(item) {
    if (item && _egIsItemBlocked(item)) return EG_REQ_BLOCKED_FILL;
    return EG_RARITY_CELL_FILL[item && item.rarity] || EG_RARITY_CELL_FILL.common;
}

// Re-renders a single cell in the main stash grid.
export function _egRenderInventoryCell(row, col) {
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
export function _egRenderInventory() {
    for (let r = 0; r < _egGetInvRows(); r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            _egRenderInventoryCell(r, c);
        }
    }
}

// Updates the stash item-count label (if present in the DOM).
export function _egUpdateInvCount() {
    const el = document.getElementById('eg-inv-count');
    if (!el) return;
    let used = 0;
    _egInventory.forEach(row => row.forEach(cell => { if (cell) used++; }));
    // Unlimited stash: show used / capacity (capacity grows with rows) - keeps the familiar counter
    el.textContent = `${used} / ${_egGetInvCapacity()}`;
}


//------------------------------------------------------------------------
//-------------------RENDER: CURRENCY STASH-------------------------------
//------------------------------------------------------------------------

// Re-renders a single cell in the currency stash grid.
// Empty assigned slots show a faint placeholder icon and dashed border.
// _egRenderCurrencyCell is defined ONCE, in
// endgame-hub-drag-and-drop.js: it renders a currency-stash cell into BOTH
// the hub grid (eg-currency-cell-*) and the gate grid
// (eg-gate-currency-cell-*) using drag-and-drop chips. The earlier copy
// that lived here (hub-only, non-dnd chips) was removed in 2026-09 - the
// drag-and-drop version already won via load order, so behaviour is
// unchanged; hub's stash render loop below calls the shared global.
// Re-renders the entire currency stash grid.
export function _egRenderCurrencyStash() {
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            _egRenderCurrencyCell(r, c);
        }
    }
}


//------------------------------------------------------------------------
//-------------------RENDER: MAP STASH / MAP DEVICE-----------------------
//------------------------------------------------------------------------
// Moved to endgame-gate.js - the map stash and map device live on the
// separate Probability Gate screen. _egRenderAll() still calls
// _egRenderMapSlot() / _egRenderMapStash(); they no-op while the gate
// screen is not in the DOM.


//------------------------------------------------------------------------
//-------------------RENDER: FULL REFRESH---------------------------------
//------------------------------------------------------------------------


// Re-renders the three aggregated stat regions of the character panel:
//   offense - upper left corner block, defense - upper right corner block,
//   puzzle  - center column between the paperdoll slots.
// Reads live gear via _egComputePlayerStats() / _egBuildGroupedStats()
// (endgame-player-stats.js) so it always reflects whatever is equipped.
export function _egRenderStatsList() {
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
export function _egBuildStatDescTooltipHTML(descKey, label, row) {
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
        }
        const stats = _egComputePlayerStats();
        // Armour/evasion live values are measured against a representative
        // monster: the current target's level, else the encounter's base
        // level - same convention as the accuracy tooltip below.
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
export function _egBindStatTooltips() {
    ['eg-offense-stats-list', 'eg-stats-list', 'eg-defense-stats-list'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.statTipBound) return;
        el.dataset.statTipBound = '1';

        el.addEventListener('mouseover', e => {
            const row = e.target.closest ? e.target.closest('.eg-stat-row') : null;
            if (row && !row.classList.contains('eg-stat-placeholder')) {
                globalThis.showGameTooltip(_egBuildStatDescTooltipHTML(row.dataset.descKey, row.dataset.descLabel, row), e);
            }
        });
        el.addEventListener('mousemove', e => {
            if (e.target.closest && e.target.closest('.eg-stat-row')) globalThis.moveGameTooltip(e);
        });
        el.addEventListener('mouseout', e => {
            const row = e.target.closest ? e.target.closest('.eg-stat-row') : null;
            if (row && !(e.relatedTarget && row.contains(e.relatedTarget))) globalThis.hideGameTooltip();
        });
    });
}


// Re-renders the launcher slot for the crafting bench (in the currency panel).
export function _egUpdateCraftingBenchLauncherSlot() {
    const craftingSlot = document.getElementById('eg-crafting-bench-launch-slot');
    if (craftingSlot) {
        const item = typeof _egCraftingBenchItem !== 'undefined' ? globalThis._egCraftingBenchItem : null;
        craftingSlot.innerHTML = item ? _egBuildItemChipHTML(item) : 'Drop equipment here';
    }
}

// Triggers a full re-render of every zone in the hub.
// Call this after any state-changing operation.
export function _egRenderAll() {
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
        const item = typeof _egCraftingBenchItem !== 'undefined' ? globalThis._egCraftingBenchItem : null;
        craftingSlot.innerHTML = item ? _egBuildItemChipHTML(item) : 'Drop equipment here';
    }
}



//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------

// Creates and injects the hub screen DOM element on first call.
// Also binds the delegated drag-start event listener (defined in endgame-hub-drag-and-drop.js).
export function _egCreateScreen() {
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-hub';
    screen.className = 'screen';
    screen.innerHTML = _egBuildFullScreenHTML();
    document.body.appendChild(screen);
    _egBindDragEvents();  // defined in endgame-hub-drag-and-drop.js
    _egInjectMassSellStyles();
}

// Ensures the hub screen element exists in the DOM; creates it on first call.
export function ensureEndgameHubScreen() {
    if (!document.getElementById('screen-endgame-hub')) {
        _egCreateScreen();
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

    globalThis._egLoadHubState();
    _egUpdateItemLevelToggleButton();
    _egRenderAll();
    _egApplyOverlayChrome();
    // Flush any deferred legacy-hand-migration notice on the visible sheet.
    try {
        if (_egPendingHandMigrationToast && _egPendingHandMigrationToast.length
            && typeof _egShowHandMigrationToast === 'function') {
            _egShowHandMigrationToast(_egPendingHandMigrationToast);
        }
    } catch (e) {}
    globalThis._egPendingHandMigrationToast = null;
    _egClearTooltip();
}

// Navigates back from the character sheet & inventory screen.
// The Nexus of Worlds screen is the parent of all endgame screens,
// so the back button returns there - EXCEPT in game-overlay mode (B
// keybind mid-puzzle), where it returns to the running puzzle instead:
// the Nexus path would strand the paused run with no way back.
export function safeGoBackFromHub() {
    if (_egHubGameOverlay) { closeHubToGame(); return; }
    showEndgameNexus();
}

export let _egHubGameOverlay = false;
// True only if THIS overlay open paused the game (a pause menu may already
// have been up when B was pressed - then pause state is left untouched).
export let _egHubOverlayPaused = false;

// True while the hub is open as an overlay over a running puzzle.
export function isHubGameOverlay() {
    return _egHubGameOverlay === true;
}

// Hides the exits to other progression screens (probability tree, atlas of
// statistica, probability gate) while the sheet floats over a paused run -
// leaving them would strand that run with no way back. Restores them on
// every normal open (the hub DOM persists across opens, so this must run
// both ways on every showEndgameHub).
export function _egApplyOverlayChrome() {
    const hide = _egHubGameOverlay === true;
    ['eg-btn-passive-tree', 'eg-btn-atlas', 'eg-btn-gate'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = hide ? 'none' : '';
    });
}

// Silently pauses the run WITHOUT the pause overlay (same recipe the
// tutorial's _tqSetPaused uses). No-op unless a level is actually running.
export function _egHubOverlayPause() {
    _egHubOverlayPaused = false;
    try {
        if (typeof dead !== 'undefined' && globalThis.dead) return;
        if (typeof cur === 'undefined' || !cur) return;
        if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;  // pause menu already up
        if (typeof pauseTimer === 'function') pauseTimer();
        globalThis._gamePaused = true;
        if (typeof _egOnPause === 'function') { try { _egOnPause(); } catch (e) {} }
        _egHubOverlayPaused = true;
    } catch (e) {}
}

// Resumes a run paused by _egHubOverlayPause. Never touches pause state
// owned by someone else (pause menu, tutorial lessons).
export function _egHubOverlayResume() {
    if (!_egHubOverlayPaused) return;
    _egHubOverlayPaused = false;
    try {
        globalThis._gamePaused = false;
        if (typeof _egOnResume === 'function') { try { _egOnResume(); } catch (e) {} }
        if (typeof resumeTimer === 'function') resumeTimer();
    } catch (e) {}
}

export function _egHubHideAvatars() {
    try { if (typeof _hidePlayerAvatarSimple === 'function') globalThis._hidePlayerAvatarSimple(); } catch (e) {}
    try { if (typeof _hidePlayerAvatar === 'function') globalThis._hidePlayerAvatar(); } catch (e) {}
}

export function _egHubShowAvatars() {
    try { if (typeof _showPlayerAvatarSimple === 'function') globalThis._showPlayerAvatarSimple(); } catch (e) {}
    try { if (typeof _showPlayerAvatar === 'function') globalThis._showPlayerAvatar(); } catch (e) {}
}

// Opens the sheet over a running puzzle (B keybind path).
export function openHubFromGame() {
    _egHubGameOverlay = true;
    _egHubOverlayPause();
    _egHubHideAvatars();
    // Safety net: loot claimed this run must already be visible. Claims now
    // stash instantly (see _egCheckLootClaim), but a pending item from an
    // older save or a pre-flush code path would otherwise stay hidden in
    // _egRunLoot until map clear. The flush is idempotent (_egStashed skip).
    try { if (typeof _egFlushRunLootToStash === 'function') _egFlushRunLootToStash(); } catch (e) {}
    showEndgameHub();
}

// Reconciles the live combat pools with the loadout edited in the overlay.
// Damage done/received already read _egComputePlayerStats() live, but the
// snapshotted pools (max HP / max mana / absorption) are only set at level
// start - equipping +health/+mana/+absorption mid-puzzle would otherwise do
// nothing until the next level. Grants max-increases to the current pool
// (PoE-style) and clamps decreases, then refreshes every combat HUD element
// so the new values are visible the instant B closes the sheet.
export function _egSyncOverlayGearPools() {
    try {
        if (typeof _egComputePlayerStats !== 'function') return;
        if (typeof cur === 'undefined' || !cur) return;
        const stats = _egComputePlayerStats() || {};
        // ── HP ──
        if (typeof playerMaxHP !== 'undefined' && typeof playerCurrentHP !== 'undefined') {
            const baseHP = (typeof EG_PLAYER_STATS !== 'undefined') ? EG_PLAYER_STATS.baseHP : 100;
            let newMax = baseHP + (Number(stats.health) || 0);
            if (typeof _egMapPlayerLifeMult === 'function') {
                try { newMax = Math.round(newMax * _egMapPlayerLifeMult()); } catch (e) {}
            }
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
        if (typeof _egPlayerAbsorptionCurrent !== 'undefined') {
            try {
                const newAbs = Math.max(0, Number(stats.absorption) || 0);
                globalThis._egPlayerAbsorptionCurrent = Math.max(0, Math.min(newAbs, globalThis._egPlayerAbsorptionCurrent));
            } catch (e) {}
        }
    } catch (e) {}
}

// Closes the overlay and returns to the running puzzle exactly where it was.
export function closeHubToGame() {
    _egHubGameOverlay = false;
    if (typeof switchScreen === 'function') switchScreen('screen-game');
    _egHubShowAvatars();
    // Gear edited mid-puzzle must apply instantly: sync pools first, then
    // repaint every HUD surface that displays damage done/received or pools.
    try { _egSyncOverlayGearPools(); } catch (e) {}
    try { if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth(); } catch (e) {}
    try { if (typeof updateClassHUDManaBar === 'function') updateClassHUDManaBar(); } catch (e) {}
    try { if (typeof _egRenderPanel === 'function') _egRenderPanel(); } catch (e) {}
    try { if (typeof buildClassHUD === 'function') buildClassHUD(); } catch (e) {}
    try { if (typeof renderSkillHotbar === 'function') renderSkillHotbar(); } catch (e) {}
    _egHubOverlayResume();
}


//------------------------------------------------------------------------
//-------------------DEV / DEBUG UTILITIES--------------------------------
//------------------------------------------------------------------------

// Populates the main stash with a set of mock items for visual debugging.
// Should NOT be called in the production flow.
export function egAddTestItems() {
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

// ---- re-exports from the focused split modules (public surface preserved) ----

export {
    EG_INV_COLS,
    EG_INV_INITIAL_ROWS,
    EG_INV_ROWS,
    _egAddItemToStash,
    _egEnsureInvRows,
    _egEquipped,
    _egExpandStashByOneRow,
    _egFindFreeInvCell,
    _egGetInvCapacity,
    _egGetInvRows,
    _egInventory,
    _egRebuildInventoryGrid,
    _egStashTab,
} from './hub-stash.js';

export {
    EG_CURRENCY_COLS,
    EG_CURRENCY_ROWS,
    EG_CURRENCY_SLOT_MAP,
    EG_CURRENCY_SLOT_REVERSE,
    _egBuildCraftingBenchSlotHTML,
    _egCurrencyDefForId,
    _egCurrencyIdForSlot,
    _egCurrencySlotForId,
    _egCurrencyStash,
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
    EG_MASS_SELL_RARITIES,
    _egBuildItemChipHTML,
    _egChipCounter,
    _egChipRegistry,
    _egDefaultMassSellKeep,
    _egHandleChipMouseDown,
    _egIsProtectedFromMassSell,
    _egLoadMassSellSettings,
    _egMassSellCounts,
    _egMassSellKeep,
    _egMassSellKeepUnique,
    _egMassSellMinItemLevel,
    _egMassSellMinReqLevel,
    _egNormaliseMassSellKeep,
    _egSaveMassSellSettings,
    _egShowItemLevel,
    _egShowTooltipFromChip,
} from './hub-mass-sell.js';

export {
    _egBuildHubInfoTooltipHTML,
    _egBuildTopbarHTML,
    _egHideHubInfoTooltip,
    _egShowHubInfoTooltip,
    _egShowItemLevelToggleTooltip,
    _egShowMassSellConfigTooltip,
    _egShowMassSellTooltip,
    _egToggleItemLevelDisplay,
    _egUpdateItemLevelToggleButton,
    _egUpdatePassiveTreeButton,
} from './hub-topbar.js';

export {
    _egHealCurrencyItem,
    _egHealEssenceItem,
    _egPendingHandMigrationToast,
    _egShowHandMigrationToast,
    egSaveHubState,
} from './hub-save.js';

export {
    _egCancelMassSellConfirm,
    _egCloseMassSellModal,
    _egConfirmMassSell,
    _egEnsureMassSellModal,
    _egExecuteMassSell,
    _egInjectMassSellStyles,
    _egMassSellRenderStaticText,
    _egOpenMassSellModal,
    _egRarityColor,
    _egRarityLabel,
    _egRenderMassSellModalContent,
    _egRequestMassSell,
    _egSaveMassSellModal,
    _egUpdateMassSellPreview,
} from './hub-mass-sell-modal.js';
