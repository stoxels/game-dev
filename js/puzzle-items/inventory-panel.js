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

// Currently open flyout group (label string) — null when none is open.
// One flyout at a time; switching category buttons swaps the panel.
let _invOpenFlyoutGroup = null;
// Close-on-leave grace timer id: keeps the flyout open while the pointer
// travels across the small gap between the category button and the panel.
let _invFlyoutCloseTimer = null;




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
//----------------------------FLYOUT PANEL--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Cancels a pending flyout close (pointer came back in time).
function _invCancelFlyoutClose() {
    if (_invFlyoutCloseTimer) {
        clearTimeout(_invFlyoutCloseTimer);
        _invFlyoutCloseTimer = null;
    }
}

// Schedules the open flyout to close shortly after the pointer left both
// the button and the panel. The delay bridges the physical gap between
// them so diagonal mouse paths don't flicker the panel shut. Never fires
// while a flyout is PINNED — pinning means "stay open until I click".
function _invScheduleFlyoutClose() {
    if (window._invPinnedFlyoutGroup) return;
    _invCancelFlyoutClose();
    _invFlyoutCloseTimer = setTimeout(() => {
        _invFlyoutCloseTimer = null;
        if (!window._invPinnedFlyoutGroup) closeInventoryFlyout();
    }, 220);
}

// Opens (or switches to) the flyout panel for the given group label.
// Renders the group's slot row into #inv-flyout and anchors it above the
// category button that was hovered. Empty groups (no items of any of the
// group's defs in the inventory at all) still open — the slots show as
// dimmed empties, matching the old always-visible bar behaviour.
function openInventoryFlyout(groupLabel, anchorBtn) {
    const flyout = document.getElementById('inv-flyout');
    if (!flyout) return;
    _invCancelFlyoutClose();

    const group = INV_SLOT_GROUPS.find(g => g.label === groupLabel);
    if (!group) return;

    // Rebuild content only when the group actually changes — keeps hover
    // jitter from visibly re-rendering the same slots over and over.
    if (_invOpenFlyoutGroup !== groupLabel || !flyout.firstChild) {
        _invOpenFlyoutGroup = groupLabel;
        flyout.innerHTML = '';
        const slotsEl = document.createElement('div');
        slotsEl.className = 'inv-group-slots';
        group.slots.forEach(defId => {
            const slot = _buildInvSlot(defId);
            if (slot) slotsEl.appendChild(slot);
        });
        flyout.appendChild(slotsEl);
    }

    // Highlight the active category button
    document.querySelectorAll('.inv-cat-btn.active').forEach(b => b.classList.remove('active'));
    if (anchorBtn) anchorBtn.classList.add('active');

    flyout.classList.add('open');

    // Anchor horizontally above the button (clamped to the viewport),
    // bottom edge flush with the top of the compact bar. Render hidden
    // for one measurement, position, then let the .open class take over.
    const bar = document.getElementById('inv-panel');
    const barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight;
    const br = anchorBtn.getBoundingClientRect();
    flyout.style.visibility = 'hidden';
    flyout.style.display = 'flex';
    flyout.classList.add('open');
    // Measure after display so offsetWidth is real, then place.
    const fw = flyout.offsetWidth;
    let left = br.left + br.width / 2 - fw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - fw - 8));
    flyout.style.left = left + 'px';
    flyout.style.bottom = (window.innerHeight - barTop) + 'px';
    flyout.style.top = 'auto';
    flyout.style.visibility = '';
    flyout.style.display = '';
}

// Hides the flyout panel and clears button highlighting. Safe to call
// when nothing is open.
function closeInventoryFlyout() {
    const flyout = document.getElementById('inv-flyout');
    if (flyout) flyout.classList.remove('open');
    _invOpenFlyoutGroup = null;
    document.querySelectorAll('.inv-cat-btn.active').forEach(b => b.classList.remove('active'));
}

