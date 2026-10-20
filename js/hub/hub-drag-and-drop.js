import { Audio_Manager } from '../audio/audio.js';
import { trackAchStat } from '../achievements/achievements.js';
import { GAME_ART } from '../combat/combat-art.js';
import { _closeCraftingBench, _refreshCraftingBench } from '../loot/loot-crafting-bench-overlay.js';
import { _setCraftingBenchItem } from '../loot/loot-crafting-bench-apply.js';
import { _craftingBenchItem } from '../loot/loot-crafting-bench-state.js';
import { _essenceIdForSlot } from '../loot/loot-essences.js';
import { _renderEssenceCell } from '../loot/loot-essences-render.js';
import { _egRenderMapSlot, _egRenderMapStash, _egRenderMapStashCell, _egSwitchMapStashTier } from '../endgame/endgame-gate.js';
import { _clearTooltip } from './hub-tooltips.js';
import { _addUniqueToCollection, _updateUniqueTabBadge } from './hub-uniques.js';
import { CURRENCY_COLS, INV_COLS, EG_MAP_STASH_COLS, EG_MAP_STASH_ROWS, EG_MAP_TIER_ROMANS, _addItemToStash, _currencyDefForId, _currencyIdForSlot, _currencySlotForId, _currencyStash, _ensureInvRows, _egEnsureMapTierRows, _equipped, _findFreeInvCell, _egFindFreeMapCellForTier, _getInvRows, _egGetMapTierGrid, _inventory, _egMapStash, _renderEquipSlot, _renderEquipSlots, _renderInventory, _renderInventoryCell, _renderStatsList, _renderUniqueStash, _showStashInfo, _stashTab, _switchStashTab, _updateCraftingBenchLauncherSlot, _updateInvCount, saveHubState } from './hub.js';
import { _canEquipInSlot, _checkMoveAllowed, _checkUnequipSlot, _getWeaponHands, _isTwoHandedWeapon, _showRequirementsToast, _tryAutoUnequipOffhandForTwoHander } from '../loot/loot-requirements.js';

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
//   hub.js - exposes all _eg* state variables and render helpers
//
// Entry point:
//   Call initEndgameHubDnD() once after the hub screen has been created.
//   (showEndgameHub() calls this via _bindDragEvents())
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS--------------------------------------------
//------------------------------------------------------------------------

// Maps each inventory zone type to the set of item categories it accepts.
// A drop is rejected if the dragged item's category is not in the target zone's set.
export const ZONE_CATEGORIES = {
    equip: new Set(['equip']),     // main stash + paperdoll char slots
    map: new Set(['map']),       // map device orb slot + map stash
    currency: new Set(['currency']), // runes & orbs strip
    essence: new Set(['essence']),   // essence tab grid
};

