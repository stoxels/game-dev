import { _clearTooltip } from './hub-tooltips.js';
import { _buildItemChipHTML } from './hub-mass-sell.js';
import { Audio_Manager } from '../audio/audio.js';
import { _equipped, _inventory, _renderEquipSlot, _renderEquipSlots, _renderInventory, _renderInventoryCell, _renderStatsList, _updateInvCount, saveHubState } from './hub.js';
import { SLOT_ACCEPTS } from './hub-drag-and-drop.js';
import { _canEquipInSlot, _getWeaponHands, _showRequirementsToast, _tryAutoUnequipOffhandForTwoHander } from '../loot/loot-requirements.js';

//------------------------------------------------------------------------
//-------------------EQUIPMENT SLOT HOVER LIST-----------------------------
//------------------------------------------------------------------------
// Hovering a paperdoll slot on the character sheet opens a small list beside
// it with every stash item that fits that slot (like the World of Warcraft
// gear list). Hover an entry for its tooltip, click it to equip it there.

const LEAVE_GRACE_MS = 220;

let _flyout = null;
let _flyoutSlotId = null;
let _hideTimer = null;
let _bound = false;

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// True when the item's slotType fits the given paperdoll slot.
// weapon1: melee weapons only (any hands, never shields).
// weapon2: shields or ONE-handed weapons only (dual-wield off-hand; 2H rejected).
export function _slotAcceptsItem(slotId, item) {
    if (!item || item.category !== 'equip') return false;
    if (slotId === 'weapon1') return item.slotType === 'weapon';
    if (slotId === 'weapon2') {
        if (item.slotType === 'shield') return true;
        if (item.slotType !== 'weapon') return false;
        if (typeof _getWeaponHands === 'function') {
            return _getWeaponHands(item) === 1;
        }
        return item.hands !== 2;
    }
    const required = SLOT_ACCEPTS[slotId];
    return required && required === item.slotType;
}

