//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Defines the grouped slot layout for the inventory panel.
// Each group has a visible label and an ordered list of item definition IDs.
// Order within slots[] controls display order within the group.
const INV_SLOT_GROUPS = [
    { label: 'Reveal', slots: ['reveal1', 'reveal2', 'reveal3', 'reveal4'] },
    { label: 'Mark', slots: ['markWrong2', 'markWrong4', 'markWrong6', 'markWrong8'] },
    { label: 'Time', slots: ['addTime60', 'addTime300', 'addTime600', 'addTime900'] },
    { label: 'Utility', slots: ['shield', 'freeze', 'mistakeEraser', 'mistakeEraser4', 'mistakeEraser6', 'mistakeEraserAll', 'scoutPrimer'] },
    { label: 'Power', slots: ['rowSolve', 'colSolve', 'artifactComplete'] },
    { label: 'Cursed', slots: ['cursedReveal', 'cursedTime', 'cursedShield', 'cursedRowSolve', 'cursedColSolve', 'cursedRowCol'] },
    { label: 'Special', slots: ['pearlOfHaste', 'pearlOfSwiftness', 'grandPearl', 'theWitch', 'goldenClock', 'shadowSeal'] },
];




//------------------------------------------------------------------------
//----------------------------TOOLTIP STATE-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Cached reference to the shared tooltip element — created once on first use.
let _invTooltipEl = null;




//------------------------------------------------------------------------
//----------------------------TOOLTIP HELPERS-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the shared tooltip element, creating it the first time it's needed.
function _ensureTooltip() {
    if (_invTooltipEl) return _invTooltipEl;
    _invTooltipEl = document.createElement('div');
    _invTooltipEl.id = 'inv-slot-tooltip';
    document.body.appendChild(_invTooltipEl);
    return _invTooltipEl;
}

// Positions the tooltip above the anchor element, centred horizontally.
// Flips below the anchor if there isn't enough space above.
// Clamps to the viewport so it never goes off-screen.
function _positionTooltip(tip, anchor) {
    const ar = anchor.getBoundingClientRect();
    tip.style.left = '0px';
    tip.style.top = '0px';

    const tw = tip.offsetWidth || 220;
    const th = tip.offsetHeight || 80;
    let left = ar.left + ar.width / 2 - tw / 2;
    let top = ar.top - th - 8;

    if (top < 6) top = ar.bottom + 8;  // flip below if too close to top edge
    left = Math.max(6, Math.min(left, window.innerWidth - tw - 6));

    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
}

// Shows a tooltip with full item details (name, rarity, description, stack count, hint).
// Used when hovering an inventory slot.
function _showSlotTooltip(def, count, anchorEl) {
    const tip = _ensureTooltip();
    const rc = rarityColors(def.rarity);
    tip.innerHTML = `
        <div class="inv-tip-name"   style="color:${rc.color}">${def.icon} ${itemName(def)}</div>
        <div class="inv-tip-rarity" style="color:${rc.color}">${def.rarity.toUpperCase()}</div>
        <div class="inv-tip-desc">${itemDesc(def)}</div>
        <div class="inv-tip-stack">Stack: <b>${count}</b></div>
        <div class="inv-tip-hint">Left-click: Use &nbsp;|&nbsp; Right-click: Reshuffle &nbsp;|&nbsp; Alt+click: Discard</div>`;
    tip.classList.add('visible');
    _positionTooltip(tip, anchorEl);
}

// Hides the tooltip by removing its visible class.
function _hideSlotTooltip() {
    if (_invTooltipEl) _invTooltipEl.classList.remove('visible');
}




//------------------------------------------------------------------------
//----------------------------ITEM ACTION HELPERS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Uses the first inventory item that matches the given defId.
function _useOneByDefId(defId) {
    const item = STATE.inventory.find(i => i.defId === defId);
    if (!item) return;
    useItem(item.uid);
}

// Sends the first matching item into the reshuffle pile (right-click action).
function _reshuffleOneByDefId(defId) {
    const item = STATE.inventory.find(i => i.defId === defId);
    if (!item) return;
    reshuffleRightClickItem(item.uid);
}

// Silently discards one item of this defId without adding to the reshuffle counter (alt+click action).
function _discardOneByDefId(defId) {
    const idx = STATE.inventory.findIndex(i => i.defId === defId);
    if (idx < 0) return;
    const def = ITEM_DEFS[defId];
    STATE.inventory.splice(idx, 1);
    trackAchStat('itemsSold');
    save();
    buildInventoryPanel();
    showToast(`${def.icon} ${t('item_discarded')}`);
}




//------------------------------------------------------------------------
//----------------------------SLOT BUILDER--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Attaches left-click (use), right-click (reshuffle), and alt+click (discard) handlers
// to an inventory slot element. Only called when the slot is not ironman-locked.
function _attachSlotInteractionHandlers(el, defId, isEmpty) {
    el.addEventListener('click', (e) => {
        _hideSlotTooltip();
        if (isEmpty) return;
        if (e.altKey) {
            _discardOneByDefId(defId);
            return;
        }
        _useOneByDefId(defId);
    });

    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        _hideSlotTooltip();
        if (dead || isEmpty) return;
        _reshuffleOneByDefId(defId);
    });
}

