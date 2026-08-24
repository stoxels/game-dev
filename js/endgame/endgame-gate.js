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

// Assembles the gate panel: map device on top, map stash grid below.
function _egBuildGatePanelHTML() {
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
//-------------------HTML ASSEMBLY: FULL SCREEN---------------------------
//------------------------------------------------------------------------

// Builds the top navigation bar with back button and gate title.
function _egBuildGateTopbarHTML() {
    return `
<div class="eg-topbar">
    <button class="eg-back-btn" onclick="showEndgameTestHub()">${t('btn_back')}</button>
    <span class="eg-topbar-title">${t('mg_gate_badge')}</span>
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
//-------------------SCREEN BOOTSTRAP-------------------------------------
//------------------------------------------------------------------------

// Creates and injects the gate screen DOM element on first call.
function _egCreateGateScreen() {
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
    _egClearTooltip();
}
