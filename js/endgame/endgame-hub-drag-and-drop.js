//------------------------------------------------------------------------
//-------------------ENDGAME HUB DRAG AND DROP---------------------------
//------------------------------------------------------------------------
// Custom mouse-based drag-and-drop system for the Endgame Hub.
//
// Responsibilities:
//   - Item pick-up via mousedown, movement via mousemove, drop via mouseup
//   - Floating ghost icon that follows the cursor during a drag
//   - Type-safe zone validation (equip / map / currency must go to matching zones)
//   - Slot-type validation (items only fit their matching paperdoll slot)
//   - Currency stack merging (same currency id dropped on same id → merge counts)
//   - Right-click quick-equip (stash → char slot) and quick-unequip (char slot → stash)
//   - Stat requirement gating on every equip/unequip path (endgame-requirements.js)
//   - Escape key to cancel a drag and return the item to its origin
//   - CSS style injection for drag visuals (dragover highlight, reject flash, ghost)
//
// Dependencies (must be loaded before this file):
//   endgame-hub.js — exposes all _eg* state variables and render helpers
//
// Entry point:
//   Call initEndgameHubDnD() once after the hub screen has been created.
//   (showEndgameHub() calls this via _egBindDragEvents())
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

// Maps each inventory zone type to the set of item categories it accepts.
// A drop is rejected if the dragged item's category is not in the target zone's set.
const EG_ZONE_CATEGORIES = {
    equip: new Set(['equip']),     // main stash + paperdoll char slots
    map: new Set(['map']),       // map device orb slot + map stash
    currency: new Set(['currency']), // runes & orbs strip
    essence: new Set(['essence']),   // essence tab grid
};

// Maps each paperdoll slot id to the item slotType it accepts.
// Multi-slot types (rings, earrings) share the same slotType value.
// weapon1 only takes melee weapons; weapon2 is shield-exclusive.
const EG_SLOT_ACCEPTS = {
    head: 'head',
    shoulders: 'shoulders',
    cloak: 'cloak',
    chest: 'chest',
    bracers: 'bracers',
    gloves: 'gloves',
    belt: 'belt',
    pants: 'pants',
    boots: 'boots',
    amulet: 'amulet',
    earring1: 'earring',
    earring2: 'earring',
    ring1: 'ring',
    ring2: 'ring',
    arcane: 'arcane',
    talisman: 'talisman',
    weapon1: 'weapon',
    weapon2: 'shield',
    ranged: 'ranged',
};


//------------------------------------------------------------------------
//-------------------DRAG SESSION STATE----------------------------------
//------------------------------------------------------------------------

// Tracks the full state of the current drag operation.
// Reset to its default shape by _dndReset() at the end of every drop or cancel.
let _dnd = {
    active: false,  // true while an item is being carried
    item: null,   // full item object being dragged
    sourceZone: null,   // 'inv' | 'equip' | 'map' | 'currency' | 'mapstash'
    sourceRow: null,   // grid row of the origin cell (null for slot-based zones)
    sourceCol: null,   // grid col of the origin cell (null for slot-based zones)
    sourceSlot: null,   // slot id of the origin char equip slot (null for grid zones)
};

// The floating ghost div that follows the cursor during a drag.
let _dndGhost = null;


//------------------------------------------------------------------------
//-------------------DRAG SESSION HELPERS---------------------------------
//------------------------------------------------------------------------

// Resets the drag session to its inactive default state.
// Always called as the final step of a drop or a cancel.
function _dndReset() {
    _dnd = {
        active: false,
        item: null,
        sourceZone: null,
        sourceRow: null,
        sourceCol: null,
        sourceSlot: null,
    };
}

// Returns true when the current dragged item is allowed into the given target zone.
function _dndZoneAccepts(targetZone) {
    if (!_dnd.item) return false;
    const itemCat = _dnd.item.category;
    // Equipment may go to both the main stash and the paperdoll char slots.
    if (itemCat === 'equip') return targetZone === 'inv' || targetZone === 'equip';
    // Maps may go to the map device and the map stash.
    if (itemCat === 'map') return targetZone === 'map' || targetZone === 'mapstash';
    // Currency may only go to the currency stash.
    if (itemCat === 'currency') return targetZone === 'currency';
    // Essences may only go to the essence tab grid.
    if (itemCat === 'essence') return targetZone === 'essence';
    return false;
}

// Returns true when the dragged item's slotType matches what the given char slot accepts.
function _dndSlotAcceptsItem(slotId) {
    if (!_dnd.item || _dnd.item.category !== 'equip') return false;
    const required = EG_SLOT_ACCEPTS[slotId];
    return required && required === _dnd.item.slotType;
}


//------------------------------------------------------------------------
//-------------------GHOST CURSOR-----------------------------------------
//------------------------------------------------------------------------