// Equips the stash item at row r / column c into the given paperdoll slot
// (the item already there goes back into that stash cell). Used by the
// right-click quick-equip and by the slot hover list. `rejectEl` (optional)
// gets the red reject flash when requirements are not met. Returns true when
// the item was equipped.
export function _equipFromInventory(r, c, slotId, rejectEl) {
    const item = _inventory[r] && _inventory[r][c];
    if (!item || item.category !== 'equip' || !_slotAcceptsItem(slotId, item)) return false;
    const flashReject = () => {
        if (!rejectEl) return;
        rejectEl.classList.add('sx-slot-reject');
        setTimeout(() => rejectEl.classList.remove('sx-slot-reject'), 600);
    };

    const gate = _canEquipInSlot(item, slotId);
    if (!gate.ok) {
        // Two-hand rule: equipping a 2H weapon auto-unequips the off-hand.
        if (gate.handError === 'two_handed_blocks_offhand' && slotId === 'weapon1'
            && typeof _tryAutoUnequipOffhandForTwoHander === 'function'
            && _tryAutoUnequipOffhandForTwoHander()) {
            const retry = _canEquipInSlot(item, slotId);
            if (!retry.ok) {
                _showRequirementsToast('equip', retry, item);
                flashReject();
                return false;
            }
        } else {
            _showRequirementsToast('equip', gate, item);
            flashReject();
            return false;
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
    return true;
}

// Every stash item that fits the slot, best (highest item level) first, with
// the stash cell it sits in.
function _candidatesFor(slotId) {
    const out = [];
    for (let r = 0; r < _inventory.length; r++) {
        for (let c = 0; c < _inventory[r].length; c++) {
            const item = _inventory[r][c];
            if (item && _slotAcceptsItem(slotId, item)) out.push({ item, r, c });
        }
    }
    return out.sort((a, b) => (b.item.itemLevel || 0) - (a.item.itemLevel || 0));
}

// Creates the floating list once. It lives on the page body, outside the hub
// screen, so the drag-and-drop pick-up never treats its entries as stash items.
function _ensureFlyout() {
    if (_flyout) return _flyout;
    _flyout = document.createElement('div');
    _flyout.className = 'sx-equip-flyout';
    _flyout.addEventListener('mouseenter', () => clearTimeout(_hideTimer));
    _flyout.addEventListener('mouseleave', _scheduleHide);
    _flyout.addEventListener('click', (event) => {
        const cell = event.target.closest('.sx-equip-flyout-cell');
        if (!cell) return;
        const done = _equipFromInventory(+cell.dataset.r, +cell.dataset.c, _flyoutSlotId, null);
        if (done) _hideFlyout();
    });
    document.body.appendChild(_flyout);
    return _flyout;
}

// Puts the list next to the slot: outward from the paperdoll's middle (left
// column opens leftwards, right column rightwards, weapon row upwards),
// then keeps it on screen.
function _placeFlyout(slotEl) {
    const r = slotEl.getBoundingClientRect();
    const box = _flyout.getBoundingClientRect();
    const col = slotEl.closest('.sx-equip-left') ? 'left' : slotEl.closest('.sx-equip-right') ? 'right' : 'bottom';
    let x = col === 'left' ? r.left - box.width - 6 : col === 'right' ? r.right + 6 : r.left;
    let y = col === 'bottom' ? r.top - box.height - 6 : r.top;
    x = Math.max(6, Math.min(window.innerWidth - box.width - 6, x));
    y = Math.max(6, Math.min(window.innerHeight - box.height - 6, y));
    _flyout.style.left = Math.round(x) + 'px';
    _flyout.style.top = Math.round(y) + 'px';
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Closes the list and its tooltip.
export function _hideFlyout() {
    clearTimeout(_hideTimer);
    if (_flyout) _flyout.classList.remove('show');
    _flyoutSlotId = null;
    _clearTooltip();
}

// Closes the list shortly after the mouse left both the slot and the list,
// so the cursor can travel from the slot into it.
function _scheduleHide() {
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(_hideFlyout, LEAVE_GRACE_MS);
}

// Opens the list for a slot (nothing opens when no stash item fits it).
function _showFlyout(slotEl) {
    const slotId = slotEl.dataset.slotId;
    const items = _candidatesFor(slotId);
    clearTimeout(_hideTimer);
    if (!items.length) { _hideFlyout(); return; }
    const box = _ensureFlyout();
    _flyoutSlotId = slotId;
    // The chips' own drag start is switched off: here a click equips.
    box.innerHTML = items.map(({ item, r, c }) =>
        `<div class="sx-equip-flyout-cell" data-r="${r}" data-c="${c}">${_buildItemChipHTML(item).replace(/onmousedown="[^"]*"/, '')}</div>`
    ).join('');
    box.classList.add('show');
    _placeFlyout(slotEl);
    // Item pictures change the list's size when they finish loading.
    box.querySelectorAll('img').forEach(img => img.addEventListener('load', () => _placeFlyout(slotEl)));
}

// Hooks the hover behaviour onto the paperdoll slots (one set of listeners
// for the whole page; only slots on the character sheet react).
export function _bindEquipFlyout() {
    if (_bound) return;
    _bound = true;
    document.addEventListener('mouseover', (event) => {
        const slotEl = event.target.closest && event.target.closest('.sx-equip-slot');
        if (!slotEl || !slotEl.closest('#screen-hub')) return;
        if (slotEl.dataset.slotId === _flyoutSlotId) { clearTimeout(_hideTimer); _placeFlyout(slotEl); return; }
        _showFlyout(slotEl);
    });
    document.addEventListener('mouseout', (event) => {
        const slotEl = event.target.closest && event.target.closest('.sx-equip-slot');
        if (!slotEl || !_flyoutSlotId) return;
        if (event.relatedTarget && slotEl.contains(event.relatedTarget)) return;
        _scheduleHide();
    });
    // A drag in progress or a click on the screen closes the list.
    document.addEventListener('mousedown', (event) => {
        if (_flyout && !_flyout.contains(event.target)) _hideFlyout();
    }, true);
}
