//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: topbar, item-level toggle, mass-sell/hub info tooltips.
// The toggle flips _egShowItemLevel (declared in hub-mass-sell.js) through
// that module's write-through globalThis accessor, then persists it.

import { t } from '../translation/translations.js';
import { _egRenderEquipSlots } from './endgame-hub.js';
import { _egSaveMassSellSettings, _egShowItemLevel } from './hub-mass-sell.js';
import { _egRebuildInventoryGrid } from './hub-stash.js';
import { STATE } from '../state.js';



//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY: FULL SCREEN---------------------------
//------------------------------------------------------------------------

// Builds the top navigation bar with back button and hub title.
export function _egBuildTopbarHTML() {
    return `
<div class="eg-topbar">
    <button class="eg-back-btn back-btn" onclick="safeGoBackFromHub()">${t('btn_back')}</button>
    <span class="eg-topbar-title">${t('eg_char_sheet_title')}</span>
    <button class="eg-level-btn" id="eg-btn-passive-tree"
         onclick="showPassiveTree('screen-endgame-hub')">🌿 ${t('scr_probability_tree')}</button>
    <button class="eg-level-btn" id="eg-btn-atlas"
         onclick="showEndgameAtlas('showEndgameHub')">🗺 ${t('eg_atlas_title')}</button>
    <button class="eg-level-btn" id="eg-btn-gate"
         onclick="showEndgameGate('showEndgameHub')">🎲 ${t('mg_gate_badge')}</button>
    <button class="eg-info-btn" id="eg-hub-info-btn" aria-label="Info"
         onmouseenter="_egShowHubInfoTooltip(event)"
         onmousemove="moveGameTooltip(event)"
         onmouseleave="_egHideHubInfoTooltip()">?</button>
</div>`;
}

// Updates the Probability Tree button highlight based on available points.
// Shows a golden border/glow and a yellow point count when there are unspent
// Convergence Points - mirrors renderLSPassiveTreeButton and _renderTopBarTreePoints.
export function _egUpdatePassiveTreeButton() {
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
export function _egToggleItemLevelDisplay() {
    globalThis._egShowItemLevel = !globalThis._egShowItemLevel;
    _egSaveMassSellSettings(); // persists the toggle
    _egRebuildInventoryGrid(); // re-render stash
    _egRenderEquipSlots(); // re-render equipped items
    _egUpdateItemLevelToggleButton();
}

// Updates the toggle button text/icon to match current state.
export function _egUpdateItemLevelToggleButton() {
    const btn = document.getElementById('eg-toggle-ilvl-btn');
    if (btn) {
        btn.innerHTML = `${_egShowItemLevel ? '🔢' : '👤'} ${t(_egShowItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}`;
    }
}

// Tooltip for the item level toggle button.
export function _egShowItemLevelToggleTooltip(e) {
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
    globalThis.showGameTooltip(html, e);
}

// Tooltip for the mass-sell FILTER button (custom game tooltip instead of native title).
export function _egShowMassSellConfigTooltip(e) {
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
    globalThis.showGameTooltip(html, e);
}

// Tooltip for the MASS SELL button (custom game tooltip instead of native title).
export function _egShowMassSellTooltip(e) {
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
    globalThis.showGameTooltip(html, e);
}


// Builds the tooltip body shown when hovering the "?" info button in the
// top-right of the Nexus of Worlds screen. Uses the shared game tooltip
// engine (tooltips-hud.js) - not the browser title tooltip.
export function _egBuildHubInfoTooltipHTML() {
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

export function _egShowHubInfoTooltip(e) {
    globalThis.showGameTooltip(_egBuildHubInfoTooltipHTML(), e);
    // The controls list needs much more width than the shared default -
    // without this the tooltip becomes very narrow and very tall.
    // eg-controls-tip is exclusive to this tooltip; the engine's inline
    // max-width only yields to it via the !important rule in CSS.
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.classList.add('eg-wide-tip', 'eg-controls-tip');
}

// Hides the hub info tooltip AND drops the widened-tip classes again so
// other tooltips on the shared engine keep their default width.
export function _egHideHubInfoTooltip() {
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.classList.remove('eg-wide-tip', 'eg-controls-tip');
    globalThis.hideGameTooltip();
}
