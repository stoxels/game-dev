//------------------------------------------------------------------------
//-------------------ENDGAME PROBABILITY GATE SCREEN----------------------
//------------------------------------------------------------------------
// Standalone screen hosting the Probability Gate:
//   - Map Device (orb slot + activate button)
//   - Map stash grid below the device
//
// The underlying state (_egMapSlotItem, _egMapStash) lives in
// endgame-hub.js and is persisted together with the rest of the hub
// state via egSaveHubState() / _egLoadHubState().
//
// Dependencies (must be loaded before this file):
//   endgame-hub.js              — state vars, chip builder, persistence
//   endgame-hub-drag-and-drop.js — drag & drop zone handling
//   tooltips-hud.js             — floating tooltip engine
//
// Entry point:
//   showEndgameGate() — creates the screen on first call and switches to it.
//------------------------------------------------------------------------


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

// Assembles the gate panel: map device on top, then the runes & orbs row
// (synchronized with the hub's currency strip — same _egCurrencyStash data),
// and the map stash grid below.
function _egBuildGatePanelHTML() {
    return `
<div class="eg-panel eg-panel-map">
    <div class="eg-panel-label">${t('mg_gate_badge')}</div>
    ${_egBuildMapDeviceHTML()}
    <div class="eg-gate-currency-section">
        ${_egBuildGateCurrencyStripHTML()}
    </div>
    <div class="eg-map-stash-section">
        <div class="eg-panel-label">${t('eg_maps_label')}</div>
        <div class="eg-map-stash-grid" id="eg-map-stash-grid">
            ${_egBuildMapStashGridHTML()}
        </div>
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML HELPERS: RUNES & ORBS ROW-----------------------
//------------------------------------------------------------------------
// The gate screen has its OWN cell ids (eg-gate-currency-cell-*) because the
// hub screen's cells (eg-currency-cell-*) may coexist in the DOM. Both grids
// read from and write to the SAME _egCurrencyStash, so amounts stay in sync;
// _egRenderCurrencyCell() in endgame-hub-drag-and-drop.js updates both.

// Builds a single runes & orbs cell for the gate screen.
function _egBuildGateCurrencyCellHTML(row, col) {
    return `
<div class="eg-inv-cell eg-currency-cell"
     id="eg-gate-currency-cell-${row}-${col}"
     data-row="${row}" data-col="${col}"
     data-eg-dropzone="currency">
</div>`;
}

// Builds the full gate-side runes & orbs grid.
function _egBuildGateCurrencyGridHTML() {
    let html = '';
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            html += _egBuildGateCurrencyCellHTML(r, c);
        }
    }
    return html;
}

// Assembles the gate-side currency strip panel: label + currency cell grid.
// Uses the shared eg-currency-strip / eg-currency-row classes so it is
// visually identical to the hub's runes & orbs row.
function _egBuildGateCurrencyStripHTML() {
    return `
<div class="eg-currency-strip">
    <div class="eg-panel-label">${t('eg_runes_orbs')}</div>
    <div class="eg-currency-row" id="eg-gate-currency-grid"
         style="grid-template-columns: repeat(${EG_CURRENCY_COLS}, 1fr);">
        ${_egBuildGateCurrencyGridHTML()}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------HTML ASSEMBLY: FULL SCREEN---------------------------
//------------------------------------------------------------------------

// Builds the top navigation bar with back button, gate title and the
// Atlas of Worlds button (opens the PoE-style map overview screen).
function _egBuildGateTopbarHTML() {
    return `
<div class="eg-topbar">
    <button class="eg-back-btn" onclick="showEndgameNexus()">${t('btn_back')}</button>
    <span class="eg-topbar-title">${t('mg_gate_badge')}</span>
    <div class="eg-topbar-right">
        <button class="eg-level-btn" onclick="egOpenMapModsOverlay()">🎲 ${t('eg_mm_button')}</button>
        <button class="eg-level-btn" onclick="showEndgameAtlas()">🗺 ${t('eg_atlas_title')}</button>
    </div>
</div>`;
}

// Assembles the complete gate screen layout:
// topbar → centered map device panel with map stash below.
function _egBuildGateFullScreenHTML() {
    return `
<div class="eg-hub-layout">
    ${_egBuildGateTopbarHTML()}
    <div class="eg-gate-body">
        ${_egBuildGatePanelHTML()}
    </div>
</div>`;
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
// No-ops while the gate screen is not in the DOM.
function _egRenderMapSlot() {
    const inner = document.getElementById('eg-map-slot-inner');
    if (!inner) return;

    inner.innerHTML = _egMapSlotItem
        ? _egBuildItemChipHTML(_egMapSlotItem, 'large')
        : `<span class="eg-map-slot-empty-text">${t('eg_insert_map')}</span>`;

    _egRenderMapDeviceButton();
}


//------------------------------------------------------------------------
//-------------------RENDER: MAP STASH------------------------------------
//------------------------------------------------------------------------

// Re-renders a single cell in the map stash grid.
// No-ops while the gate screen is not in the DOM.
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
//-------------------MAP ACTIVATION PIPELINE------------------------------
//------------------------------------------------------------------------

// Triggers the map run sequence using whatever map is loaded in the device slot.
// Delegates to _egLaunchMapFromDevice() (endgame-map-launch.js), which consumes
// the map, applies its rolled modifiers and launches the encounter chain.
function egActivateMap() {
    if (!_egMapSlotItem) return;
    if (_egChainTransitioning) return;

    if (typeof _egLaunchMapFromDevice === 'function') {
        _egLaunchMapFromDevice(_egMapSlotItem);
        return;
    }

    // Fallback when the launch module isn't loaded: behave like before.
    if (typeof showModal === 'function') {
        showModal(t('eg_map_warning_title'), t('eg_map_activating').replace('{n}', _egMapSlotItem.name));
    } else {
        alert(t('eg_map_alert_activated').replace('{n}', _egMapSlotItem.name));
    }
}


//------------------------------------------------------------------------
//-------------------OVERLAY: MAP MODIFIER EXPLANATIONS-------------------
//------------------------------------------------------------------------
// "Map Modifiers" overlay: opened from the gate topbar. Explains what every
// modifier on the map currently inserted into the Map Device is doing:
// rolled stat line, tier, a plain-language effect description and the
// reward bonuses granted by that modifier.
// Follows the create-once + .show toggle pattern of _egEnsureDeleteModal()
// in endgame-hub.js.

// Category colors — same scheme as the map tooltips (tooltips-hud.js).
const EG_MM_CATEGORY_COLORS = { monster: '#e67e22', player: '#e74c3c', puzzle: '#5b9cf6' };

// Localized category name for a mod's `affects` tag.
function _egMapModsCategoryLabel(affects) {
    const keys = { monster: 'eg_mm_cat_monster', player: 'eg_mm_cat_player', puzzle: 'eg_mm_cat_puzzle' };
    return t(keys[affects] || 'eg_mm_cat_monster');
}

// Fallback stat line for mods whose rolledStats carry no readable label
// (e.g. maps persisted by older versions): rebuilds it from the family table.
function _egMapModFallbackStatLabel(mod) {
    if (!mod) return '';
    const section = mod.type === 'prefix'
        ? EG_MAP_MOD_TABLES.prefixes : EG_MAP_MOD_TABLES.suffixes;
    const family = section && (section[mod.familyId]
        || Object.values(section).find(f => f.id === mod.familyId));
    if (!family) return '';

    const label = (LANG === 'de' && family.labelDe) ? family.labelDe : family.label;
    const value = _egGetActiveMapModValueFor(mod);
    return value > 0 ? label.replace('#', value) : label;
}

// Best-effort rolled-value lookup for an arbitrary mod object.
function _egGetActiveMapModValueFor(mod) {
    if (Array.isArray(mod.rolledStats)) {
        for (const stat of mod.rolledStats) {
            const v = Number(typeof stat === 'number' ? stat : stat && stat.value);
            if (v > 0) return v;
        }
    }
    return Number(mod.value) || 0;
}

// Builds one modifier entry card.
function _egBuildMapModEntryHTML(mod) {
    const affects = (typeof _egMapModAffects === 'function') ? _egMapModAffects(mod.familyId) : 'monster';
    const color = EG_MM_CATEGORY_COLORS[affects] || EG_MM_CATEGORY_COLORS.monster;
    const rewards = _egGetMapModRewards(mod.familyId, mod.tier);

    let statLines = (mod.rolledStats || [])
        .filter(stat => stat && stat.label)
        .map(stat => `<div class="eg-mm-stat" style="color:${color}">${stat.label}</div>`)
        .join('');
    if (!statLines) {
        const fallback = _egMapModFallbackStatLabel(mod);
        if (fallback) {
            statLines = `<div class="eg-mm-stat" style="color:${color}">${fallback}</div>`;
        }
    }

    return `
<div class="eg-mm-entry" style="border-left-color:${color}">
    <div class="eg-mm-entry-head">
        <span class="eg-mm-cat-badge" style="background:${color}">${_egMapModsCategoryLabel(affects)}</span>
        <span class="eg-mm-tier">${t('eg_mm_tier').replace('{n}', mod.tier || 1)}</span>
    </div>
    ${statLines}
    <div class="eg-mm-desc">${t('eg_mm_desc_' + mod.familyId)}</div>
    <div class="eg-mm-rewards">🎁 +${rewards.xp}% ${t('eg_mm_rw_xp')} · +${rewards.quantity}% ${t('eg_mm_rw_quantity')} · +${rewards.rarity}% ${t('eg_mm_rw_rarity')}</div>
</div>`;
}

// Builds the full overlay content from the map currently in the device slot.
function _egBuildMapModsOverlayContentHTML() {
    const map = _egMapSlotItem;

    if (!map) {
        return `<div class="eg-mm-empty">${t('eg_mm_no_map')}</div>`;
    }

    let html = `
<div class="eg-mm-map-head">
    <div class="eg-mm-map-name">🗺️ ${map.name}</div>
    <div class="eg-mm-map-tier">${(t('eg_map_tier_tt') || 'Tier {n}').replace('{n}', map.mapTier ?? 1)}</div>
</div>`;

    const mods = Array.isArray(map.mods) ? map.mods : [];
    if (mods.length === 0) {
        html += `<div class="eg-mm-empty">${t('eg_mm_unmodified')}</div>`;
        return html;
    }

    html += mods.map(_egBuildMapModEntryHTML).join('');
    return html;
}

// Creates the overlay DOM element once (hidden by default).
function _egEnsureMapModsOverlay() {
    if (document.getElementById('eg-map-mods-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'eg-map-mods-overlay';
    overlay.className = 'eg-mm-overlay-bg';
    overlay.innerHTML = `
<div class="eg-mm-overlay-box">
    <div class="eg-mm-overlay-title">${t('eg_mm_title')}</div>
    <div class="eg-mm-overlay-body" id="eg-mm-overlay-body"></div>
    <div class="eg-mm-overlay-btns">
        <button class="eg-mm-close-btn" onclick="egCloseMapModsOverlay()">${t('eg_mm_close')}</button>
    </div>
</div>`;
    document.body.appendChild(overlay);

    // Click on the dark backdrop closes the overlay.
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) egCloseMapModsOverlay();
    });

    _egInjectMapModsOverlayStyles();
}

// Opens the overlay, refreshing its content from the current device slot.
function egOpenMapModsOverlay() {
    _egEnsureMapModsOverlay();
    document.getElementById('eg-mm-overlay-body').innerHTML = _egBuildMapModsOverlayContentHTML();
    document.getElementById('eg-map-mods-overlay').classList.add('show');
}

// Closes the overlay.
function egCloseMapModsOverlay() {
    const overlay = document.getElementById('eg-map-mods-overlay');
    if (overlay) overlay.classList.remove('show');
}

// One-time CSS injection for the overlay (guard id prevents duplicates).
function _egInjectMapModsOverlayStyles() {
    if (document.getElementById('eg-map-mods-overlay-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-map-mods-overlay-styles';
    style.textContent = `
.eg-mm-overlay-bg { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7);
                    z-index:10000; align-items:center; justify-content:center; }
.eg-mm-overlay-bg.show { display:flex; }
.eg-mm-overlay-box { width:min(560px, 92vw); max-height:80vh; display:flex; flex-direction:column;
                     background:#1a1d26; border:1px solid #c8a84b; border-radius:10px;
                     padding:18px 20px; box-shadow:0 8px 40px rgba(0,0,0,0.6); }
.eg-mm-overlay-title { font-size:1.2em; font-weight:bold; color:#c8a84b; text-align:center;
                       margin-bottom:12px; letter-spacing:1px; }
.eg-mm-overlay-body { overflow-y:auto; flex:1; padding-right:4px; }
.eg-mm-map-head { text-align:center; margin-bottom:12px; padding-bottom:10px;
                  border-bottom:1px solid rgba(200,168,75,0.3); }
.eg-mm-map-name { color:#c8a84b; font-weight:bold; font-size:1.05em; }
.eg-mm-map-tier { color:#c8a84b; opacity:.85; font-size:.85em; margin-top:2px; }
.eg-mm-entry { background:rgba(255,255,255,0.04); border-left:3px solid #e67e22;
               border-radius:6px; padding:10px 12px; margin-bottom:10px; }
.eg-mm-entry-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.eg-mm-cat-badge { color:#14161d; font-size:.7em; font-weight:bold; padding:2px 8px;
                   border-radius:10px; letter-spacing:.5px; text-transform:uppercase; }
.eg-mm-tier { color:rgba(255,255,255,0.55); font-size:.8em; }
.eg-mm-stat { font-weight:bold; font-size:.95em; margin-bottom:2px; }
.eg-mm-desc { color:rgba(255,255,255,0.75); font-size:.85em; line-height:1.35; margin-top:5px; }
.eg-mm-rewards { color:#6dbf40; font-size:.78em; margin-top:6px; }
.eg-mm-empty { color:rgba(255,255,255,0.55); text-align:center; padding:24px 8px; font-style:italic; }
.eg-mm-overlay-btns { text-align:center; margin-top:14px; }
.eg-mm-close-btn { background:#c8a84b; color:#14161d; border:none; border-radius:6px;
                   padding:8px 22px; font-weight:bold; cursor:pointer; letter-spacing:1px; }
.eg-mm-close-btn:hover { filter:brightness(1.15); }`;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------

// Creates and injects the gate screen DOM element on first call.
// Also ensures the hub screen exists so its delegated DnD/currency
// listeners (_egBindDragEvents) are active for the gate as well.
function _egCreateGateScreen() {
    if (typeof ensureEndgameHubScreen === 'function') ensureEndgameHubScreen();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-gate';
    screen.className = 'screen';
    screen.innerHTML = _egBuildGateFullScreenHTML();
    document.body.appendChild(screen);
}

// Ensures the gate screen element exists in the DOM; creates it on first call.
function ensureEndgameGateScreen() {
    if (!document.getElementById('screen-endgame-gate')) {
        _egCreateGateScreen();
    }
}

// Transitions to the Probability Gate screen and refreshes all rendered zones.
// This is the main entry point called from elsewhere in the codebase.
function showEndgameGate() {
    ensureEndgameGateScreen();

    if (typeof switchScreen === 'function') {
        switchScreen('screen-endgame-gate');
    } else {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('screen-endgame-gate').style.display = 'block';
    }

    _egLoadHubState();
    _egRenderMapSlot();
    _egRenderMapStash();
    _egRenderCurrencyStash();
    _egClearTooltip();
}