// Maps each paperdoll slot id to the item slotType it accepts.
// Multi-slot types (rings, earrings) share the same slotType value.
// weapon1 takes melee weapons (1H or 2H, never shields - so dual shields
// are impossible); weapon2 takes shields or ONE-handed weapons (dual-wield).
// The 1H/2H distinction is enforced hand-aware in _dndSlotAcceptsItem below
// (see _getWeaponHands in endgame-requirements.js), not by this table alone.
export const SLOT_ACCEPTS = {
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
export let _dnd = {
    active: false,  // true while an item is being carried
    item: null,   // full item object being dragged
    sourceZone: null,   // 'inv' | 'equip' | 'map' | 'currency' | 'mapstash'
    sourceRow: null,   // grid row of the origin cell (null for slot-based zones)
    sourceCol: null,   // grid col of the origin cell (null for slot-based zones)
    sourceSlot: null,   // slot id of the origin char equip slot (null for grid zones)
    sourceTier: null,  // for mapstash: the tier tab the item was picked from
};

// The floating ghost div that follows the cursor during a drag.
export let _dndGhost = null;


//------------------------------------------------------------------------
//-------------------DRAG SESSION HELPERS---------------------------------
//------------------------------------------------------------------------

// Resets the drag session to its inactive default state.
// Always called as the final step of a drop or a cancel.
export function _dndReset() {
    _dnd = {
        active: false,
        item: null,
        sourceZone: null,
        sourceRow: null,
        sourceCol: null,
        sourceSlot: null,
        sourceTier: null,
    };
}

// Returns true when the current dragged item is allowed into the given target zone.
export function _dndZoneAccepts(targetZone) {
    if (!_dnd.item) return false;
    const itemCat = _dnd.item.category;
    // Equipment may go to both the main stash and the paperdoll char slots.
    // Uniques can also go to the Uniques collection tab (zone 'uniques')
    if (itemCat === 'equip') {
        if (targetZone === 'uniques') return !!_dnd.item.isUnique;
        return targetZone === 'inv' || targetZone === 'equip' || targetZone === 'crafting';
    }
    // Maps may go to the map device and the map stash.
    if (itemCat === 'map') return targetZone === 'map' || targetZone === 'mapstash';
    // Currency may only go to the currency stash.
    if (itemCat === 'currency') return targetZone === 'currency';
    // Essences may only go to the essence tab grid.
    if (itemCat === 'essence') return targetZone === 'essence';
    return false;
}

// Returns true when the dragged item's slotType matches what the given char slot accepts.
// weapon1: melee weapons only (any hands, never shields).
// weapon2: shields or ONE-handed weapons only (dual-wield off-hand; 2H rejected).
export function _dndSlotAcceptsItem(slotId) {
    if (!_dnd.item || _dnd.item.category !== 'equip') return false;
    if (slotId === 'weapon1') return _dnd.item.slotType === 'weapon';
    if (slotId === 'weapon2') {
        if (_dnd.item.slotType === 'shield') return true;
        if (_dnd.item.slotType !== 'weapon') return false;
        if (typeof _getWeaponHands === 'function') {
            return _getWeaponHands(_dnd.item) === 1;
        }
        return _dnd.item.hands !== 2;
    }
    const required = SLOT_ACCEPTS[slotId];
    return required && required === _dnd.item.slotType;
}


//------------------------------------------------------------------------
//-------------------GHOST CURSOR-----------------------------------------
//------------------------------------------------------------------------

// Creates the floating ghost div and appends it to the body.
// The ghost shows the item icon so the player can see what they are carrying.
// Any existing ghost is destroyed first to ensure there is never more than one.
export function _dndCreateGhost(item) {
    _dndDestroyGhost();

    _dndGhost = document.createElement('div');
    _dndGhost.id = 'sx-dnd-ghost';
    _dndGhost.className = `sx-dnd-ghost sx-rarity-${item.rarity || 'common'}`;
    _dndGhost.innerHTML = `<span class="sx-dnd-ghost-icon">${GAME_ART.html('item', item.baseId, item.icon || '📦')}</span>`;
    _dndGhost.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        font-size: 1.6rem;
        background: var(--sx-ghost-bg, rgba(10,10,30,0.85));
        border: 2px solid var(--sx-ghost-border, #7878ff);
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
export function _dndMoveGhost(clientX, clientY) {
    if (!_dndGhost) return;
    _dndGhost.style.left = clientX + 'px';
    _dndGhost.style.top = clientY + 'px';
}

// Removes the ghost element from the DOM and clears the reference.
export function _dndDestroyGhost() {
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
// because they share the sx-inv-cell class.
export function _dndResolvePickupZone(chip) {
    const currencyCell = chip.closest('.sx-currency-cell');
    const essenceCell = chip.closest('.sx-essence-cell');
    const mapStashCell = chip.closest('.eg-map-stash-cell');
    const equipSlot = chip.closest('.sx-equip-slot');
    const mapSlot = chip.closest('#eg-map-slot');
    const craftingSlot = chip.closest('[data-eg-dropzone="crafting"]');
    const invCell = chip.closest('.sx-inv-cell');

    if (currencyCell) {
        const r = +currencyCell.dataset.row, c = +currencyCell.dataset.col;
        return {
            sourceZone: 'currency', sourceRow: r, sourceCol: c, sourceSlot: null,
            item: _currencyStash[r][c],
            clearFn: () => { _currencyStash[r][c] = null; _renderCurrencyCell(r, c); }
        };
    }
    if (essenceCell) {
        const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
        return {
            sourceZone: 'essence', sourceRow: r, sourceCol: c, sourceSlot: null,
            item: globalThis._essenceStash[r][c],
            clearFn: () => { globalThis._essenceStash[r][c] = null; _renderEssenceCell(r, c); }
        };
    }
    if (mapStashCell) {
        const r = +mapStashCell.dataset.row, c = +mapStashCell.dataset.col;
        const tier = (typeof _egMapStashActiveTier !== 'undefined' ? globalThis._egMapStashActiveTier : 1);
        let item = null;
        try {
            if (typeof _egGetMapTierGrid === 'function') item = _egGetMapTierGrid(tier)[r][c];
            else item = _egMapStash[r][c];
        } catch (e) { item = null; }
        return {
            sourceZone: 'mapstash', sourceRow: r, sourceCol: c, sourceSlot: null, sourceTier: tier,
            item: item,
            clearFn: () => {
                try {
                    if (typeof _egGetMapTierGrid === 'function') _egGetMapTierGrid(tier)[r][c] = null;
                    else _egMapStash[r][c] = null;
                } catch (e) { }
                _egRenderMapStashCell(r, c);
            }
        };
    }
    if (mapSlot) {
        return {
            sourceZone: 'map', sourceRow: null, sourceCol: null, sourceSlot: null,
            item: globalThis._egMapSlotItem,
            clearFn: () => { globalThis._egMapSlotItem = null; _egRenderMapSlot(); }
        };
    }
    if (craftingSlot && typeof _craftingBenchItem !== 'undefined') {
        return {
            sourceZone: 'crafting', sourceRow: null, sourceCol: null, sourceSlot: null,
            item: globalThis._craftingBenchItem,
            clearFn: () => {
                globalThis._craftingBenchItem = null;
                if (typeof _refreshCraftingBench === 'function') _refreshCraftingBench();
                if (typeof _updateCraftingBenchLauncherSlot === 'function') _updateCraftingBenchLauncherSlot();
                if (typeof _closeCraftingBench === 'function') _closeCraftingBench();
            }
        };
    }
    if (equipSlot) {
        const slotId = equipSlot.dataset.slotId;
        return {
            sourceZone: 'equip', sourceRow: null, sourceCol: null, sourceSlot: slotId,
            item: _equipped[slotId] || null,
            clearFn: () => { delete _equipped[slotId]; _renderEquipSlot(slotId); }
        };
    }
    if (invCell) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        return {
            sourceZone: 'inv', sourceRow: r, sourceCol: c, sourceSlot: null,
            item: _inventory[r][c],
            clearFn: () => { _inventory[r][c] = null; _renderInventoryCell(r, c); }
        };
    }
    return null;
}

// Starts a drag session from the clicked item chip.
// Clears the item from its origin cell immediately and spawns the ghost.
export function _dndPickUp(e, chip) {
    if (e.button !== 0) return; // left-click only

    const resolved = _dndResolvePickupZone(chip);
    if (!resolved || !resolved.item) return; // empty cell or unrecognised zone

    e.preventDefault();

    // The origin chip is about to be removed - close any open hover tooltip.
    _clearTooltip();

    _dnd = {
        active: true,
        item: resolved.item,
        sourceZone: resolved.sourceZone,
        sourceRow: resolved.sourceRow,
        sourceCol: resolved.sourceCol,
        sourceSlot: resolved.sourceSlot,
        sourceTier: resolved.sourceTier || null,
    };

    resolved.clearFn(); // remove item from its origin cell
    Audio_Manager.playSFX('item_drag_pick');
    _dndCreateGhost(resolved.item);
    _dndMoveGhost(e.clientX, e.clientY);
}


//------------------------------------------------------------------------
//-------------------DROP HELPERS-----------------------------------------
//------------------------------------------------------------------------

// Writes the dragged item into a grid cell, swapping any displaced occupant
// back to the drag source. renderFn(row, col) re-renders the affected cell.
export function _dndDropOnCell(grid, renderFn, row, col) {
    const displaced = grid[row][col];
    grid[row][col] = _dnd.item;
    renderFn(row, col);

    if (displaced) {
        _dndReturnDisplacedToSource(displaced);
    }
}

// Scans a grid for the first empty cell and places the item there.
// Unlimited main stash: grows by one row if the grid is the main stash and is full.
export function _dndPlaceInFirstFreeSlot(item, grid, renderFn, rows, cols) {
    // Use actual grid length for stash (may have grown beyond passed rows)
    const actualRows = (grid === _inventory && typeof _getInvRows === 'function') ? _getInvRows() : rows;
    for (let r = 0; r < actualRows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) {
                grid[r][c] = item;
                renderFn(r, c);
                return true;
            }
        }
    }
    // Full - only grow the unlimited main stash
    if (grid === _inventory && typeof _ensureInvRows === 'function') {
        _ensureInvRows(actualRows + 1);
        grid[actualRows][0] = item;
        renderFn(actualRows, 0);
        return true;
    }
    console.warn('[DND] No free slot found for displaced item:', item.name);
    return false;
}

// Returns the dragged item to the zone it was picked up from.
// Used when a drop is invalid or the drag is cancelled.
export function _dndReturnToSource() {
    if (!_dnd.item) return;
    _dndReturnDisplacedToSource(_dnd.item);
}

// Writes any item back to the current drag session's source location.
// Used both for returning the dragged item on cancel, and for sending
// a displaced item back when a swap happens.
export function _dndReturnDisplacedToSource(item) {
    const { sourceZone, sourceRow, sourceCol, sourceSlot, sourceTier } = _dnd;

    if (sourceZone === 'inv') {
        // Ensure the origin stash row still exists after expansions
        if (typeof _ensureInvRows === 'function') _ensureInvRows(sourceRow + 1);
        _inventory[sourceRow][sourceCol] = item; _renderInventoryCell(sourceRow, sourceCol);
    }
    else if (sourceZone === 'equip') { _equipped[sourceSlot] = item; _renderEquipSlot(sourceSlot); }
    else if (sourceZone === 'map') { globalThis._egMapSlotItem = item; _egRenderMapSlot(); }
    else if (sourceZone === 'currency') { _currencyStash[sourceRow][sourceCol] = item; _renderCurrencyCell(sourceRow, sourceCol); }
    else if (sourceZone === 'essence') { globalThis._essenceStash[sourceRow][sourceCol] = item; _renderEssenceCell(sourceRow, sourceCol); }
    else if (sourceZone === 'crafting') {
        globalThis._craftingBenchItem = item;
        if (typeof _refreshCraftingBench === 'function') _refreshCraftingBench();
        if (typeof _updateCraftingBenchLauncherSlot === 'function') _updateCraftingBenchLauncherSlot();
    }
    else if (sourceZone === 'mapstash') {
        try {
            if (sourceTier != null && typeof _egGetMapTierGrid === 'function') {
                if (typeof _egEnsureMapTierRows === 'function') _egEnsureMapTierRows(sourceTier, sourceRow + 1);
                _egGetMapTierGrid(sourceTier)[sourceRow][sourceCol] = item;
            } else if (typeof _egGetMapTierGrid === 'function' && typeof _egMapStashActiveTier !== 'undefined') {
                const t = globalThis._egMapStashActiveTier;
                if (typeof _egEnsureMapTierRows === 'function') _egEnsureMapTierRows(t, sourceRow + 1);
                _egGetMapTierGrid(t)[sourceRow][sourceCol] = item;
            } else {
                _egMapStash[sourceRow][sourceCol] = item;
            }
        } catch (e) { try { _egMapStash[sourceRow][sourceCol] = item; } catch (e2) { } }
        _egRenderMapStashCell(sourceRow, sourceCol);
    }
    else {
        // Unlimited stash: delegate to helper that grows if needed
        if (typeof _addItemToStash === 'function') _addItemToStash(item);
        else _dndPlaceInFirstFreeSlot(item, _inventory, _renderInventoryCell, _inventory.length, INV_COLS);
    }
}

// Briefly flashes a red reject animation on the given element,
// then returns the dragged item to its source.
export function _dndShowRejectFlash(el) {
    Audio_Manager.playSFX('ui_error');
    el.classList.add('sx-slot-reject');
    setTimeout(() => el.classList.remove('sx-slot-reject'), 600);
    _dndReturnToSource();
}

// Finalises a completed drop: saves hub state, resets drag session, updates count label.
// Re-renders stash + paperdoll because the new loadout can change which
// items are flagged as requirement-blocked (red cells).
// Also re-renders the map device slot and map stash - those elements live on
// the Probability Gate screen and no-op when that screen is not in the DOM.
let _dndEquipSfxPlayed = false;
export function _dndFinalizeDrop() {
    // An equip already played its own sound; don't stack the generic drop on it.
    if (!_dndEquipSfxPlayed) Audio_Manager.playSFX('item_drag_drop');
    _dndEquipSfxPlayed = false;
    saveHubState();
    _dndReset();
    _updateInvCount();
    _renderInventory();
    if (typeof _renderUniqueStash === 'function') _renderUniqueStash();
    if (typeof _updateUniqueTabBadge === 'function') _updateUniqueTabBadge();
    _renderEquipSlots();
    _renderStatsList();
    _egRenderMapSlot();
    _egRenderMapStash();
    document.querySelectorAll('.sx-unique-cell.sx-dragover, .sx-unique-grid.sx-dragover, #sx-tab-uniques.sx-dragover').forEach(el => el.classList.remove('sx-dragover'));
}


//------------------------------------------------------------------------
//-------------------DROP LOGIC (mouseup)---------------------------------
//------------------------------------------------------------------------

// Resolves the drop target from the mouse position and routes to the correct
// zone handler. If no valid target is found, the item is returned to its source.
export function egDropOnCraftingBench(event) {
    // The global mouseup router handles custom dragging; this prevents the
    // browser's native drop behavior from navigating the page.
    event.preventDefault();
}

export function _dndDrop(e) {
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
    const invCell = target.closest('.sx-inv-cell:not(.sx-currency-cell):not(.eg-map-stash-cell):not(.sx-essence-cell)');
    const currencyCell = target.closest('.sx-currency-cell');
    const essenceCell = target.closest('.sx-essence-cell');
    const mapStashCell = target.closest('.eg-map-stash-cell');
    const equipSlotEl = target.closest('.sx-equip-slot');
    const mapSlotEl = target.closest('#eg-map-slot');
    const craftingSlotEl = target.closest('[data-eg-dropzone="crafting"]');
    const uniqueCell = target.closest('.sx-unique-cell');
    const uniqueGrid = target.closest('#sx-unique-grid');
    const uniqueTabBtn = target.closest('#sx-tab-uniques');

    let dropped = false;

    if (currencyCell && _dndZoneAccepts('currency')) {
        dropped = _dndDropOnCurrencyCell(currencyCell);

    } else if (essenceCell && _dndZoneAccepts('essence')) {
        dropped = _dndDropOnEssenceCell(essenceCell);

    } else if (mapStashCell && _dndZoneAccepts('mapstash')) {
        const r = +mapStashCell.dataset.row, c = +mapStashCell.dataset.col;
        const activeTier = (typeof _egMapStashActiveTier !== 'undefined' ? globalThis._egMapStashActiveTier : 1);
        const dragTier = (_dnd.item && _dnd.item.mapTier != null) ? _dnd.item.mapTier : null;
        if (dragTier != null && dragTier !== activeTier) {
            const roman = (typeof EG_MAP_TIER_ROMANS !== 'undefined' ? EG_MAP_TIER_ROMANS[activeTier - 1] : activeTier);
            const msg = `⚠️ This stash only holds Tier ${roman} maps (Tier ${dragTier} not allowed)`;
            if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
            else if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
            mapStashCell.classList.add('sx-slot-reject');
            setTimeout(() => mapStashCell.classList.remove('sx-slot-reject'), 600);
            // return to source, handled below via !dropped
        } else {
            // tier-aware drop: write into active tier's grid, expand if needed
            try {
                if (typeof _egGetMapTierGrid === 'function') {
                    const grid = _egGetMapTierGrid(activeTier);
                    if (typeof _egEnsureMapTierRows === 'function') _egEnsureMapTierRows(activeTier, r + 1);
                    const displaced = grid[r][c];
                    grid[r][c] = _dnd.item;
                    _egRenderMapStashCell(r, c);
                    if (displaced) _dndReturnDisplacedToSource(displaced);
                } else {
                    _dndDropOnCell(_egMapStash, _egRenderMapStashCell, r, c);
                }
                dropped = true;
            } catch (e) {
                _dndDropOnCell(_egMapStash, _egRenderMapStashCell, r, c);
                dropped = true;
            }
        }

    } else if (craftingSlotEl && _dndZoneAccepts('crafting')) {
        // Uniques can never sit on the crafting bench (they belong in the Unique
        // Collection). Reject the drop with a message and return it to source.
        if (_dnd.item.isUnique) {
            const nm = _dnd.item.name || 'This unique item';
            const msg = `⚠️ ${nm} is unique and cannot be placed on the Crafting Bench`;
            if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
            else if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
            if (craftingSlotEl.classList) {
                craftingSlotEl.classList.add('sx-slot-reject');
                setTimeout(() => craftingSlotEl.classList.remove('sx-slot-reject'), 600);
            }
            // !dropped -> the generic tail returns the unique to its origin
        } else {
            // Dropping onto the bench consumes the source location but keeps the
            // same object in the bench slot. The bench chip remains draggable.
            // If there's already an item in the bench, displace it to the stash.
            const existingBenchItem = globalThis._craftingBenchItem;
            dropped = typeof _setCraftingBenchItem === 'function' && _setCraftingBenchItem(_dnd.item);
            if (dropped && existingBenchItem) {
                const free = _dndFirstFreeInvCell();
                if (typeof _ensureInvRows === 'function') _ensureInvRows(free.r + 1);
                _inventory[free.r][free.c] = existingBenchItem;
                _renderInventoryCell(free.r, free.c);
                _updateInvCount();
            }
        }

    } else if (mapSlotEl && _dndZoneAccepts('map')) {
        const displaced = globalThis._egMapSlotItem;
        globalThis._egMapSlotItem = _dnd.item;
        _egRenderMapSlot();
        if (displaced) {
            // A map displaced from the device must never be dumped into a stash
            // tab of a different tier: dropping a Tier 1 stash map onto a Tier 7
            // device map used to send the Tier 7 map back to the Tier 1 grid
            // (the drag source cell), corrupting the map sort. Route it to a
            // free cell of its OWN tier instead - the same rule the right-click
            // quick-load path follows. Same-tier swaps still return to source.
            const draggedTier = (_dnd.item && _dnd.item.mapTier != null) ? _dnd.item.mapTier : null;
            const displacedTier = (displaced.mapTier != null) ? displaced.mapTier : null;
            const routeToOwnTier = draggedTier != null && displacedTier != null && draggedTier !== displacedTier
                && typeof _egFindFreeMapCellForTier === 'function' && typeof _egGetMapTierGrid === 'function';
            if (routeToOwnTier) {
                try {
                    const pos = _egFindFreeMapCellForTier(displacedTier);
                    _egGetMapTierGrid(displacedTier)[pos.r][pos.c] = displaced;
                    // Only the active tier's grid is in the DOM, so render there
                    if (displacedTier === globalThis._egMapStashActiveTier) _egRenderMapStashCell(pos.r, pos.c);
                } catch (e) {
                    _dndReturnDisplacedToSource(displaced);
                }
            } else {
                _dndReturnDisplacedToSource(displaced);
            }
        }
        dropped = true;

    } else if (equipSlotEl && _dndZoneAccepts('equip')) {
        dropped = _dndDropOnEquipSlot(equipSlotEl);

    } else if ((uniqueCell || uniqueGrid || uniqueTabBtn) && _dndZoneAccepts('uniques')) {
        // Dragging a unique back into the collection. Source was Inventory/equip.
        // Works even when uniques tab body is hidden (display:none) – dropping on the tab button counts.
        const uid = _dnd.item.baseId || _dnd.item.uniqueId || _dnd.item.id;
        if (_dnd.item.isUnique && uid) {
            if (typeof _addUniqueToCollection === 'function') {
                _addUniqueToCollection(_dnd.item);
                _dnd.item = null;
                dropped = true;
                const flashTarget = uniqueCell || uniqueGrid || uniqueTabBtn;
                if (flashTarget) {
                    flashTarget.classList.add('sx-dragover');
                    setTimeout(() => flashTarget.classList.remove('sx-dragover'), 300);
                }
                // Auto-switch to uniques tab so the user sees the result
                if (typeof _switchStashTab === 'function') _switchStashTab('uniques');
            } else if (typeof _uniqueStash !== 'undefined') {
                if (!globalThis._uniqueStash[uid]) globalThis._uniqueStash[uid] = [];
                globalThis._uniqueStash[uid].push(_dnd.item);
                if (typeof _uniqueCollected !== 'undefined' && globalThis._uniqueCollected.add) globalThis._uniqueCollected.add(uid);
                if (typeof _renderUniqueStash === 'function') _renderUniqueStash();
                if (typeof _updateUniqueTabBadge === 'function') _updateUniqueTabBadge();
                if (typeof saveHubState === 'function') saveHubState();
                _dnd.item = null;
                dropped = true;
                if (typeof _switchStashTab === 'function') _switchStashTab('uniques');
            }
        } else {
            const flashTarget = uniqueCell || uniqueGrid || uniqueTabBtn;
            if (flashTarget) {
                flashTarget.classList.add('sx-slot-reject');
                setTimeout(() => flashTarget.classList.remove('sx-slot-reject'), 600);
            }
        }

    } else if (invCell && _dndZoneAccepts('inv')) {
        const r = +invCell.dataset.row, c = +invCell.dataset.col;
        let blocked = false;
        if (_dnd.sourceZone === 'equip') {
            // Unequipping by dragging a paperdoll item into the stash. If the
            // target cell is occupied, the displaced stash item will be
            // swapped INTO the vacated paperdoll slot - so the simulated final
            // loadout must include it. Checks both stat requirements
            // (endgame-requirements.js) and the slot type of the swapped-in item.
            const displaced = _inventory[r][c];
            if (displaced && SLOT_ACCEPTS[_dnd.sourceSlot] !== displaced.slotType) {
                const msg = `⚠️ Cannot unequip ${_dnd.item.name || '?'} - ${displaced.name || '?'} does not fit there`;
                if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
                else if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
                blocked = true;
            } else {
                // _checkMoveAllowed returns { ok, missing } (same gate the
                // right-click unequip uses). _simulateAndCheck returns a bare
                // array, so reading `.ok` off it always blocked the drag.
                // The carried item was lifted out of _equipped on pickup, so
                // the baseline puts it back (else the "before" loadout is
                // already missing it and any unequip looks harmless).
                const gate = _checkMoveAllowed(sim => {
                    delete sim[_dnd.sourceSlot];
                    if (displaced) sim[_dnd.sourceSlot] = displaced;
                }, sim => { sim[_dnd.sourceSlot] = _dnd.item; });
                if (!gate.ok) {
                    _showRequirementsToast('unequip', gate.missing, _dnd.item.name);
                    blocked = true;
                }
            }
            if (blocked) {
                invCell.classList.add('sx-slot-reject');
                setTimeout(() => invCell.classList.remove('sx-slot-reject'), 600);
                // generic return-to-source below restores the carried item
            }
        }
        if (!blocked) {
            _dndDropOnCell(_inventory, _renderInventoryCell, r, c);
            dropped = true;
        }
    }

    if (!dropped) _dndReturnToSource();
    _dndFinalizeDrop();
}

// Handles dropping onto a currency cell (fixed-slot tab).
// Only the assigned currency id for that slot is accepted; otherwise reject.
// Same-id drops merge stack counts.
export function _dndDropOnCurrencyCell(currencyCell) {
    const r = +currencyCell.dataset.row, c = +currencyCell.dataset.col;
    const assignedId = (typeof _currencyIdForSlot === 'function') ? _currencyIdForSlot(r, c) : null;
    // Unassigned decorative cells never accept drops
    if (!assignedId) {
        _dndShowRejectFlash(currencyCell);
        return false;
    }
    if (_dnd.item.id !== assignedId) {
        _dndShowRejectFlash(currencyCell);
        return false;
    }
    const existing = _currencyStash[r][c];
    if (existing && existing.id === _dnd.item.id) {
        existing.count = (existing.count || 1) + (_dnd.item.count || 1);
        _currencyStash[r][c] = existing;
        _renderCurrencyCell(r, c);
    } else if (!existing) {
        _currencyStash[r][c] = _dnd.item;
        _renderCurrencyCell(r, c);
    } else {
        // Different count object but same id - merge (should already be handled)
        existing.count = (existing.count || 1) + (_dnd.item.count || 1);
        _currencyStash[r][c] = existing;
        _renderCurrencyCell(r, c);
    }
    return true;
}

// Handles dropping onto an essence tab cell (fixed-slot tab, like Orbs & Shards).
// Only the assigned essence id for that slot is accepted; otherwise reject.
// Same-id drops merge stack counts.
export function _dndDropOnEssenceCell(essenceCell) {
    const r = +essenceCell.dataset.row, c = +essenceCell.dataset.col;
    const assignedId = (typeof _essenceIdForSlot === 'function') ? _essenceIdForSlot(r, c) : null;
    if (!assignedId) {
        _dndShowRejectFlash(essenceCell);
        return false;
    }
    if (_dnd.item.id !== assignedId) {
        _dndShowRejectFlash(essenceCell);
        return false;
    }
    const existing = globalThis._essenceStash[r][c];
    if (existing && existing.id === _dnd.item.id) {
        existing.count = (existing.count || 1) + (_dnd.item.count || 1);
        globalThis._essenceStash[r][c] = existing;
        _renderEssenceCell(r, c);
    } else if (!existing) {
        globalThis._essenceStash[r][c] = _dnd.item;
        _renderEssenceCell(r, c);
    } else {
        existing.count = (existing.count || 1) + (_dnd.item.count || 1);
        globalThis._essenceStash[r][c] = existing;
        _renderEssenceCell(r, c);
    }
    return true;
}

// Handles dropping onto a paperdoll char equip slot.
// Validates the item's slotType against what the target slot accepts, then
// checks stat requirements against the simulated final loadout (see
// endgame-requirements.js). Shows a reject flash and returns to source when
// either check fails.
// Returns true when the drop was accepted.
export function _dndDropOnEquipSlot(equipSlotEl) {
    const slotId = equipSlotEl.dataset.slotId;
    if (!slotId || !_dndSlotAcceptsItem(slotId)) {
        const name = (_dnd.item && _dnd.item.name) || '?';
        const msg = `⚠️ ${name} cannot go into that slot`;
        if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
        else if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
        _dndShowRejectFlash(equipSlotEl);
        return false;
    }
    const fromSlot = _dnd.sourceZone === 'equip' ? _dnd.sourceSlot : undefined;
    const gate = _canEquipInSlot(_dnd.item, slotId, fromSlot);
    if (!gate.ok) {
        // Two-hand rule: equipping a 2H weapon auto-unequips the off-hand to the
        // stash instead of rejecting (other hand conflicts still reject).
        if (gate.handError === 'two_handed_blocks_offhand' && slotId === 'weapon1'
            && typeof _tryAutoUnequipOffhandForTwoHander === 'function'
            && _tryAutoUnequipOffhandForTwoHander(_dnd.sourceZone === 'inv' ? { r: _dnd.sourceRow, c: _dnd.sourceCol } : null)) {
            const retry = _canEquipInSlot(_dnd.item, slotId, fromSlot);
            if (!retry.ok) {
                _showRequirementsToast('equip', retry, _dnd.item);
                _dndShowRejectFlash(equipSlotEl);
                return false;
            }
        } else {
            _showRequirementsToast('equip', gate, _dnd.item);
            _dndShowRejectFlash(equipSlotEl);
            return false;
        }
    }
    const displaced = _equipped[slotId] || null;
    _equipped[slotId] = _dnd.item;
    Audio_Manager.playSFX('item_equip');
    _dndEquipSfxPlayed = true;
    _renderEquipSlot(slotId);
    if (displaced) _dndReturnDisplacedToSource(displaced);
    return true;
}


//------------------------------------------------------------------------
//-------------------RIGHT-CLICK QUICK-MOVE-------------------------------
//------------------------------------------------------------------------

// Finds the paperdoll slot for quick-equip (right-click).
// Weapons are hand-aware: 2H → weapon1 only; 1H → first empty of
// weapon1/weapon2, else the first slot whose gate accepts the swap;
// shields → weapon2 only. Other slots use SLOT_ACCEPTS directly.
// Returns the slot id string, or null when no matching slot exists.
export function _dndFindTargetSlot(item) {
    if (item && item.category === 'equip' && item.slotType === 'weapon') {
        const isTwo = (typeof _getWeaponHands === 'function')
            ? _getWeaponHands(item) === 2 : item.hands === 2;
        const candidates = isTwo ? ['weapon1'] : ['weapon1', 'weapon2'];
        if (!isTwo) {
            const emptySlot = candidates.find(id => !_equipped[id]);
            if (emptySlot) {
                // A 1H weapon must not jump into the off-hand while a 2H holds main.
                if (!(emptySlot === 'weapon2' && typeof _isTwoHandedWeapon === 'function'
                    && _isTwoHandedWeapon(_equipped.weapon1))) return emptySlot;
                if (emptySlot === 'weapon1') return emptySlot;
            }
        } else if (!_equipped.weapon1) {
            return 'weapon1';
        }
        const fitting = (typeof _canEquipInSlot === 'function')
            ? candidates.find(id => _canEquipInSlot(item, id).ok)
            : null;
        return fitting || candidates[0];
    }
    if (item && item.category === 'equip' && item.slotType === 'shield') {
        return 'weapon2';
    }
    const candidates = Object.entries(SLOT_ACCEPTS)
        .filter(([, accepts]) => accepts === item.slotType)
        .map(([slotId]) => slotId);
    if (candidates.length === 0) return null;

    const emptySlot = candidates.find(id => !_equipped[id]);
    if (emptySlot) return emptySlot;

    const fitting = (typeof _canEquipInSlot === 'function')
        ? candidates.find(id => _canEquipInSlot(item, id).ok)
        : null;
    return fitting || candidates[0];
}

// Finds the first empty cell in the main equipment stash.
// Unlimited stash: always returns a cell (expands by one row if needed).
export function _dndFirstFreeInvCell() {
    if (typeof _findFreeInvCell === 'function') return _findFreeInvCell();
    for (let r = 0; r < _inventory.length; r++) {
        for (let c = 0; c < INV_COLS; c++) {
            if (!_inventory[r][c]) return { r, c };
        }
    }
    // fallback expand
    if (typeof _ensureInvRows === 'function') _ensureInvRows(_inventory.length + 1);
    else _inventory.push(Array(INV_COLS).fill(null));
    return { r: _inventory.length - 1, c: 0 };
}

// Right-click on a stash item → instantly equip it to the best matching slot.
// Stat requirements are checked against the simulated final loadout first
// (see endgame-requirements.js). The displaced item (if any) is placed back
// into the source stash cell.
export function _dndQuickEquipFromStash(invCell) {
    const r = +invCell.dataset.row, c = +invCell.dataset.col;
    const item = _inventory[r][c];
    if (!item || item.category !== 'equip') return;

    const slotId = _dndFindTargetSlot(item);
    if (!slotId) return; // no matching paperdoll slot exists for this item type

    const gate = _canEquipInSlot(item, slotId);
    if (!gate.ok) {
        // Two-hand rule: quick-equipping a 2H weapon auto-unequips the off-hand.
        if (gate.handError === 'two_handed_blocks_offhand' && slotId === 'weapon1'
            && typeof _tryAutoUnequipOffhandForTwoHander === 'function'
            && _tryAutoUnequipOffhandForTwoHander()) {
            const retry = _canEquipInSlot(item, slotId);
            if (!retry.ok) {
                _showRequirementsToast('equip', retry, item);
                invCell.classList.add('sx-slot-reject');
                setTimeout(() => invCell.classList.remove('sx-slot-reject'), 600);
                return;
            }
        } else {
            _showRequirementsToast('equip', gate, item);
            invCell.classList.add('sx-slot-reject');
            setTimeout(() => invCell.classList.remove('sx-slot-reject'), 600);
            return;
        }
    }

    const displaced = _equipped[slotId] || null;
    _equipped[slotId] = item;
    Audio_Manager.playSFX('item_equip');
    _inventory[r][c] = displaced; // displaced may be null - that's fine
    _renderEquipSlot(slotId);
    _renderInventoryCell(r, c);
    _renderInventory();      // blocked-state flags may change loadout-wide
    _renderEquipSlots();
    _updateInvCount();
    _renderStatsList();
    saveHubState();
}

// Right-click on a paperdoll slot item → send it to the first free stash cell.
// Unlimited stash: always has room (grows on demand).
export function _dndQuickUnequipToStash(equipSlotEl) {
    const slotId = equipSlotEl.dataset.slotId;
    const item = _equipped[slotId] || null;
    if (!item) return;

    const gate = _checkUnequipSlot(slotId);
    if (!gate.ok) {
        _showRequirementsToast('unequip', gate.missing, item.name);
        equipSlotEl.classList.add('sx-slot-reject');
        setTimeout(() => equipSlotEl.classList.remove('sx-slot-reject'), 600);
        return;
    }

    const free = _dndFirstFreeInvCell();
    Audio_Manager.playSFX('item_unequip');
    delete _equipped[slotId];
    if (typeof _ensureInvRows === 'function') _ensureInvRows(free.r + 1);
    _inventory[free.r][free.c] = item;
    _renderEquipSlot(slotId);
    _renderInventoryCell(free.r, free.c);
    _renderInventory();      // blocked-state flags may change loadout-wide
    _renderEquipSlots();
    _updateInvCount();
    _renderStatsList();
    saveHubState();
}

// Contextmenu handler - dispatches to quick-equip or quick-unequip based on
// which zone the right-clicked chip belongs to. On the Probability Gate
// screen, maps are quick-moved between the map stash and the map device slot.
export function _dndHandleRightClick(e) {
    const chip = e.target.closest('.sx-item-chip');
    if (!chip) return;
    const screenEl = _dndChipScreenEl(chip);
    if (!screenEl) return;

    e.preventDefault(); // suppress the browser context menu

    // Right-click has no meaning on the crafting bench slot (overlay or launcher).
    // Items there are only moved by drag-and-drop, so treat it as a pure no-op.
    if (chip.closest && chip.closest('[data-eg-dropzone="crafting"]')) return;

    // The chip may move or vanish (quick-equip/unequip) - close its tooltip.
    _clearTooltip();

    const invCell = chip.closest('.sx-inv-cell:not(.sx-currency-cell):not(.eg-map-stash-cell):not(.sx-essence-cell)');
    const equipSlot = chip.closest('.sx-equip-slot');
    const mapStashCell = chip.closest('.eg-map-stash-cell');
    const mapSlot = chip.closest('#eg-map-slot');

    if (invCell) _dndQuickEquipFromStash(invCell);
    else if (equipSlot) _dndQuickUnequipToStash(equipSlot);
    else if (mapStashCell) _dndQuickLoadMapToDevice(mapStashCell);
    else if (mapSlot) _dndQuickUnloadMapFromDevice();
}


// Right-click on a map in the gate map stash → swap it into the map device
// slot. The displaced device map (if any) returns to the source cell.
// Tier check: only allow if displaced (if any) belongs to the active tier's stash?
// Actually device can hold any tier, so stash->device always allowed; device->stash via swap
// checks tier of displaced map vs active tier.
export function _dndQuickLoadMapToDevice(mapStashCell) {
    if (typeof _egMapStash === 'undefined') return;
    const r = +mapStashCell.dataset.row, c = +mapStashCell.dataset.col;
    const activeTier = (typeof _egMapStashActiveTier !== 'undefined' ? globalThis._egMapStashActiveTier : 1);
    let map = null;
    try {
        if (typeof _egGetMapTierGrid === 'function') map = _egGetMapTierGrid(activeTier)[r][c];
        else map = _egMapStash[r][c];
    } catch (e) { map = null; }
    if (!map || map.category !== 'map') return;

    const displaced = globalThis._egMapSlotItem || null;
    // If device holds a map and we swap it into the clicked stash cell, ensure it matches stash tier
    if (displaced && displaced.mapTier != null && displaced.mapTier !== activeTier) {
        // Instead of swapping into mismatched cell, try to place displaced into its own tier's free slot
        // and just move clicked map to device
        let targetTier = displaced.mapTier;
        let placed = false;
        try {
            if (typeof _egFindFreeMapCellForTier === 'function') {
                const pos = _egFindFreeMapCellForTier(targetTier);
                _egGetMapTierGrid(targetTier)[pos.r][pos.c] = displaced;
                placed = true;
                // if target is active tier, render that cell (but it's not visible since we already switched?)
                if (targetTier === activeTier) _egRenderMapStashCell(pos.r, pos.c);
            }
        } catch (e) { }
        if (!placed) {
            const msg = `⚠️ Cannot swap - device holds Tier ${displaced.mapTier} but stash is on Tier ${activeTier}`;
            if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'error' });
            else if (typeof showToast === 'function') globalThis.showToast(msg, '#e74c3c');
            return;
        }
        // clear clicked cell
        try { _egGetMapTierGrid(activeTier)[r][c] = null; } catch (e) { }
        globalThis._egMapSlotItem = map;
        _egRenderMapSlot();
        _egRenderMapStashCell(r, c);
        saveHubState();
        return;
    }
    globalThis._egMapSlotItem = map;
    try {
        if (typeof _egGetMapTierGrid === 'function') _egGetMapTierGrid(activeTier)[r][c] = displaced;
        else _egMapStash[r][c] = displaced;
    } catch (e) { }
    _egRenderMapSlot();
    _egRenderMapStashCell(r, c);
    saveHubState();
}