// Builds and returns a single inventory slot element for the given item defId.
// Handles empty state, ironman lock, rarity border tint, icon, stack count, and tooltip.
function _buildInvSlot(defId) {
    const def = ITEM_DEFS[defId];
    if (!def) return null;

    const count = STATE.inventory.filter(i => i.defId === defId).length;
    const isEmpty = count === 0;
    const isLocked = curMods.ironman;
    const rc = rarityColors(def.rarity);

    const el = document.createElement('div');
    el.className = 'inv-slot' + (isEmpty ? ' inv-slot-empty' : '') + (isLocked ? ' ironman-lock' : '');
    el.dataset.defId = defId;

    if (!isEmpty) el.style.borderColor = rc.border;

    el.innerHTML = `
        <span class="inv-slot-icon">${def.icon}</span>
        ${count > 0 ? `<span class="inv-slot-count">${count}</span>` : ''}`;

    if (!isLocked) _attachSlotInteractionHandlers(el, defId, isEmpty);

    el.addEventListener('mouseenter', () => _showSlotTooltip(def, count, el));
    el.addEventListener('mouseleave', _hideSlotTooltip);

    return el;
}




//------------------------------------------------------------------------
//----------------------------SLOT GROUP BUILDER--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds and returns a group container element (label + slots row) for the given group definition.
// Returns null if none of the group's item definitions exist in ITEM_DEFS.
function _buildInvGroup(group) {
    const defsExist = group.slots.some(id => ITEM_DEFS[id]);
    if (!defsExist) return null;

    const groupEl = document.createElement('div');
    groupEl.className = 'inv-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'inv-group-label';
    labelEl.textContent = group.label;
    groupEl.appendChild(labelEl);

    const slotsEl = document.createElement('div');
    slotsEl.className = 'inv-group-slots';

    group.slots.forEach(defId => {
        const slot = _buildInvSlot(defId);
        if (slot) slotsEl.appendChild(slot);
    });

    groupEl.appendChild(slotsEl);
    return groupEl;
}




//------------------------------------------------------------------------
//----------------------------INVENTORY PANEL-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Rebuilds the entire inventory panel from scratch.
// Called whenever inventory state changes (item used, gained, discarded, reshuffled).
function buildInventoryPanel() {
    _hideSlotTooltip();

    const panel = document.getElementById('inv-panel');
    if (!panel) return;

    panel.innerHTML = '';

    // Header row: panel title and reshuffle progress counter
    const topRow = document.createElement('div');
    topRow.className = 'inv-panel-toprow';
    topRow.innerHTML = `
        <span class="inv-panel-label">INVENTORY</span>
        <span id="reshuffle-counter">♻ ${reshuffleCount}/${RESHUFFLE_GOAL}</span>`;
    panel.appendChild(topRow);

    // Build each slot group
    INV_SLOT_GROUPS.forEach(group => {
        const groupEl = _buildInvGroup(group);
        if (groupEl) panel.appendChild(groupEl);
    });

    checkInventoryAchievements();
    updateReshuffleCounter();

}




//------------------------------------------------------------------------
//----------------------------PANEL POSITIONING---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Repositions the inventory panel relative to the puzzle grid.
// Places it to the right of the grid when there's enough screen width,
// or below the grid on narrow screens.
function _repositionInvPanel() {
    const grid = document.getElementById('ptable');
    const panel = document.getElementById('inv-panel');
    if (!grid || !panel) return;

    const gr = grid.getBoundingClientRect();
    const minLeft = gr.right + 20;

    if (minLeft + 226 < window.innerWidth) {
        // Enough room — place to the right, aligned to the grid's top edge
        panel.style.left = minLeft + 'px';
        panel.style.top = gr.top + 'px';
    } else {
        // Too narrow — place below the grid
        panel.style.left = '16px';
        panel.style.top = (gr.bottom + 20) + 'px';
    }
}




//------------------------------------------------------------------------
//----------------------------PUBLIC TOOLTIP API--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Attaches an inventory-style tooltip to any DOM element representing a reward item
// (e.g. win overlay rewards, gate rewards). Shows name and description only — no stack count.
// Call this after the element has been inserted into the DOM.
function attachItemTooltip(el, defId) {
    const def = ITEM_DEFS[defId];
    if (!def || !el) return;

    el.addEventListener('mouseenter', () => {
        const tip = _ensureTooltip();
        const rc = rarityColors(def.rarity);
        tip.innerHTML = `
            <div class="inv-tip-name" style="color:${rc.color}">${def.icon} ${itemName(def)}</div>
            <div class="inv-tip-desc">${itemDesc(def)}</div>`;
        tip.classList.add('visible');
        _positionTooltip(tip, el);
    });

    el.addEventListener('mouseleave', _hideSlotTooltip);
}