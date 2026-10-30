import { Audio_Manager } from '../audio/audio.js';
import { trackAchStat } from '../achievements/achievements.js';
import { ITEM_DEFS } from '../puzzle-items/item-definitions.js';
import { STATE } from '../state.js';

//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

export const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact'];
export const HOARDER_THRESHOLD = 10;

export const TOAST_DISPLAY_DURATION_MS = 8000;
export const TOAST_MAX_VISIBLE = 6; // oldest gets force-removed beyond this

export const activeToasts = []; // { msg, el, removing, timeoutId }


//------------------------------------------------------------------------
//-------------------INVENTORY ACHIEVEMENT HELPERS------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the player is currently holding at least one item of every rarity tier
export function _hasAllRarityTiers() {
    const raritiesPresent = new Set(
        STATE.inventory
            .map(item => ITEM_DEFS[item.defId]?.rarity)
            .filter(Boolean)
    );
    return RARITY_TIERS.every(r => raritiesPresent.has(r));
}

// Checks and tracks the hoarder achievement (reaching max inventory size)
// Only fires once per level, guarded by _maxInventoryTrackedThisLevel
export function _checkHoarderAchievement() {
    if (window._maxInventoryTrackedThisLevel) return;
    if (STATE.inventory.length < HOARDER_THRESHOLD) return;

    window._maxInventoryTrackedThisLevel = true;
    trackAchStat('maxInventoryReached');
}