// Right-click on a map in the map device slot → return it to the first free
// map stash cell of its own tier (infinite, so always succeeds - expands if needed).
export function _dndQuickUnloadMapFromDevice() {
    if (typeof _egMapSlotItem === 'undefined' || !globalThis._egMapSlotItem) return;
    const map = globalThis._egMapSlotItem;
    const tier = (map.mapTier != null ? map.mapTier : (globalThis._egMapStashActiveTier || 1));
    try {
        if (typeof _egFindFreeMapCellForTier === 'function' && typeof _egGetMapTierGrid === 'function') {
            const pos = _egFindFreeMapCellForTier(tier);
            _egGetMapTierGrid(tier)[pos.r][pos.c] = map;
            globalThis._egMapSlotItem = null;
            _egRenderMapSlot();
            // if the map's tier is not the active tab, switch to it so the player sees it
            if (tier !== globalThis._egMapStashActiveTier && typeof _egSwitchMapStashTier === 'function') {
                _egSwitchMapStashTier(tier);
            } else {
                _egRenderMapStashCell(pos.r, pos.c);
            }
            saveHubState();
            return;
        }
    } catch (e) { }
    for (let r = 0; r < EG_MAP_STASH_ROWS; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) {
            if (!_egMapStash[r][c]) {
                _egMapStash[r][c] = map;
                globalThis._egMapSlotItem = null;
                _egRenderMapSlot();
                _egRenderMapStashCell(r, c);
                saveHubState();
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
export function _dndBuildCurrencyChipHTML(item) {
    if (!item) return '';
    const rarityClass = `sx-rarity-${item.rarity || 'currency'}`;
    const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
    const badge = (item.count && item.count > 1)
        ? `<span class="sx-stack-badge">${item.count >= 1000 ? Math.floor(item.count / 1000) + 'k' : item.count}</span>`
        : '';
    return `
<div class="sx-item-chip ${rarityClass}" draggable="true"
     onmouseenter="_showHubTooltip(${itemJson}, event)"
     onmousemove="_moveTooltip(event)"
     onmouseleave="_clearTooltip()">
    <span class="sx-item-chip-icon">${GAME_ART.html('item', item.id, item.icon || '📦')}</span>${badge}
</div>`;
}

// Overrides the base _renderCurrencyCell from hub.js.
// Uses _dndBuildCurrencyChipHTML so stacked currency shows the count badge.
// Renders BOTH twin grids - hub's left tab (sx-currency-cell-*) and the
// Probability Gate's strip (eg-gate-currency-cell-*) - because both read
// from the same _currencyStash. Empty assigned slots get a dashed placeholder.
export function _renderCurrencyCell(row, col) {
    const item = _currencyStash[row][col];
    const assignedId = (typeof _currencyIdForSlot === 'function') ? _currencyIdForSlot(row, col) : null;
    const def = assignedId && (typeof _currencyDefForId === 'function') ? _currencyDefForId(assignedId) : null;
    if (item && def) {
        item.name = def.name;
        item.icon = def.icon;
        item.description = def.description;
    }

    function applyToCell(cell) {
        if (!cell) return;
        // No tooltip attribute is written or cleared here: a filled cell gets
        // its hint from the currency chip's own styled tooltip, and an empty
        // one shows the icon via data-empty-icon. (This used to clear a native
        // title that nothing sets any more.)
        if (item) {
            cell.innerHTML = _dndBuildCurrencyChipHTML(item);
            cell.classList.remove('sx-currency-assigned-empty');
            cell.removeAttribute('data-empty-icon');
        } else if (assignedId) {
            cell.innerHTML = '';
            cell.classList.add('sx-currency-assigned-empty');
            // Empty slots preview their currency art (dimmed via CSS) once
            // loaded, else the classic emoji ::after placeholder.
            const emptyArt = (def && GAME_ART) ? GAME_ART.url('item', assignedId) : null;
            if (emptyArt) {
                cell.removeAttribute('data-empty-icon');
                const img = document.createElement('img');
                img.src = emptyArt;
                img.alt = '';
                img.draggable = false;
                img.loading = 'lazy';
                img.decoding = 'async';
                img.className = 'sx-art-img sx-empty-slot-art';
                cell.appendChild(img);
            } else if (def && def.icon) {
                cell.setAttribute('data-empty-icon', def.icon);
            }
        } else {
            cell.innerHTML = '';
            cell.classList.remove('sx-currency-assigned-empty');
            cell.removeAttribute('data-empty-icon');
        }
    }
    applyToCell(document.getElementById(`sx-currency-cell-${row}-${col}`));
    applyToCell(document.getElementById(`eg-gate-currency-cell-${row}-${col}`));
}


//------------------------------------------------------------------------
// _showHubTooltip now lives ONLY in endgame-currency.js (single source of
// truth). The legacy override copies that used to race via load order in
// this file and hub.js were removed 2026-09; the commented-out
// panel-based implementation below was already dead code. Currency chips
// rendered by this file dispatch through the shared global at runtime.
//------------------------------------------------------------------------
//-------------------CURRENCY PUBLIC API----------------------------------
//------------------------------------------------------------------------

// Adds `amount` of a currency type to the currency stash (fixed slots).
// Each currency id has a pre-assigned slot; stacks simply increment there.
// Returns true on success, false if the id has no assigned slot or no def for a new stack.
export function addCurrency(id, amount = 1, def = null) {
    const pos = (typeof _currencySlotForId === 'function') ? _currencySlotForId(id) : null;
    if (!pos) {
        console.warn(`[DND] addCurrency: no fixed slot for "${id}".`);
        return false;
    }
    const r = pos.r, c = pos.c;
    const existing = _currencyStash[r] && _currencyStash[r][c];
    if (existing && existing.id === id) {
        existing.count = (existing.count || 1) + amount;
        _renderCurrencyCell(r, c);
        if (typeof trackAchStat === 'function') try {
            const _isShard = id.indexOf('shard_') === 0;
            if (!_isShard) trackAchStat('egCurrencyLooted', amount);
            else trackAchStat('egEssencesLooted', 0); // shards not counted here
            // track essences separately via addEssence
            if (id.indexOf('essence_') === 0) trackAchStat('egEssencesLooted', amount);
        } catch(e){}
        return true;
    }
    if (existing && existing.id !== id) {
        console.warn(`[DND] addCurrency: slot [${r},${c}] occupied by different id "${existing.id}"`);
        return false;
    }
    if (!def) {
        // Try to resolve def from registry so drops without explicit def still work
        const resolved = (typeof _currencyDefForId === 'function') ? _currencyDefForId(id) : null;
        if (resolved) def = { name: resolved.name, icon: resolved.icon, rarity: 'currency', category: 'currency', description: resolved.description };
        else {
            console.warn(`[DND] addCurrency: no def for new "${id}".`);
            return false;
        }
    }
    if (!_currencyStash[r]) _currencyStash[r] = Array(CURRENCY_COLS).fill(null);
    _currencyStash[r][c] = { ...def, id, count: amount };
    // Ensure fixed-slot metadata
    if (!_currencyStash[r][c].category) _currencyStash[r][c].category = 'currency';
    if (!_currencyStash[r][c].rarity) _currencyStash[r][c].rarity = 'currency';
    _renderCurrencyCell(r, c);
    if (typeof trackAchStat === 'function') try {
        const _isShard2 = id.indexOf('shard_') === 0;
        if (!_isShard2) trackAchStat('egCurrencyLooted', amount);
        if (id.indexOf('essence_') === 0) trackAchStat('egEssencesLooted', amount);
    } catch(e){}
    return true;
}


//------------------------------------------------------------------------
//-------------------CSS INJECTION----------------------------------------
//------------------------------------------------------------------------

// Injects the minimal CSS rules required for drag visuals.
// Runs once on init - skips injection if the style tag already exists.
// These rules can be moved to a .css file if preferred.
export function _dndInjectStyles() {
    if (document.getElementById('sx-dnd-styles')) return;

    const style = document.createElement('style');
    style.id = 'sx-dnd-styles';
    style.textContent = `
        /* Highlight drop targets while a drag is hovering */
        .sx-inv-cell.sx-dragover,
        .sx-currency-cell.sx-dragover,
        .sx-essence-cell.sx-dragover,
        .eg-map-stash-cell.sx-dragover,
        .sx-equip-slot.sx-dragover,
        #eg-map-slot.sx-dragover {
            outline: 2px solid #a0a0ff;
            background: rgba(100, 100, 255, 0.18);
        }

        /* Red flash when a drop is rejected (wrong slot type) */
        .sx-slot-reject { animation: sx-reject-flash 0.6s ease-out; }
        @keyframes sx-reject-flash {
            0%   { outline: 2px solid #ff4444; background: rgba(255,60,60,0.25); }
            100% { outline: none; background: transparent; }
        }

        /* Prevent text selection while dragging */
        body.sx-dragging * { user-select: none !important; }

        /* Item chip - emoji-only, transparent background, no border or name text */
        .sx-item-chip {
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
        .sx-item-chip:hover  { filter: brightness(1.25) drop-shadow(0 0 4px rgba(200,200,255,0.6)); }
        .sx-item-chip:hover .sx-item-chip-icon { transform: scale(1.15); }
        .sx-item-chip:active { cursor: grabbing; }

        /* Name label hidden - tooltip panel carries that information */
        .sx-item-chip-name { display: none; }

        /* Emoji sized large enough to fill the cell */
        .sx-item-chip-icon { font-size: 1.45rem; line-height: 1; user-select: none; transition: transform 0.1s; }

        /* Rarity tints via drop-shadow on the emoji itself */
        .sx-item-chip.sx-rarity-uncommon  .sx-item-chip-icon { filter: drop-shadow(0 0 3px #4caf50); }
        .sx-item-chip.sx-rarity-rare      .sx-item-chip-icon { filter: drop-shadow(0 0 4px #5b9cf6); }
        .sx-item-chip.sx-rarity-legendary .sx-item-chip-icon { filter: drop-shadow(0 0 6px #e6a817) drop-shadow(0 0 2px #fff8); }
        .sx-item-chip.sx-rarity-currency  .sx-item-chip-icon { filter: drop-shadow(0 0 3px #b59248); }

        /* Currency count suffix displayed inside the tooltip name line */
        .sx-tooltip-count { font-weight: 700; color: #f5d98a; }

        /* Stack count badge - bottom-right corner of a currency cell */
        .sx-stack-badge {
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
        .sx-currency-cell { position: relative; }

        /* Ghost rarity glows */
        .sx-dnd-ghost.sx-rarity-legendary { box-shadow: 0 0 18px rgba(230,168,23,0.7)  !important; }
        .sx-dnd-ghost.sx-rarity-rare      { box-shadow: 0 0 12px rgba(91,156,246,0.6)  !important; }
        .sx-dnd-ghost.sx-rarity-uncommon  { box-shadow: 0 0 10px rgba(76,175,80,0.55)  !important; }

        /* Requirement-blocked items: red glow + slightly desaturated icon */
        .sx-item-chip.sx-req-blocked .sx-item-chip-icon {
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
// currency systems operate on both screens - they share the same state.
export function _dndChipScreenEl(chip) {
    if (!chip || typeof chip.closest !== 'function') return null;
    // The crafting bench overlay is appended directly to document.body (see
    // _ensureCraftingBenchOverlay), so it sits outside both screen roots.
    // Treat it as a valid drag-origin container too, or items placed in the
    // bench slot could never be picked back up.
    return chip.closest('#screen-endgame-hub') || chip.closest('#screen-endgame-gate') || chip.closest('#sx-crafting-bench-overlay');
}

// Binds the four global listeners that power the custom DnD system.
// Uses capture-phase mousedown so it fires before any chip's own handlers.
// Mousemove and mouseup are on window so the ghost and drop work even if
// the pointer leaves the hub container during a fast drag.
export function _dndBindListeners() {
    // Pick-up: left-click on any item chip inside the hub or gate screen.
    document.addEventListener('mousedown', e => {
        const chip = e.target.closest('.sx-item-chip');
        if (!chip || !_dndChipScreenEl(chip)) return;
        _dndPickUp(e, chip);
    }, true);

    // Ghost follows the mouse at all times during an active drag.
    window.addEventListener('mousemove', e => {
        if (_dnd.active) {
            _dndMoveGhost(e.clientX, e.clientY);
            // Auto-scroll the stash when dragging near its top/bottom edge
            const grid = document.getElementById('sx-inv-grid');
            if (grid) {
                const rect = grid.getBoundingClientRect();
                const edge = 70;
                if (e.clientY > rect.bottom - edge && e.clientY < rect.bottom + 40) {
                    grid.scrollTop += 14;
                } else if (e.clientY < rect.top + edge && e.clientY > rect.top - 40) {
                    grid.scrollTop -= 14;
                }
            }
            const mapGrid = document.getElementById('eg-map-stash-grid');
            if (mapGrid) {
                const rect2 = mapGrid.getBoundingClientRect();
                const edge2 = 70;
                if (e.clientY > rect2.bottom - edge2 && e.clientY < rect2.bottom + 40) {
                    mapGrid.scrollTop += 14;
                } else if (e.clientY < rect2.top + edge2 && e.clientY > rect2.top - 40) {
                    mapGrid.scrollTop -= 14;
                }
            }
            // Unique stash dragover highlight (only for uniques) – includes tab button when grid is hidden
            document.getElementById('sx-unique-grid');
            document.getElementById('sx-tab-uniques');
            // clear previous
            document.querySelectorAll('.sx-unique-cell.sx-dragover, .sx-unique-grid.sx-dragover, #sx-tab-uniques.sx-dragover').forEach(el => el.classList.remove('sx-dragover'));
            if (_dnd.item && _dnd.item.isUnique) {
                const under = document.elementFromPoint(e.clientX, e.clientY);
                const uCell = under && under.closest ? under.closest('.sx-unique-cell') : null;
                const uGrid = under && under.closest ? under.closest('#sx-unique-grid') : null;
                const uTab = under && under.closest ? under.closest('#sx-tab-uniques') : null;
                if (uCell) uCell.classList.add('sx-dragover');
                else if (uGrid) uGrid.classList.add('sx-dragover');
                else if (uTab) uTab.classList.add('sx-dragover');
                // Auto-hover switch: if hovering the uniques tab for a moment, show it
                if (uTab && typeof _switchStashTab === 'function' && _stashTab !== 'uniques') {
                    // debounce – switch immediately for visual feedback
                    _switchStashTab('uniques');
                }
            }
        } else {
            // clear stale highlights when not dragging
            document.querySelectorAll('.sx-unique-cell.sx-dragover, .sx-unique-grid.sx-dragover, #sx-tab-uniques.sx-dragover').forEach(el => el.classList.remove('sx-dragover'));
        }
    });

    // Drop: release the mouse button anywhere on the window.
    window.addEventListener('mouseup', e => {
        if (_dnd.active) _dndDrop(e);
        document.querySelectorAll('.sx-unique-cell.sx-dragover, .sx-unique-grid.sx-dragover, #sx-tab-uniques.sx-dragover').forEach(el => el.classList.remove('sx-dragover'));
    });

    // Right-click: quick-equip from stash or quick-unequip from char slot.
    document.addEventListener('contextmenu', _dndHandleRightClick, true);

    // Escape: cancel the current drag and return the item to its origin.
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && _dnd.active) {
            _dndDestroyGhost();
            _dndReturnToSource();
            _dndReset();
            document.querySelectorAll('.sx-unique-cell.sx-dragover, .sx-unique-grid.sx-dragover, #sx-tab-uniques.sx-dragover').forEach(el => el.classList.remove('sx-dragover'));
        }
    });
}


//------------------------------------------------------------------------
//-------------------NATIVE DRAG HELPERS----------------------------------
//------------------------------------------------------------------------
// The custom DnD system (mouse-based) is the primary drag mechanism.
// Native drag events (from draggable="true" on chips) are allowed to fire
// but are neutralised here to avoid conflicts with the custom system.

export function egDragOver(event) {
    event.preventDefault();
}

//------------------------------------------------------------------------
//-------------------INITIALISATION---------------------------------------
//------------------------------------------------------------------------

// Entry point - called once after the hub screen DOM has been created.
export function initEndgameHubDnD() {
    _dndInjectStyles();
    _dndBindListeners();
}

// Called from hub.js _createScreen() - alias so the hub bootstrap
// doesn't need to know whether it's calling the init function or the bind function.
export function _bindDragEvents() {
    initEndgameHubDnD();
}