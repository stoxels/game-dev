//------------------------------------------------------------------------
//-------------------HUB TOPBAR & TOOLTIPS--------------------------------
//------------------------------------------------------------------------
// The hub's top bar, the item-level display toggle, the build export and the
// sell / info tooltips. The toggle flips _showItemLevel (owned by
// hub-mass-sell.js) through that module's globalThis accessor, then saves.
//------------------------------------------------------------------------

import { t } from '../translation/translations.js';
import { _renderEquipSlots } from './hub.js';
import { _saveMassSellSettings, _showItemLevel } from './hub-mass-sell.js';
import { _rebuildInventoryGrid } from './hub-stash.js';
import { STATE } from '../state.js';


//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY: FULL SCREEN---------------------------
//------------------------------------------------------------------------

// Initial state of the Auto-compare checkbox (also seeds the live flag the
// hover tooltip reads).
function _autoCompareChecked() {
    let on = false;
    try { on = localStorage.getItem('stoxels_auto_compare') === '1'; } catch (e) { on = false; }
    globalThis._autoCompare = on;
    return on;
}

// Builds the top navigation bar with back button and hub title.
export function _buildTopbarHTML() {
    return `
<div class="sx-topbar">
    <button class="sx-back-btn back-btn" onclick="safeGoBackFromHub()">${t('btn_back')}</button>
    <span class="sx-topbar-title">${t('eg_char_sheet_title')}</span>
    <button class="sx-level-btn" id="sx-btn-passive-tree"
         onclick="showPassiveTree('screen-hub')">${t('scr_probability_tree')}</button>
    <button class="sx-level-btn" id="sx-btn-atlas"
         onclick="showEndgameAtlas('showHub')">${t('eg_atlas_title')}</button>
    <button class="sx-level-btn" id="sx-btn-gate"
         onclick="showEndgameGate('showHub')">${t('mg_gate_badge')}</button>
    <button class="sx-level-btn" id="sx-btn-export-build"
         data-tip-t="eg_export_build_tip"
         onclick="_exportBuildSnapshot()">Export build</button>
    <label class="sx-level-btn sx-autocmp-toggle" id="sx-autocmp-toggle"
         data-tip-t="eg_auto_compare_tip"
         style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="sx-autocmp-cb" ${_autoCompareChecked() ? 'checked' : ''}
         onchange="globalThis._autoCompare=this.checked;try{localStorage.setItem('stoxels_auto_compare',this.checked?'1':'0')}catch(e){}">
        ${t('eg_auto_compare')}
    </label>
    <button class="sx-info-btn" id="sx-hub-info-btn" aria-label="Info"
         onmouseenter="_showHubInfoTooltip(event)"
         onmousemove="moveGameTooltip(event)"
         onmouseleave="_hideHubInfoTooltip()">?</button>
</div>`;
}