// Creates the floating ghost div and appends it to the body.
// The ghost shows the item icon so the player can see what they are carrying.
// Any existing ghost is destroyed first to ensure there is never more than one.
function _dndCreateGhost(item) {
    _dndDestroyGhost();

    _dndGhost = document.createElement('div');
    _dndGhost.id = 'eg-dnd-ghost';
    _dndGhost.className = `eg-dnd-ghost eg-rarity-${item.rarity || 'common'}`;
    _dndGhost.innerHTML = `<span class="eg-dnd-ghost-icon">${EG_ART.html('item', item.baseId, item.icon || '📦')}</span>`;
    _dndGhost.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        font-size: 1.6rem;
        background: var(--eg-ghost-bg, rgba(10,10,30,0.85));
        border: 2px solid var(--eg-ghost-border, #7878ff);
        border-radius: 8px;
        padding: 6px 10px;
        box-shadow: 0 0 14px rgba(120,120,255,0.55);
        transition: opacity 0.05s;
        user-select: none;
        white-space: nowrap;
    `;
    document.body.appendChild(_dndGhost);
}

// Moves the ghost to the given screen coordinates.
// Called on every mousemove event while a drag is active.
function _dndMoveGhost(clientX, clientY) {
    if (!_dndGhost) return;
    _dndGhost.style.left = clientX + 'px';
    _dndGhost.style.top = clientY + 'px';
}

// Removes the ghost element from the DOM and clears the reference.
function _dndDestroyGhost() {
    if (_dndGhost) {
        _dndGhost.remove();
        _dndGhost = null;
    }
}


//------------------------------------------------------------------------
//-------------------PICK-UP LOGIC (mousedown)----------------------------
//------------------------------------------------------------------------

// Resolves which zone and position a chip belongs to by walking up the DOM.
// Returns a partial _dnd descriptor, or null if no recognised zone was found.
// Currency and map-stash cells must be checked before generic inv-cells
// because they share the eg-inv-cell class.
function _dndResolvePickupZone(chip) {
    const currencyCell = chip.closest('.eg-currency-cell');
    const essenceCell = chip.closest('.eg-essence-cell');
    const mapStashCell = chip.closest('.eg-map-stash-cell');
    const equipSlot = chip.closest('.eg-equip-slot');
    const mapSlot = chip.closest('#eg-map-slot');
    const invCell = chip.closest('.eg-inv-cell');

    if (currencyCell) {
        const r = +currencyCell.dataset.row, c = +currencyCell.dataset.col;
        return {
            sourceZone: 'currency', sourceRow: r, sourceCol: c, sourceSlot: null,
            item: _egCurrencyStash[r][c],
            clearFn: () => { _egCurrencyStash[r][c] = null; _egRenderCurrencyCell(r, c); }
        };
    }
    if (essenceCell) {
        const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
        return {
            sourceZone: 'essence', sourceRow: r, sourceCol: c, sourceSlot: null,
            item: _egEssenceStash[r][c],
            clearFn: () => { _egEssenceStash[r][c] = null; _egRenderEssenceCell(r, c); }
        };
    }
    if (mapStashCell) {
        const r = +mapStashCell.dataset.row, c = +mapStashCell.dataset.col;
        return {
            sourceZone: 'mapstash', sourceRow: r, sourceCol: c, sourceSlot: null,
            item: _egMapStash[r][c],
            clearFn: () => { _egMapStash[r][c] = null; _egRenderMapStashCell(r, c); }
        };
    }
    if (mapSlot) {
        return {
            sourceZone: 'map', sourceRow: null, sourceCol: null, sourceSlot: null,
            item: _egMapSlotItem,
            clearFn: () => { _egMapSlotItem = null; _egRenderMapSlot(); }
        };
    }
    if (equipSlot) {
        const slotId = equipSlot.dataset.slotId;
        return {
            sourceZone: 'equip', sourceRow: null, sourceCol: null, sourceSlot: slotId,
            item: _egEquipped[slotId] || null,
            clearFn: () => { delete _egEquipped[slotId]; _egRenderEquipSlot(slotId); }
        };
    }
    if (invCell) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        return {
            sourceZone: 'inv', sourceRow: r, sourceCol: c, sourceSlot: null,
            item: _egInventory[r][c],
            clearFn: () => { _egInventory[r][c] = null; _egRenderInventoryCell(r, c); }
        };
    }
    return null;
}

// Starts a drag session from the clicked item chip.
// Clears the item from its origin cell immediately and spawns the ghost.
function _dndPickUp(e, chip) {
    if (e.button !== 0) return; // left-click only

    const resolved = _dndResolvePickupZone(chip);
    if (!resolved || !resolved.item) return; // empty cell or unrecognised zone

    e.preventDefault();

    // The origin chip is about to be removed — close any open hover tooltip.
    _egClearTooltip();

    _dnd = {
        active: true,
        item: resolved.item,
        sourceZone: resolved.sourceZone,
        sourceRow: resolved.sourceRow,
        sourceCol: resolved.sourceCol,
        sourceSlot: resolved.sourceSlot,
    };

    resolved.clearFn(); // remove item from its origin cell
    _dndCreateGhost(resolved.item);
    _dndMoveGhost(e.clientX, e.clientY);
}


//------------------------------------------------------------------------
//-------------------DROP HELPERS-----------------------------------------
//------------------------------------------------------------------------

// Writes the dragged item into a grid cell, swapping any displaced occupant
// back to the drag source. renderFn(row, col) re-renders the affected cell.
function _dndDropOnCell(grid, renderFn, row, col) {
    const displaced = grid[row][col];
    grid[row][col] = _dnd.item;
    renderFn(row, col);

    if (displaced) {
        _dndReturnDisplacedToSource(displaced);
    }
}

// Scans a grid for the first empty cell and places the item there.
// Returns true on success, false when the grid is full.
function _dndPlaceInFirstFreeSlot(item, grid, renderFn, rows, cols) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) {
                grid[r][c] = item;
                renderFn(r, c);
                return true;
            }
        }
    }
    console.warn('[DND] No free slot found for displaced item:', item.name);
    return false;
}

// Returns the dragged item to the zone it was picked up from.
// Used when a drop is invalid or the drag is cancelled.
function _dndReturnToSource() {
    if (!_dnd.item) return;
    _dndReturnDisplacedToSource(_dnd.item);
}

// Writes any item back to the current drag session's source location.
// Used both for returning the dragged item on cancel, and for sending
// a displaced item back when a swap happens.
function _dndReturnDisplacedToSource(item) {
    const { sourceZone, sourceRow, sourceCol, sourceSlot } = _dnd;

    if (sourceZone === 'inv') { _egInventory[sourceRow][sourceCol] = item; _egRenderInventoryCell(sourceRow, sourceCol); }
    else if (sourceZone === 'equip') { _egEquipped[sourceSlot] = item; _egRenderEquipSlot(sourceSlot); }
    else if (sourceZone === 'map') { _egMapSlotItem = item; _egRenderMapSlot(); }
    else if (sourceZone === 'currency') { _egCurrencyStash[sourceRow][sourceCol] = item; _egRenderCurrencyCell(sourceRow, sourceCol); }
    else if (sourceZone === 'essence') { _egEssenceStash[sourceRow][sourceCol] = item; _egRenderEssenceCell(sourceRow, sourceCol); }
    else if (sourceZone === 'mapstash') { _egMapStash[sourceRow][sourceCol] = item; _egRenderMapStashCell(sourceRow, sourceCol); }
    else _dndPlaceInFirstFreeSlot(item, _egInventory, _egRenderInventoryCell, EG_INV_ROWS, EG_INV_COLS);
}

// Briefly flashes a red reject animation on the given element,
// then returns the dragged item to its source.
function _dndShowRejectFlash(el) {
    el.classList.add('eg-slot-reject');
    setTimeout(() => el.classList.remove('eg-slot-reject'), 600);
    _dndReturnToSource();
}

// Finalises a completed drop: saves hub state, resets drag session, updates count label.
// Re-renders stash + paperdoll because the new loadout can change which
// items are flagged as requirement-blocked (red cells).
// Also re-renders the map device slot and map stash — those elements live on
// the Probability Gate screen and no-op when that screen is not in the DOM.
function _dndFinalizeDrop() {
    egSaveHubState();
    _dndReset();
    _egUpdateInvCount();
    _egRenderInventory();
    _egRenderEquipSlots();
    _egRenderStatsList();
    _egRenderMapSlot();
    _egRenderMapStash();
}


//------------------------------------------------------------------------
//-------------------DROP LOGIC (mouseup)---------------------------------
//------------------------------------------------------------------------

// Resolves the drop target from the mouse position and routes to the correct
// zone handler. If no valid target is found, the item is returned to its source.
function _dndDrop(e) {
    if (!_dnd.active) return;

    _dndDestroyGhost();

    // elementFromPoint finds what's under the cursor (ghost has pointer-events: none)
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) {
        _dndReturnToSource();
        _dndReset();
        return;
    }

    // Resolve the closest droppable container for each zone type.
    // Pure inv-cells must exclude the more specific currency, essence and
    // map-stash sub-classes.
    const invCell = target.closest('.eg-inv-cell:not(.eg-currency-cell):not(.eg-map-stash-cell):not(.eg-essence-cell)');
    const currencyCell = target.closest('.eg-currency-cell');
    const essenceCell = target.closest('.eg-essence-cell');
    const mapStashCell = target.closest('.eg-map-stash-cell');
    const equipSlotEl = target.closest('.eg-equip-slot');
    const mapSlotEl = target.closest('#eg-map-slot');

    let dropped = false;

    if (currencyCell && _dndZoneAccepts('currency')) {
        dropped = _dndDropOnCurrencyCell(currencyCell);

    } else if (essenceCell && _dndZoneAccepts('essence')) {
        dropped = _dndDropOnEssenceCell(essenceCell);

    } else if (mapStashCell && _dndZoneAccepts('mapstash')) {
        const r = +mapStashCell.dataset.row, c = +mapStashCell.dataset.col;
        _dndDropOnCell(_egMapStash, _egRenderMapStashCell, r, c);
        dropped = true;

    } else if (mapSlotEl && _dndZoneAccepts('map')) {
        const displaced = _egMapSlotItem;
        _egMapSlotItem = _dnd.item;
        _egRenderMapSlot();
        if (displaced) _dndReturnDisplacedToSource(displaced);
        dropped = true;

    } else if (equipSlotEl && _dndZoneAccepts('equip')) {
        dropped = _dndDropOnEquipSlot(equipSlotEl);

    } else if (invCell && _dndZoneAccepts('inv')) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        let blocked = false;
        if (_dnd.sourceZone === 'equip') {
            // Unequipping by dragging a paperdoll item into the stash. If the
            // target cell is occupied, the displaced stash item will be
            // swapped INTO the vacated paperdoll slot — so the simulated final
            // loadout must include it. Checks both stat requirements
            // (endgame-requirements.js) and the slot type of the swapped-in item.
            const displaced = _egInventory[r][c];
            if (displaced && EG_SLOT_ACCEPTS[_dnd.sourceSlot] !== displaced.slotType) {
                blocked = true;
            } else {
                const gate = _egSimulateAndCheck(sim => {
                    delete sim[_dnd.sourceSlot];
                    if (displaced) sim[_dnd.sourceSlot] = displaced;
                });
                if (!gate.ok) {
                    _egShowRequirementsToast('unequip', gate.missing, _dnd.item.name);
                    blocked = true;
                }
            }
            if (blocked) {
                invCell.classList.add('eg-slot-reject');
                setTimeout(() => invCell.classList.remove('eg-slot-reject'), 600);
                // generic return-to-source below restores the carried item
            }
        }
        if (!blocked) {
            _dndDropOnCell(_egInventory, _egRenderInventoryCell, r, c);
            dropped = true;
        }
    }

    if (!dropped) _dndReturnToSource();
    _dndFinalizeDrop();
}

// Handles dropping onto a currency cell.
// If the target already holds the same currency type, the stacks are merged.
// Otherwise a normal swap is performed.
// Returns true when the drop was accepted.
function _dndDropOnCurrencyCell(currencyCell) {
    const r = +currencyCell.dataset.row, c = +currencyCell.dataset.col;
    const existing = _egCurrencyStash[r][c];

    if (existing && existing.id === _dnd.item.id) {
        // Same currency — merge stack counts. Source cell was already cleared in pick-up.
        existing.count = (existing.count || 1) + (_dnd.item.count || 1);
        _egCurrencyStash[r][c] = existing;
        _egRenderCurrencyCell(r, c);
    } else {
        // Different type or empty cell — normal swap.
        _dndDropOnCell(_egCurrencyStash, _egRenderCurrencyCell, r, c);
    }
    return true;
}

// Handles dropping onto an essence tab cell.
// If the target already holds the same essence type, the stacks are merged.
// Otherwise a normal swap is performed.
// Returns true when the drop was accepted.
function _dndDropOnEssenceCell(essenceCell) {
    const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
    const existing = _egEssenceStash[r][c];

    if (existing && existing.id === _dnd.item.id) {
        // Same essence — merge stack counts. Source cell was already cleared in pick-up.
        existing.count = (existing.count || 1) + (_dnd.item.count || 1);
        _egEssenceStash[r][c] = existing;
        _egRenderEssenceCell(r, c);
    } else {
        // Different type or empty cell — normal swap.
        _dndDropOnCell(_egEssenceStash, _egRenderEssenceCell, r, c);
    }
    return true;
}

// Handles dropping onto a paperdoll char equip slot.
// Validates the item's slotType against what the target slot accepts, then
// checks stat requirements against the simulated final loadout (see
// endgame-requirements.js). Shows a reject flash and returns to source when
// either check fails.
// Returns true when the drop was accepted.
function _dndDropOnEquipSlot(equipSlotEl) {
    const slotId = equipSlotEl.dataset.slotId;
    if (!slotId || !_dndSlotAcceptsItem(slotId)) {
        _dndShowRejectFlash(equipSlotEl);
        return false;
    }
    const gate = _egCanEquipInSlot(_dnd.item, slotId);
    if (!gate.ok) {
        _egShowRequirementsToast('equip', gate.missing, _dnd.item);
        _dndShowRejectFlash(equipSlotEl);
        return false;
    }
    const displaced = _egEquipped[slotId] || null;
    _egEquipped[slotId] = _dnd.item;
    _egRenderEquipSlot(slotId);
    if (displaced) _dndReturnDisplacedToSource(displaced);
    return true;
}


//------------------------------------------------------------------------
//-------------------RIGHT-CLICK QUICK-MOVE-------------------------------
//------------------------------------------------------------------------

// Finds the first paperdoll slot that matches the item's slotType.
// Prefers an empty slot; when all matching slots are occupied it prefers the
// first slot whose requirement gate would accept the swap (multi-slot types
// like rings can differ per slot — one swap may break chain dependencies the
// other doesn't). Falls back to the first candidate so callers still get a
// sensible slot for error feedback.
// Returns the slot id string, or null when no matching slot exists.
function _dndFindTargetSlot(item) {
    const candidates = Object.entries(EG_SLOT_ACCEPTS)
        .filter(([, accepts]) => accepts === item.slotType)
        .map(([slotId]) => slotId);
    if (candidates.length === 0) return null;

    const emptySlot = candidates.find(id => !_egEquipped[id]);
    if (emptySlot) return emptySlot;

    const fitting = (typeof _egCanEquipInSlot === 'function')
        ? candidates.find(id => _egCanEquipInSlot(item, id).ok)
        : null;
    return fitting || candidates[0];
}

// Finds the first empty cell in the main equipment stash.
// Returns { r, c } or null when the stash is completely full.
function _dndFirstFreeInvCell() {
    for (let r = 0; r < EG_INV_ROWS; r++) {
        for (let c = 0; c < EG_INV_COLS; c++) {
            if (!_egInventory[r][c]) return { r, c };
        }
    }
    return null;
}

// Right-click on a stash item → instantly equip it to the best matching slot.
// Stat requirements are checked against the simulated final loadout first
// (see endgame-requirements.js). The displaced item (if any) is placed back
// into the source stash cell.
function _dndQuickEquipFromStash(invCell) {
    const r = +invCell.dataset.row, c = +invCell.dataset.col;
    const item = _egInventory[r][c];
    if (!item || item.category !== 'equip') return;

    const slotId = _dndFindTargetSlot(item);
    if (!slotId) return; // no matching paperdoll slot exists for this item type

    const gate = _egCanEquipInSlot(item, slotId);
    if (!gate.ok) {
        _egShowRequirementsToast('equip', gate.missing, item);
        invCell.classList.add('eg-slot-reject');
        setTimeout(() => invCell.classList.remove('eg-slot-reject'), 600);
        return;
    }

    const displaced = _egEquipped[slotId] || null;
    _egEquipped[slotId] = item;
    _egInventory[r][c] = displaced; // displaced may be null — that's fine
    _egRenderEquipSlot(slotId);
    _egRenderInventoryCell(r, c);
    _egRenderInventory();      // blocked-state flags may change loadout-wide
    _egRenderEquipSlots();
    _egUpdateInvCount();
    _egRenderStatsList();
    egSaveHubState();
}

// Right-click on a paperdoll slot item → send it to the first free stash cell.
// Blocked when removing the item would break other equipped items' stat
// requirements (see endgame-requirements.js). If the stash is full a reject
// flash is shown on the stash grid instead.
function _dndQuickUnequipToStash(equipSlotEl) {
    const slotId = equipSlotEl.dataset.slotId;
    const item = _egEquipped[slotId] || null;
    if (!item) return;

    const gate = _egCheckUnequipSlot(slotId);
    if (!gate.ok) {
        _egShowRequirementsToast('unequip', gate.missing, item.name);
        equipSlotEl.classList.add('eg-slot-reject');
        setTimeout(() => equipSlotEl.classList.remove('eg-slot-reject'), 600);
        return;
    }

    const free = _dndFirstFreeInvCell();
    if (!free) {
        // Stash is full — flash the stash grid as visual feedback.
        const stashGrid = document.getElementById('eg-inv-grid');
        if (stashGrid) {
            stashGrid.classList.add('eg-slot-reject');
            setTimeout(() => stashGrid.classList.remove('eg-slot-reject'), 600);
        }
        return;
    }

    delete _egEquipped[slotId];
    _egInventory[free.r][free.c] = item;
    _egRenderEquipSlot(slotId);
    _egRenderInventoryCell(free.r, free.c);
    _egRenderInventory();      // blocked-state flags may change loadout-wide
    _egRenderEquipSlots();
    _egUpdateInvCount();
    _egRenderStatsList();
    egSaveHubState();
}

// Contextmenu handler — dispatches to quick-equip or quick-unequip based on
// which zone the right-clicked chip belongs to. On the Probability Gate
// screen, maps are quick-moved between the map stash and the map device slot.
function _dndHandleRightClick(e) {
    const chip = e.target.closest('.eg-item-chip');
    if (!chip) return;
    const screenEl = _dndChipScreenEl(chip);
    if (!screenEl) return;

    e.preventDefault(); // suppress the browser context menu

    // The chip may move or vanish (quick-equip/unequip) — close its tooltip.
    _egClearTooltip();

    const invCell = chip.closest('.eg-inv-cell:not(.eg-currency-cell):not(.eg-map-stash-cell):not(.eg-essence-cell)');
    const equipSlot = chip.closest('.eg-equip-slot');
    const mapStashCell = chip.closest('.eg-map-stash-cell');
    const mapSlot = chip.closest('#eg-map-slot');

    if (invCell) _dndQuickEquipFromStash(invCell);
    else if (equipSlot) _dndQuickUnequipToStash(equipSlot);
    else if (mapStashCell) _dndQuickLoadMapToDevice(mapStashCell);
    else if (mapSlot) _dndQuickUnloadMapFromDevice();
}


// Right-click on a map in the gate map stash → swap it into the map device
// slot. The displaced device map (if any) returns to the source cell.
function _dndQuickLoadMapToDevice(mapStashCell) {
    if (typeof _egMapStash === 'undefined') return;
    const r = +mapStashCell.dataset.row, c = +mapStashCell.dataset.col;
    const map = _egMapStash[r][c];
    if (!map || map.category !== 'map') return;

    const displaced = _egMapSlotItem || null;
    _egMapSlotItem = map;
    _egMapStash[r][c] = displaced; // may be null — that's fine
    _egRenderMapSlot();
    _egRenderMapStashCell(r, c);
    egSaveHubState();
}

// Right-click on a map in the map device slot → return it to the first free
// map stash cell (or back into the slot when the stash is full).
function _dndQuickUnloadMapFromDevice() {
    if (typeof _egMapSlotItem === 'undefined' || !_egMapSlotItem) return;
    const map = _egMapSlotItem;

    for (let r = 0; r < EG_MAP_STASH_ROWS; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) {
            if (!_egMapStash[r][c]) {
                _egMapStash[r][c] = map;
                _egMapSlotItem = null;
                _egRenderMapSlot();
                _egRenderMapStashCell(r, c);
                egSaveHubState();
                return;
            }
        }
    }
}


//------------------------------------------------------------------------
//-------------------CURRENCY CHIP RENDERER-------------------------------
//------------------------------------------------------------------------

// Builds the chip HTML for a currency cell, adding a stack-count badge
// when the stack count is greater than 1.
function _dndBuildCurrencyChipHTML(item) {
    if (!item) return '';
    const rarityClass = `eg-rarity-${item.rarity || 'currency'}`;
    const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
    const badge = (item.count && item.count > 1)
        ? `<span class="eg-stack-badge">${item.count >= 1000 ? Math.floor(item.count / 1000) + 'k' : item.count}</span>`
        : '';
    return `
<div class="eg-item-chip ${rarityClass}" draggable="true"
     onmouseenter="_egShowTooltip(${itemJson}, event)"
     onmousemove="_egMoveTooltip(event)"
     onmouseleave="_egClearTooltip()">
    <span class="eg-item-chip-icon">${item.icon || '📦'}</span>${badge}
</div>`;
}

// Overrides the base _egRenderCurrencyCell from endgame-hub.js.
// Uses _dndBuildCurrencyChipHTML so stacked currency shows the count badge.
// Renders BOTH twin grids — the hub's runes & orbs row (eg-currency-cell-*)
// and the Probability Gate's runes & orbs row (eg-gate-currency-cell-*) —
// because both read from the same _egCurrencyStash. Whichever screen is
// visible updates; hidden cells no-op. This keeps amounts perfectly in sync
// between hub and gate screens.
// This file loads after endgame-hub.js, so this definition takes precedence.
function _egRenderCurrencyCell(row, col) {
    const item = _egCurrencyStash[row][col];
    const chipHTML = item ? _dndBuildCurrencyChipHTML(item) : '';
    const hubCell = document.getElementById(`eg-currency-cell-${row}-${col}`);
    if (hubCell) hubCell.innerHTML = chipHTML;
    const gateCell = document.getElementById(`eg-gate-currency-cell-${row}-${col}`);
    if (gateCell) gateCell.innerHTML = chipHTML;
}


//------------------------------------------------------------------------
//-------------------TOOLTIP OVERRIDE-------------------------------------
//------------------------------------------------------------------------

// Overrides the base _egShowTooltip from endgame-hub.js.
// Identical behaviour for all item types except currency: appends a "× N"
// count line when the item has a count field greater than 1.
// This file loads after endgame-hub.js, so this definition takes precedence.
// Overrides the base _egShowTooltip from endgame-hub.js.
// Routes equipment items through _egBuildTooltipBodyHTML (full stat block),
// and handles currency stacks with a count line.
// This file loads after endgame-hub.js, so this definition takes precedence.

/*

function _egShowTooltip(item) {
    _egTooltipItem = item;
    const panel = document.getElementById('eg-tooltip-panel-body');
    if (!panel) return;

    if (!item) {
        panel.innerHTML = '<span class="eg-tooltip-empty">Hover over an item to inspect it</span>';
        return;
    }

    // Equipment items — use the full tooltip builder from endgame-hub.js
    if (item.category === 'equip') {
        panel.innerHTML = _egBuildTooltipBodyHTML(item);
        return;
    }

    // Currency stacks and everything else — simple tooltip
    const rarityLabel = item.rarity
        ? item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)
        : 'Common';
    const rarityClass = item.rarity ? `eg-rarity-${item.rarity}` : '';

    const isCurrencyStack = item.category === 'currency' && item.count != null && item.count > 1;
    const nameLine = isCurrencyStack
        ? `<div class="eg-tooltip-name">${item.name || '???'} <span class="eg-tooltip-count">×${item.count}</span></div>`
        : `<div class="eg-tooltip-name">${item.name || '???'}</div>`;

    const statsHTML = item.stats
        ? Object.entries(item.stats).map(([k, v]) => `<div class="eg-tooltip-stat">+${v} ${k}</div>`).join('')
        : '';

    panel.innerHTML = `
<div class="eg-tooltip-item ${rarityClass}">
    <div class="eg-tooltip-icon">${item.icon || '📦'}</div>
    ${nameLine}
    <div class="eg-tooltip-rarity">${rarityLabel}</div>
    ${item.type ? `<div class="eg-tooltip-type">${item.type.toUpperCase()}</div>` : ''}
    ${item.desc ? `<div class="eg-tooltip-desc">${item.desc}</div>` : ''}
    ${statsHTML}
</div>`;
}

*/


//------------------------------------------------------------------------
//-------------------CURRENCY PUBLIC API----------------------------------
//------------------------------------------------------------------------

// Adds `amount` of a currency type to the currency stash.
// Finds an existing cell with the same id and increments its count.
// If no existing stack is found, a new stack is placed in the first free cell
// using `def` as the item definition (required for new types).
// Returns true on success, false if the stash is full and the type is new,
// or if no def was provided for a new type.
function egAddCurrency(id, amount = 1, def = null) {
    // Try to increment an existing stack first.
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            const cell = _egCurrencyStash[r][c];
            if (cell && cell.id === id) {
                cell.count = (cell.count || 1) + amount;
                _egRenderCurrencyCell(r, c);
                return true;
            }
        }
    }

    // No existing stack found — need a def to create one.
    if (!def) {
        console.warn(`[DND] egAddCurrency: no existing stack for "${id}" and no def supplied.`);
        return false;
    }

    // Place a new stack in the first free currency cell.
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            if (!_egCurrencyStash[r][c]) {
                _egCurrencyStash[r][c] = { ...def, id, count: amount };
                _egRenderCurrencyCell(r, c);
                return true;
            }
        }
    }

    console.warn(`[DND] egAddCurrency: currency stash is full, could not add "${id}".`);
    return false;
}


//------------------------------------------------------------------------
//-------------------CSS INJECTION----------------------------------------
//------------------------------------------------------------------------

// Injects the minimal CSS rules required for drag visuals.
// Runs once on init — skips injection if the style tag already exists.
// These rules can be moved to a .css file if preferred.
function _dndInjectStyles() {
    if (document.getElementById('eg-dnd-styles')) return;

    const style = document.createElement('style');
    style.id = 'eg-dnd-styles';
    style.textContent = `
        /* Highlight drop targets while a drag is hovering */
        .eg-inv-cell.eg-dragover,
        .eg-currency-cell.eg-dragover,
        .eg-essence-cell.eg-dragover,
        .eg-map-stash-cell.eg-dragover,
        .eg-equip-slot.eg-dragover,
        #eg-map-slot.eg-dragover {
            outline: 2px solid #a0a0ff;
            background: rgba(100, 100, 255, 0.18);
        }

        /* Red flash when a drop is rejected (wrong slot type) */
        .eg-slot-reject { animation: eg-reject-flash 0.6s ease-out; }
        @keyframes eg-reject-flash {
            0%   { outline: 2px solid #ff4444; background: rgba(255,60,60,0.25); }
            100% { outline: none; background: transparent; }
        }

        /* Prevent text selection while dragging */
        body.eg-dragging * { user-select: none !important; }

        /* Item chip — emoji-only, transparent background, no border or name text */
        .eg-item-chip {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background: transparent;
            border: none;
            padding: 0;
            cursor: grab;
            transition: filter 0.1s, transform 0.1s;
            line-height: 1;
        }
        .eg-item-chip:hover  { filter: brightness(1.25) drop-shadow(0 0 4px rgba(200,200,255,0.6)); }
        .eg-item-chip:hover .eg-item-chip-icon { transform: scale(1.15); }
        .eg-item-chip:active { cursor: grabbing; }

        /* Name label hidden — tooltip panel carries that information */
        .eg-item-chip-name { display: none; }

        /* Emoji sized large enough to fill the cell */
        .eg-item-chip-icon { font-size: 1.45rem; line-height: 1; user-select: none; transition: transform 0.1s; }

        /* Rarity tints via drop-shadow on the emoji itself */
        .eg-item-chip.eg-rarity-uncommon  .eg-item-chip-icon { filter: drop-shadow(0 0 3px #4caf50); }
        .eg-item-chip.eg-rarity-rare      .eg-item-chip-icon { filter: drop-shadow(0 0 4px #5b9cf6); }
        .eg-item-chip.eg-rarity-legendary .eg-item-chip-icon { filter: drop-shadow(0 0 6px #e6a817) drop-shadow(0 0 2px #fff8); }
        .eg-item-chip.eg-rarity-currency  .eg-item-chip-icon { filter: drop-shadow(0 0 3px #b59248); }

        /* Currency count suffix displayed inside the tooltip name line */
        .eg-tooltip-count { font-weight: 700; color: #f5d98a; }

        /* Stack count badge — bottom-right corner of a currency cell */
        .eg-stack-badge {
            position: absolute;
            bottom: 1px;
            right: 2px;
            font-size: 0.6rem;
            font-weight: 700;
            color: #f0e6c0;
            text-shadow: 0 0 3px #000, 0 0 6px #000;
            line-height: 1;
            pointer-events: none;
            user-select: none;
        }

        /* Currency cells need relative positioning so the badge can be absolute */
        .eg-currency-cell { position: relative; }

        /* Ghost rarity glows */
        .eg-dnd-ghost.eg-rarity-legendary { box-shadow: 0 0 18px rgba(230,168,23,0.7)  !important; }
        .eg-dnd-ghost.eg-rarity-rare      { box-shadow: 0 0 12px rgba(91,156,246,0.6)  !important; }
        .eg-dnd-ghost.eg-rarity-uncommon  { box-shadow: 0 0 10px rgba(76,175,80,0.55)  !important; }

        /* Requirement-blocked items: red glow + slightly desaturated icon */
        .eg-item-chip.eg-req-blocked .eg-item-chip-icon {
            filter: grayscale(0.35) drop-shadow(0 0 4px rgba(231,76,60,0.9));
        }
    `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------EVENT BINDING----------------------------------------
//------------------------------------------------------------------------

// Returns the managed screen element (#screen-endgame-hub or
// #screen-endgame-gate) that contains the given chip, or null. The DnD and
// currency systems operate on both screens — they share the same state.
function _dndChipScreenEl(chip) {
    if (!chip || typeof chip.closest !== 'function') return null;
    return chip.closest('#screen-endgame-hub') || chip.closest('#screen-endgame-gate');
}

// Binds the four global listeners that power the custom DnD system.
// Uses capture-phase mousedown so it fires before any chip's own handlers.
// Mousemove and mouseup are on window so the ghost and drop work even if
// the pointer leaves the hub container during a fast drag.
function _dndBindListeners() {
    // Pick-up: left-click on any item chip inside the hub or gate screen.
    document.addEventListener('mousedown', e => {
        const chip = e.target.closest('.eg-item-chip');
        if (!chip || !_dndChipScreenEl(chip)) return;
        _dndPickUp(e, chip);
    }, true);

    // Ghost follows the mouse at all times during an active drag.
    window.addEventListener('mousemove', e => {
        if (_dnd.active) _dndMoveGhost(e.clientX, e.clientY);
    });

    // Drop: release the mouse button anywhere on the window.
    window.addEventListener('mouseup', e => {
        if (_dnd.active) _dndDrop(e);
    });

    // Right-click: quick-equip from stash or quick-unequip from char slot.
    document.addEventListener('contextmenu', _dndHandleRightClick, true);

    // Escape: cancel the current drag and return the item to its origin.
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && _dnd.active) {
            _dndDestroyGhost();
            _dndReturnToSource();
            _dndReset();
        }
    });
}


//------------------------------------------------------------------------
//-------------------INITIALISATION---------------------------------------
//------------------------------------------------------------------------

// Entry point — called once after the hub screen DOM has been created.
function initEndgameHubDnD() {
    _dndInjectStyles();
    _dndBindListeners();
}

// Called from endgame-hub.js _egCreateScreen() — alias so the hub bootstrap
// doesn't need to know whether it's calling the init function or the bind function.
function _egBindDragEvents() {
    initEndgameHubDnD();
}