// Checks and tracks the collector achievement (holding every rarity simultaneously)
// Only fires once per level, guarded by _collectorTrackedThisLevel
export function _checkCollectorAchievement() {
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
export function checkInventoryAchievements() {
    _checkHoarderAchievement();
    _checkCollectorAchievement();
}


//------------------------------------------------------------------------
//-------------------TOAST STACK SYSTEM------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Removes a single toast: plays its fade-out, then deletes the element
// and its entry once the animation finishes.
export function _removeToast(entry) {
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
export function _discardToastEntry(entry) {
    clearTimeout(entry.timeoutId);
    entry.el.remove();
    const idx = activeToasts.indexOf(entry);
    if (idx !== -1) activeToasts.splice(idx, 1);
}

// Toast tone from its accent color: red-ish = warning, green/gold = reward,
// anything else (or none) = neutral info. Throttled so a burst of toasts
// (e.g. several combat messages in one tick) makes a single sound.
let _toastSfxLastMs = 0;
function _playToastSfx(accentColor) {
    const nowMs = Date.now();
    if (nowMs - _toastSfxLastMs < 300) return;
    _toastSfxLastMs = nowMs;
    let key = 'toast_info';
    const m = /^#([0-9a-f]{6})$/i.exec(String(accentColor || '').trim());
    if (m) {
        const n = parseInt(m[1], 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        if (r > 170 && g < 130 && b < 130) key = 'toast_warning';
        else if (g > 150 && r < 190 && b < 170) key = 'toast_reward';
        else if (r > 200 && g > 170 && b < 160) key = 'toast_reward';
    }
    Audio_Manager.playSFX(key);
}

// Smallest scale the bottom-left toast text may shrink to on a large grid.
const TOAST_MIN_SCALE = 0.65;
let _toastFitTimer = null;

// Widest and total height the visible toasts would have at full size,
// measured from the text itself (canvas) rather than the laid-out boxes, so
// the answer does not change when the font shrinks (wrapping would make the
// laid-out width jump and the scale flicker). Returns { w, h } in screen px.
function _toastNaturalSize(stack, cur) {
    const ctx = document.createElement('canvas').getContext('2d');
    const zoom = parseFloat(getComputedStyle(stack).zoom) || 1;
    const maxW = parseFloat(getComputedStyle(stack).maxWidth) || 520;
    let w = 0, h = 0;
    activeToasts.forEach(t => {
        const cs = getComputedStyle(t.el);
        const fs = parseFloat(cs.fontSize) / cur;
        ctx.font = cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
        w = Math.max(w, ctx.measureText(t.el.textContent).width);
        h += fs * 1.3 + 5;
    });
    return { w: Math.min(w, maxW) * zoom, h: h * zoom };
}

// Shrinks the bottom-left toast text (CSS variable --sx-toast-s, read by
// .toast-msg) just enough that the widest message stops reaching into the
// puzzle grid or its row clue numbers. Combat toasts (centre of the grid)
// are not affected.
function _fitToastsToGrid() {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const grid = document.getElementById('ptable');
    const gr = grid ? grid.getBoundingClientRect() : null;
    const cur = parseFloat(stack.style.getPropertyValue('--sx-toast-s')) || 1;
    let scale = 1;
    if (gr && gr.width > 0 && gr.height > 0 && activeToasts.length > 0) {
        const r = stack.getBoundingClientRect();
        const nat = _toastNaturalSize(stack, cur);
        if (nat.w > 0 && r.bottom - nat.h < gr.bottom && r.bottom > gr.top) {
            scale = Math.min(1, Math.max(TOAST_MIN_SCALE, (gr.left - r.left - 8) / nat.w));
        }
    }
    const rounded = Math.round(scale * 100) / 100;
    if (rounded === 1) { if (stack.style.getPropertyValue('--sx-toast-s')) stack.style.removeProperty('--sx-toast-s'); }
    else if (cur !== rounded) stack.style.setProperty('--sx-toast-s', String(rounded));
}

// Keeps the fit up to date (grid size can change) while any toast is visible.
function _startToastFit() {
    _fitToastsToGrid();
    if (_toastFitTimer) return;
    _toastFitTimer = setInterval(() => {
        _fitToastsToGrid();
        if (activeToasts.length === 0) { clearInterval(_toastFitTimer); _toastFitTimer = null; }
    }, 250);
}

// Appends a pre-built toast element to the stack: dedupes identical
// messages, caps the visible count, and arms the fade-out timer.
// Shared by the plain-text showToast() and the HTML showHtmlToast().
function _appendToastEl(el, key, accentColor) {
    const container = document.getElementById('toast-stack');
    if (!container) return;

    const dup = activeToasts.find(t => t.msg === key);
    if (dup) _discardToastEntry(dup);

    if (accentColor) el.style.color = accentColor;
    _playToastSfx(accentColor);
    container.appendChild(el);

    const entry = { msg: key, el, removing: false, timeoutId: null };
    activeToasts.push(entry);
    _startToastFit();

    // Cap how many messages can pile up - trim the oldest first.
    if (activeToasts.length > TOAST_MAX_VISIBLE) {
        _removeToast(activeToasts[0]);
    }

    entry.timeoutId = setTimeout(
        () => _removeToast(entry),
        (typeof SETTINGS !== 'undefined' ? globalThis.SETTINGS.toastDuration : TOAST_DISPLAY_DURATION_MS / 1000) * 1000
    );

    // Returns the toast element so callers can add extra styling (e.g. the
    // boss-colored left stripe on boss-ability damage toasts).
    return el;
}

// ---- PLURALS --------------------------------------------------------------
// Toast templates mark optional endings with a bracketed suffix: "{n} cell(s)",
// "{n} Zelle(n)", "{n} Markierung(en)". Once the number is filled in, this
// resolves each marker against the closest number before it: exactly 1 drops
// the suffix ("1 cell", "1 Zelle"), anything else keeps it ("3 cells",
// "3 Zellen"). A marker with no number just before it is left untouched.
const PLURAL_MARK_RE = /(\d+(?:[.,]\d+)?)|(?<=[A-Za-zÄÖÜäöüß])\((s|n|e|en)\)/g;
const PLURAL_MAX_GAP = 40;

function _pluralizeToastText(text) {
    const str = String(text);
    let lastNum = null;
    let lastEnd = -Infinity;
    return str.replace(PLURAL_MARK_RE, (match, num, suffix, offset) => {
        if (num !== undefined) {
            lastNum = Number(num.replace(',', '.'));
            lastEnd = offset + match.length;
            return match;
        }
        if (lastNum === null || offset - lastEnd > PLURAL_MAX_GAP) return match;
        return lastNum === 1 ? '' : suffix;
    });
}

// Adds a new message to the bottom of the stack. It fades in independently
// and fades out on its own timer, without affecting other visible messages.
// If the same message is already visible, it is replaced so repeated uses of
// an item always surface a fresh toast instead of being suppressed.
// `accentColor` (optional) tints the message text - used e.g. for
// rarity-colored loot / pickup notifications.
export function showToast(msg, accentColor) {
    msg = _pluralizeToastText(msg);
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.textContent = msg;
    return _appendToastEl(el, msg, accentColor);
}

// ---- COMBAT TOASTS --------------------------------------------------------
// Short, high-priority combat / boss-ability messages. They get their own
// stack just above the centre of the puzzle grid (where the player is
// looking) instead of the bottom-left log used for loot and system
// messages. Short-lived and capped so they never bury the puzzle.
const COMBAT_TOAST_MAX_VISIBLE = 3;
const COMBAT_TOAST_DISPLAY_MS = 3200;
const combatToasts = []; // { msg, el, timeoutId }

function _combatToastContainer() {
    let box = document.getElementById('combat-toast-stack');
    if (!box) {
        const host = document.getElementById('toast-stack');
        if (!host || !host.parentElement) return null;
        box = document.createElement('div');
        box.id = 'combat-toast-stack';
        box.className = 'combat-toast-stack';
        host.parentElement.appendChild(box);
    }
    // Anchor slightly above the grid's centre; fall back to the CSS default.
    const grid = document.getElementById('ptable');
    const r = grid ? grid.getBoundingClientRect() : null;
    if (r && r.width > 40 && r.height > 40) {
        box.style.left = Math.round(r.left + r.width / 2) + 'px';
        // Near the grid's upper border (the stack grows upward from here).
        box.style.bottom = Math.round(window.innerHeight - (r.top + r.height * 0.3)) + 'px';
    } else {
        box.style.left = box.style.bottom = '';
    }
    return box;
}

// Colour coding when the caller gave none: green = something went your way
// (dodge, block, heal, kill), red = you are being hurt, amber = a boss /
// mechanic announcement.
function _combatToastColor(msg) {
    const m = String(msg);
    if (/dodg|block|parr|deflect|fate negates|negat|heal|\+\d|burned out|crumbled|destroyed|survived|cleansed|removed|dispelled|slain|defeated|hearts|ausgewichen|geblockt|pariert|geheilt/i.test(m)) return '#4ade80';
    if (/-\d|damage|hits you|struck|drain|enrage|raserei|erased|corrupt|bleed|poison|burn|frozen|shock|stun|bomb|explod|detonat|schaden|entzogen/i.test(m)) return '#f87171';
    return '#fbbf24';
}

function _dropCombatToast(entry) {
    clearTimeout(entry.timeoutId);
    entry.el.remove();
    const idx = combatToasts.indexOf(entry);
    if (idx !== -1) combatToasts.splice(idx, 1);
}

// Same signature as showToast(). Use for combat, boss abilities, ailments,
// dodge / block / parry results and similar in-fight feedback.
export function showCombatToast(msg, accentColor) {
    msg = _pluralizeToastText(msg);
    const box = _combatToastContainer();
    if (!box) return showToast(msg, accentColor);

    const dup = combatToasts.find(t => t.msg === msg);
    if (dup) _dropCombatToast(dup);

    const el = document.createElement('div');
    el.className = 'combat-toast-msg';
    el.textContent = msg;
    const color = accentColor || _combatToastColor(msg);
    el.style.color = color;
    _playToastSfx(color);
    box.appendChild(el);

    const entry = { msg, el, timeoutId: null };
    combatToasts.push(entry);
    while (combatToasts.length > COMBAT_TOAST_MAX_VISIBLE) _dropCombatToast(combatToasts[0]);

    entry.timeoutId = setTimeout(() => {
        el.classList.add('combat-toast-out');
        el.addEventListener('animationend', () => _dropCombatToast(entry), { once: true });
        setTimeout(() => _dropCombatToast(entry), 700); // safety if no animation runs
    }, COMBAT_TOAST_DISPLAY_MS);
    return el;
}

// Escapes plain text for safe embedding in toast HTML.
export function _escapeToastHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Returns the HTML for a puzzle item's icon: the real item art image once
// the items manifest has resolved, otherwise the emoji fallback from the
// def. Same source the inventory slots use (GAME_ART), read lazily off
// globalThis so this module stays cycle-free.
export function puzzleItemIconHtml(def) {
    try {
        const art = globalThis.GAME_ART;
        if (art && typeof art.html === 'function') return art.html('item', def.id, def.icon);
    } catch (e) { /* art system not ready - fall through to emoji */ }
    return _escapeToastHtml((def && def.icon) || '');
}

// HTML twin of showToast(): renders trusted markup (e.g. an item art <img>)
// instead of plain text. All interpolated caller text must be escaped with
// _escapeToastHtml() first - or use showItemToast() below.
export function showHtmlToast(html, accentColor) {
    html = _pluralizeToastText(html);
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.innerHTML = html;
    return _appendToastEl(el, html, accentColor);
}

// Shows a toast for a puzzle item with its real art image in front of the
// text (falls back to the def emoji while art is still loading). Prefer
// this over showToast(`${def.icon} ...`) for every puzzle-item toast.
export function showItemToast(def, text, accentColor) {
    return showHtmlToast(`${puzzleItemIconHtml(def)} ${_escapeToastHtml(text)}`, accentColor);
}

// Clears every visible/pending toast immediately. Called on level reset or scene transitions.
export function resetToastQueue() {
    activeToasts.forEach(t => {
        clearTimeout(t.timeoutId);
        t.el.remove();
    });
    activeToasts.length = 0;

    const container = document.getElementById('toast-stack');
    if (container) container.innerHTML = '';

    combatToasts.slice().forEach(_dropCombatToast);
}



//------------------------------------------------------------------------
//----------------------------ITEM GAIN POPUP------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// How long (ms) a gain popup stays fully visible before it starts fading out.
export const ITEM_GAIN_POPUP_HOLD_MS = 1400;
// Duration (ms) of the rise/fade transition. Must match the injected CSS.
export const ITEM_GAIN_POPUP_FADE_MS = 400;

// Tracks in-flight popups keyed by defId, so multiple grants of the same
// item in quick succession (e.g. two lucky drops of the same defId) stack
// into a single incrementing "+N" instead of spawning overlapping popups.
export const _itemGainPopupState = {};

export let _itemGainPopupStyleInjected = false;

// Injects the popup's CSS once, lazily on first use.
export function _ensureItemGainPopupStyle() {
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
// Since the compact-bar redesign, slots live in the category flyout panel
// (#inv-flyout) and only exist in the DOM while that category is open -
// so this can legitimately return null with the flyout closed (the gain
// popup then silently no-ops, same as before the panel was ever built).
export function _findInvSlotEl(defId) {
    return document.querySelector(`.inv-slot[data-def-id="${defId}"]`);
}

// Positions the popup centered above the given slot element.
export function _positionItemGainPopup(el, slotEl) {
    const r = slotEl.getBoundingClientRect();
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top}px`;
}

// Removes a popup's state entry and its DOM element once its animation
// cycle is fully finished.
export function _clearItemGainPopup(defId) {
    const state = _itemGainPopupState[defId];
    if (!state) return;
    clearTimeout(state.holdTimeoutId);
    state.el.remove();
    delete _itemGainPopupState[defId];
}

// Starts (or restarts) the hold-then-fade timer for a popup.
export function _scheduleItemGainPopupDismiss(defId) {
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
export function showItemGainPopup(defId, count = 1) {
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