//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact'];
const HOARDER_THRESHOLD = 10;

const TOAST_DISPLAY_DURATION_MS = 8000;
const TOAST_MAX_VISIBLE = 6; // oldest gets force-removed beyond this

const activeToasts = []; // { msg, el, removing, timeoutId }


//------------------------------------------------------------------------
//-------------------INVENTORY ACHIEVEMENT HELPERS------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the player is currently holding at least one item of every rarity tier
function _hasAllRarityTiers() {
    const raritiesPresent = new Set(
        STATE.inventory
            .map(item => ITEM_DEFS[item.defId]?.rarity)
            .filter(Boolean)
    );
    return RARITY_TIERS.every(r => raritiesPresent.has(r));
}

// Checks and tracks the hoarder achievement (reaching max inventory size)
// Only fires once per level, guarded by _maxInventoryTrackedThisLevel
function _checkHoarderAchievement() {
    if (window._maxInventoryTrackedThisLevel) return;
    if (STATE.inventory.length < HOARDER_THRESHOLD) return;

    window._maxInventoryTrackedThisLevel = true;
    trackAchStat('maxInventoryReached');
}

// Checks and tracks the collector achievement (holding every rarity simultaneously)
// Only fires once per level, guarded by _collectorTrackedThisLevel
function _checkCollectorAchievement() {
    if (window._collectorTrackedThisLevel) return;
    if (!_hasAllRarityTiers()) return;

    window._collectorTrackedThisLevel = true;
    trackAchStat('collectorAllRarities');
}


//------------------------------------------------------------------------
//-------------------INVENTORY ACHIEVEMENT TRACKING-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called after every inventory change to check whether any
// inventory-related achievements have been unlocked this level
function checkInventoryAchievements() {
    _checkHoarderAchievement();
    _checkCollectorAchievement();
}


//------------------------------------------------------------------------
//-------------------TOAST STACK SYSTEM------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Removes a single toast: plays its fade-out, then deletes the element
// and its entry once the animation finishes.
function _removeToast(entry) {
    if (entry.removing) return;
    entry.removing = true;
    clearTimeout(entry.timeoutId);

    entry.el.classList.add('toast-out');
    entry.el.addEventListener('animationend', () => {
        entry.el.remove();
        const idx = activeToasts.indexOf(entry);
        if (idx !== -1) activeToasts.splice(idx, 1);
    }, { once: true });
}

// Instantly discards a toast entry (no fade-out animation). Used when a new
// message replaces an identical one that is still visible.
function _discardToastEntry(entry) {
    clearTimeout(entry.timeoutId);
    entry.el.remove();
    const idx = activeToasts.indexOf(entry);
    if (idx !== -1) activeToasts.splice(idx, 1);
}

// Adds a new message to the bottom of the stack. It fades in independently
// and fades out on its own timer, without affecting other visible messages.
// If the same message is already visible, it is replaced so repeated uses of
// an item always surface a fresh toast instead of being suppressed.
// `accentColor` (optional) tints the message text — used e.g. for
// rarity-colored loot / pickup notifications.
function showToast(msg, accentColor) {
    const container = document.getElementById('toast-stack');
    if (!container) return;

    const dup = activeToasts.find(t => t.msg === msg);
    if (dup) _discardToastEntry(dup);

    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.textContent = msg;
    if (accentColor) el.style.color = accentColor;
    container.appendChild(el);

    const entry = { msg, el, removing: false, timeoutId: null };
    activeToasts.push(entry);

    // Cap how many messages can pile up — trim the oldest first.
    if (activeToasts.length > TOAST_MAX_VISIBLE) {
        _removeToast(activeToasts[0]);
    }

    entry.timeoutId = setTimeout(
        () => _removeToast(entry),
        (typeof SETTINGS !== 'undefined' ? SETTINGS.toastDuration : TOAST_DISPLAY_DURATION_MS / 1000) * 1000
    );

    // Returns the toast element so callers can add extra styling (e.g. the
    // boss-colored left stripe on boss-ability damage toasts).
    return el;
}

// Clears every visible/pending toast immediately. Called on level reset or scene transitions.
function resetToastQueue() {
    activeToasts.forEach(t => {
        clearTimeout(t.timeoutId);
        t.el.remove();
    });
    activeToasts.length = 0;

    const container = document.getElementById('toast-stack');
    if (container) container.innerHTML = '';
}