// Export build: downloads one JSON file with everything the balance tooling
// needs to recreate this character (equipped gear with all rolled mods, the
// allocated passive nodes, spells / hotbar / charms, level and class, and the
// computed character sheet). Read-only - nothing in the save is changed.
export function _exportBuildSnapshot() {
    try {
        const g = globalThis;
        const S = STATE || {};
        const sheet = {};
        const stats = typeof g._computePlayerStats === 'function' ? (g._computePlayerStats() || {}) : {};
        for (const [k, v] of Object.entries(stats)) {
            if (typeof v === 'number' && Number.isFinite(v) && v !== 0) sheet[k] = Math.round(v * 100) / 100;
        }
        const pick = {};
        for (const k of Object.keys(S)) {
            if (/^(class|ascend|skill|charm|player|passive|difficulty|eg(Gold|Level))/i.test(k)
                && k !== 'passiveTreeAllocated' && k !== 'charmInventory') pick[k] = S[k];
        }
        const snapshot = {
            exportVersion: 1,
            exportedAt: new Date().toISOString(),
            game: document.title,
            level: S.playerLevel,
            xp: S.playerXP,
            playerClass: S.playerClass,
            levelsCleared: Array.isArray(S.done) ? S.done.length : null,
            maxHP: g.playerMaxHP,
            maxMana: g.playerMaxMana,
            passiveTreeAllocated: Array.from(S.passiveTreeAllocated || []),
            passiveTreePoints: S.passiveTreePoints,
            charmInventory: S.charmInventory,
            equipped: g._equipped || S.egEquipped || {},
            sheet,
            state: pick,
        };
        const blob = new Blob([JSON.stringify(snapshot, null, 1)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stoxels-build-L${S.playerLevel || 0}-${S.playerClass || 'class'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        if (typeof g.showToast === 'function') g.showToast('📤 Build exported - send me the downloaded file');
    } catch (e) {
        if (typeof globalThis.showToast === 'function') globalThis.showToast('Export failed: ' + (e && e.message));
    }
}

// Updates the Probability Tree button highlight based on available points.
// Shows a golden border/glow and a yellow point count when there are unspent
// Convergence Points - mirrors renderLSPassiveTreeButton and _renderTopBarTreePoints.
export function _updatePassiveTreeButton() {
    const btn = document.getElementById('sx-btn-passive-tree');
    if (!btn) return;
    const points = (STATE && STATE.passiveTreePoints) || 0;
    const hasPoints = points > 0;
    btn.classList.toggle('unspent-points', hasPoints);
    let countEl = document.getElementById('sx-pt-point-count');
    if (!countEl) {
        countEl = document.createElement('span');
        countEl.id = 'sx-pt-point-count';
        btn.appendChild(countEl);
    }
    countEl.textContent = hasPoints ? ` (${points})` : '';
}

// Toggles between showing item level and required character level on item chips.
export function _toggleItemLevelDisplay() {
    globalThis._showItemLevel = !globalThis._showItemLevel;
    _saveMassSellSettings(); // persists the toggle
    _rebuildInventoryGrid(); // re-render stash
    _renderEquipSlots(); // re-render equipped items
    _updateItemLevelToggleButton();
}

// Updates the toggle button text/icon to match current state.
export function _updateItemLevelToggleButton() {
    const btn = document.getElementById('sx-toggle-ilvl-btn');
    if (btn) {
        btn.innerHTML = `${t(_showItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}`;
    }
}

// Tooltip for the item level toggle button.
export function _showItemLevelToggleTooltip(e) {
    const html = `
<div class="sx-tt-frame" style="--tt-border:#c8a84b;">
    <div class="sx-tt-header">
        <div class="sx-tt-icon">${_showItemLevel ? '🔢' : '👤'}</div>
        <div class="sx-tt-name" style="color:#f5d98a;">${t(_showItemLevel ? 'eg_show_req_level' : 'eg_show_item_level')}</div>
    </div>
    <div class="sx-tt-section">
        <div class="sx-tt-desc">${t(_showItemLevel ? 'eg_show_req_level_desc' : 'eg_show_item_level_desc')}</div>
    </div>
</div>`;
    globalThis.showGameTooltip(html, e);
}

// Tooltip for the mass-sell FILTER button (custom game tooltip instead of native title).
export function _showMassSellConfigTooltip(e) {
    const html = `
<div class="sx-tt-frame" style="--tt-border:#c8a84b;">
    <div class="sx-tt-header">
        <div class="sx-tt-icon">⚙</div>
        <div class="sx-tt-name" style="color:#f5d98a;">${t('eg_mass_sell_config')}</div>
    </div>
    <div class="sx-tt-section">
        <div class="sx-tt-desc">${t('eg_mass_sell_config_title')}</div>
    </div>
</div>`;
    globalThis.showGameTooltip(html, e);
}

// Tooltip for the MASS SELL button (custom game tooltip instead of native title).
export function _showMassSellTooltip(e) {
    const html = `
<div class="sx-tt-frame" style="--tt-border:#c8a84b;">
    <div class="sx-tt-header">
        <div class="sx-tt-icon">⚒</div>
        <div class="sx-tt-name" style="color:#f5d98a;">${t('eg_mass_sell_btn')}</div>
    </div>
    <div class="sx-tt-section">
        <div class="sx-tt-desc">${t('eg_mass_sell_title')}</div>
    </div>
</div>`;
    globalThis.showGameTooltip(html, e);
}


// Builds the body of the "?" info tooltip in the hub's top-right corner,
// shown through the shared game tooltip engine.
export function _buildHubInfoTooltipHTML() {
    const line = (key) => {
        const txt = t(key);
        if (!txt) return '';
        return `<div class="sx-tt-mod">${txt}</div>`;
    };
    const head = (key) => `<div class="sx-tt-mod" style="color:#f5d98a;letter-spacing:.12em;font-size:.85em;margin-top:6px;">${t(key)}</div>`;
    return `
<div class="sx-tt-frame" style="--tt-border:#c8a84b;">
    <div class="sx-tt-header">
        <div class="sx-tt-icon">❓</div>
        <div class="sx-tt-name" style="color:#f5d98a;">${t('eg_hub_info_title')}</div>
    </div>
    <div class="sx-tt-section" style="display:flex;flex-direction:column;gap:5px;">
        ${head('eg_hub_info_h_items')}
        ${line('eg_hub_info_dragdrop')}
        ${line('eg_hub_info_quickmove')}
        ${line('eg_hub_info_compare')}
        ${head('eg_hub_info_h_currency')}
        ${line('eg_hub_info_currency')}
        ${line('eg_hub_info_repeat')}
        ${line('eg_hub_info_essence')}
        ${head('eg_hub_info_h_sell')}
        ${line('eg_hub_info_sell')}
        ${line('eg_hub_info_mass_sell')}
        ${head('eg_hub_info_h_craft')}
        ${line('eg_hub_info_craft')}
    </div>
</div>`;
}

// Shows the "?" info tooltip, widened to fit its long controls list.
export function _showHubInfoTooltip(e) {
    globalThis.showGameTooltip(_buildHubInfoTooltipHTML(), e);
    // Widen the tip: the shared default is too narrow for the controls list.
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.classList.add('sx-wide-tip', 'sx-controls-tip');
}

// Hides the hub info tooltip AND drops the widened-tip classes again so
// other tooltips on the shared engine keep their default width.
export function _hideHubInfoTooltip() {
    const tip = document.getElementById('ghud-floating-tip');
    if (tip) tip.classList.remove('sx-wide-tip', 'sx-controls-tip');
    globalThis.hideGameTooltip();
}