// True while the pointer is over the compact bar itself — the bar keeps
// the flyout open so moving from the panel down to another button feels
// like switching categories, not closing.
function _invPointerInBar(x, y) {
    const bar = document.getElementById('inv-panel');
    if (!bar) return false;
    const r = bar.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
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
//
// Compact layout: one button per item category (INV_SLOT_GROUPS). Hovering
// a button opens a flyout panel above the bar showing that category's slots;
// clicking a slot inside the flyout uses the item exactly like the old
// always-visible bar. A pinned (clicked) flyout stays open across rebuilds
// so using an item — which triggers buildInventoryPanel() — doesn't slam
// the panel shut on the player's hand.
function buildInventoryPanel() {
    _hideSlotTooltip();

    const panel = document.getElementById('inv-panel');
    if (!panel) return;

    // Any currently-open flyout (hover-opened or pinned) must be refreshed
    // after the rebuild so slot counts/badges never go stale after an item
    // use — the rebuild itself IS the inventory change.
    const openGroup = _invOpenFlyoutGroup;
    const pinnedGroup = window._invPinnedFlyoutGroup || null;

    panel.innerHTML = '';

    // Header block: INVENTORY label + reshuffle progress counter
    const topRow = document.createElement('div');
    topRow.className = 'inv-panel-toprow';
    topRow.innerHTML = `
        <span class="inv-panel-label">${t('itm_panel_inventory')}</span>
        <span id="reshuffle-counter">♻ ${reshuffleCount}/${RESHUFFLE_GOAL}</span>`;
    panel.appendChild(topRow);

    // Compact-screen chip: the label block is hidden below 700px, but the
    // reshuffle counter must stay readable — render a second, tiny chip
    // that only the small-screen CSS shows.
    const chip = document.createElement('span');
    chip.id = 'reshuffle-counter-mini';
    chip.className = 'reshuffle-counter-mini';
    chip.textContent = `♻ ${reshuffleCount}/${RESHUFFLE_GOAL}`;
    panel.appendChild(chip);

    // One compact category button per group — the flyout shows its slots
    INV_SLOT_GROUPS.forEach(group => {
        const defsExist = group.slots.some(id => ITEM_DEFS[id]);
        if (!defsExist) return;

        // Total owned items across the group's defs → badge on the button
        const owned = group.slots.reduce((n, id) =>
            n + STATE.inventory.filter(i => i.defId === id).length, 0);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inv-cat-btn';
        btn.dataset.group = group.label;
        btn.setAttribute('aria-label', t(INV_GROUP_LABEL_KEYS[group.label] || group.label));
        btn.innerHTML = `
            <span class="inv-cat-icon">${invGroupIcon(group.label)}</span>
            <span class="inv-cat-label">${t(INV_GROUP_LABEL_KEYS[group.label] || group.label)}</span>
            ${owned > 0 ? `<span class="inv-cat-count">${owned}</span>` : ''}`;

        btn.addEventListener('mouseenter', () => openInventoryFlyout(group.label, btn));
        btn.addEventListener('mouseleave', (e) => {
            // Keep the panel open while the pointer is still inside the bar
            // (moving to a neighbouring button switches instead of closing).
            if (!_invPointerInBar(e.clientX, e.clientY)) _invScheduleFlyoutClose();
        });
        // Click pins the flyout: it stays open (also across rebuilds) until
        // the button is clicked again or a click lands outside the bar.
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            _invCancelFlyoutClose();
            if (window._invPinnedFlyoutGroup === group.label) {
                window._invPinnedFlyoutGroup = null;
                closeInventoryFlyout();
            } else {
                window._invPinnedFlyoutGroup = group.label;
                openInventoryFlyout(group.label, btn);
            }
        });

        panel.appendChild(btn);
    });

    // Ensure the flyout element exists (created once, lives outside the bar
    // so its content survives bar rebuilds).
    _ensureInvFlyoutEl();

    // Refresh an open flyout with fresh slots (anchored to its button in
    // the rebuilt bar). Covers both hover-open and pinned states — otherwise
    // using an item would leave the old stack count showing. Reset the
    // open-group cache first so openInventoryFlyout's same-group reuse guard
    // re-renders the slots instead of keeping the stale DOM.
    if (openGroup) {
        const anchor = panel.querySelector(`.inv-cat-btn[data-group="${openGroup}"]`);
        if (anchor) {
            _invOpenFlyoutGroup = null;
            openInventoryFlyout(openGroup, anchor);
        } else {
            // Group vanished (no defs) — close and drop any pin.
            window._invPinnedFlyoutGroup = null;
            closeInventoryFlyout();
        }
    } else if (pinnedGroup) {
        // Pinned but not currently rendered open (edge case) — drop the pin.
        window._invPinnedFlyoutGroup = null;
    }

    checkInventoryAchievements();
    updateReshuffleCounter();
}



//------------------------------------------------------------------------
//----------------------------FLYOUT ELEMENT------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates the shared flyout container once (a body-level sibling of the
// bar, so bar.innerHTML='' rebuilds never destroy its children mid-use).
function _ensureInvFlyoutEl() {
    let flyout = document.getElementById('inv-flyout');
    if (flyout) return flyout;

    flyout = document.createElement('div');
    flyout.id = 'inv-flyout';
    document.body.appendChild(flyout);

    // Keep open while the pointer is inside the panel; start the close
    // grace timer as soon as it leaves (button leave already scheduled one —
    // this is what closes it when the pointer exits upward out of the panel).
    flyout.addEventListener('mouseenter', _invCancelFlyoutClose);
    flyout.addEventListener('mouseleave', (e) => {
        if (!_invPointerInBar(e.clientX, e.clientY)) _invScheduleFlyoutClose();
    });

    // A click anywhere outside the bar/flyout un-pins and closes (only
    // matters while pinned — hover users just move the pointer away).
    document.addEventListener('click', (e) => {
        if (!window._invPinnedFlyoutGroup) return;
        if (e.target.closest('#inv-panel') || e.target.closest('#inv-flyout')) return;
        window._invPinnedFlyoutGroup = null;
        closeInventoryFlyout();
    });

    return flyout;
}

// Small distinguishing icon per category (pure decoration next to the label).
function invGroupIcon(label) {
    switch (label) {
        case 'Reveal':  return '🔍';
        case 'Mark':    return '✏️';
        case 'Time':    return '⏳';
        case 'Utility': return '🛠️';
        case 'Power':   return '⚡';
        case 'Cursed':  return '💀';
        case 'Special': return '✨';
        default:        return '📦';
    }
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