//------------------------------------------------------------------------
//----------------------------ITEM GAIN POPUP------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// How long (ms) a gain popup stays fully visible before it starts fading out.
const ITEM_GAIN_POPUP_HOLD_MS = 1400;
// Duration (ms) of the rise/fade transition. Must match the injected CSS.
const ITEM_GAIN_POPUP_FADE_MS = 400;

// Tracks in-flight popups keyed by defId, so multiple grants of the same
// item in quick succession (e.g. two lucky drops of the same defId) stack
// into a single incrementing "+N" instead of spawning overlapping popups.
const _itemGainPopupState = {};

let _itemGainPopupStyleInjected = false;

// Injects the popup's CSS once, lazily on first use.
function _ensureItemGainPopupStyle() {
    if (_itemGainPopupStyleInjected) return;
    _itemGainPopupStyleInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .item-gain-popup {
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            font-family: var(--PX, inherit);
            font-weight: bold;
            font-size: 14px;
            color: #2ecc71;
            text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9);
            opacity: 0;
            transform: translate(-50%, 0);
            transition: transform ${ITEM_GAIN_POPUP_FADE_MS}ms ease-out,
                        opacity ${ITEM_GAIN_POPUP_FADE_MS}ms ease-out;
        }
        .item-gain-popup.igp-show {
            opacity: 1;
            transform: translate(-50%, -18px);
        }
        .item-gain-popup.igp-hide {
            opacity: 0;
            transform: translate(-50%, -34px);
        }
        .item-gain-popup.igp-bump {
            transform: translate(-50%, -22px) scale(1.15);
        }
    `;
    document.head.appendChild(style);
}

// Finds the DOM element for an inventory slot by its defId.
// Slots are always rendered (even at count 0) as long as the defId is
// listed in INV_SLOT_GROUPS, so this is reliable during normal gameplay.
function _findInvSlotEl(defId) {
    return document.querySelector(`.inv-slot[data-def-id="${defId}"]`);
}

// Positions the popup centered above the given slot element.
function _positionItemGainPopup(el, slotEl) {
    const r = slotEl.getBoundingClientRect();
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top}px`;
}

// Removes a popup's state entry and its DOM element once its animation
// cycle is fully finished.
function _clearItemGainPopup(defId) {
    const state = _itemGainPopupState[defId];
    if (!state) return;
    clearTimeout(state.holdTimeoutId);
    state.el.remove();
    delete _itemGainPopupState[defId];
}

// Starts (or restarts) the hold-then-fade timer for a popup.
function _scheduleItemGainPopupDismiss(defId) {
    const state = _itemGainPopupState[defId];
    if (!state) return;

    clearTimeout(state.holdTimeoutId);
    state.holdTimeoutId = setTimeout(() => {
        state.el.classList.remove('igp-show');
        state.el.classList.add('igp-hide');
        setTimeout(() => _clearItemGainPopup(defId), ITEM_GAIN_POPUP_FADE_MS);
    }, ITEM_GAIN_POPUP_HOLD_MS);
}

// Shows a small floating "+N" above an item's inventory slot to
// acknowledge a gain (lucky tile, bonus reward, milestone claim, passive
// effect, etc). Calls for the same defId in quick succession stack into
// one incrementing counter instead of spawning overlapping popups.
//
// Silently no-ops if the slot isn't currently in the DOM (e.g. the
// inventory panel hasn't been built yet).
function showItemGainPopup(defId, count = 1) {
    const slotEl = _findInvSlotEl(defId);
    if (!slotEl || count <= 0) return;

    _ensureItemGainPopupStyle();

    const existing = _itemGainPopupState[defId];

    if (existing) {
        existing.count += count;
        existing.el.textContent = `+${existing.count}`;
        _positionItemGainPopup(existing.el, slotEl);

        existing.el.classList.remove('igp-bump');
        void existing.el.offsetWidth; // force reflow so the class can re-trigger
        existing.el.classList.add('igp-bump');

        _scheduleItemGainPopupDismiss(defId);
        return;
    }

    const el = document.createElement('div');
    el.className = 'item-gain-popup';
    el.textContent = `+${count}`;
    document.body.appendChild(el);
    _positionItemGainPopup(el, slotEl);

    requestAnimationFrame(() => el.classList.add('igp-show'));

    _itemGainPopupState[defId] = { el, count, holdTimeoutId: null };
    _scheduleItemGainPopupDismiss(defId);
}