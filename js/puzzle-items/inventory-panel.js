//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE----------------------------
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
    { label: 'Power', slots: ['rowSolve', 'colSolve', 'surveyScope', 'artifactComplete'] },
    { label: 'Cursed', slots: ['cursedReveal', 'cursedTime', 'cursedShield', 'cursedRowSolve', 'cursedColSolve', 'cursedRowCol', 'chronoFracture'] },
    { label: 'Special', slots: ['pearlOfHaste', 'pearlOfSwiftness', 'grandPearl', 'theWitch', 'goldenClock', 'shadowSeal'] },
];

// Maps inventory group labels to their translation keys.
const INV_GROUP_LABEL_KEYS = {
    'Reveal': 'itm_group_reveal',
    'Mark': 'itm_group_mark',
    'Time': 'itm_group_time',
    'Utility': 'itm_group_utility',
    'Power': 'itm_group_power',
    'Cursed': 'itm_group_cursed',
    'Special': 'itm_group_special',
};

// Maps rarities that have no dedicated rar_* key in the T table.
const RARITY_EXTRA_LABEL_KEYS = {
    epic: 'itm_rar_epic',
    artifact: 'itm_rar_artifact',
};

// Returns the translated display label for a rarity string.
function _rarityLabel(rarity) {
    return RARITY_EXTRA_LABEL_KEYS[rarity]
        ? t(RARITY_EXTRA_LABEL_KEYS[rarity])
        : t('rar_' + rarity);
}

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

// Builds the tooltip's inner HTML for an item. When `count` is provided, includes
// rarity, stack count, and the interaction hint (slot tooltips); when omitted,
// returns just the name and description (simple reward-item tooltips).
function _buildTooltipHtml(def, count) {
    const rc = rarityColors(def.rarity);
    const nameLine = `<div class="inv-tip-name" style="color:${rc.color}">${def.icon} ${itemName(def)}</div>`;
    const descLine = `<div class="inv-tip-desc">${itemDesc(def)}</div>`;

    if (count === undefined) return nameLine + descLine;

    const rarityLine = `<div class="inv-tip-rarity" style="color:${rc.color}">${_rarityLabel(def.rarity)}</div>`;
    const stackLine = `<div class="inv-tip-stack">${t('itm_tip_stack').replace('{n}', count)}</div>`;
    const hintLine = `<div class="inv-tip-hint">${t('itm_tip_hint')}</div>`;
    return nameLine + rarityLine + descLine + stackLine + hintLine;
}

// Shows the shared tooltip for an item, anchored to the given element.
// Pass `count` for full slot tooltips (adds rarity/stack/hint); omit it for
// simple item tooltips (name + description only).
function _showTooltip(def, anchorEl, count) {
    const tip = _ensureTooltip();
    tip.innerHTML = _buildTooltipHtml(def, count);
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

// Finds the first inventory item matching the given defId, or undefined if none exists.
function _findInventoryItemByDefId(defId) {
    return STATE.inventory.find(i => i.defId === defId);
}

// Uses the first inventory item that matches the given defId.
function _useOneByDefId(defId) {
    const item = _findInventoryItemByDefId(defId);
    if (!item) return;
    useItem(item.uid);
}

// Sends the first matching item into the reshuffle pile (right-click action).
function _reshuffleOneByDefId(defId) {
    const item = _findInventoryItemByDefId(defId);
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

    el.addEventListener('mouseenter', () => _showTooltip(def, el, count));
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
    labelEl.textContent = INV_GROUP_LABEL_KEYS[group.label] ? t(INV_GROUP_LABEL_KEYS[group.label]) : group.label;
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
        <span class="inv-panel-label">${t('itm_panel_inventory')}</span>
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

    el.addEventListener('mouseenter', () => _showTooltip(def, el));
    el.addEventListener('mouseleave', _hideSlotTooltip);
}