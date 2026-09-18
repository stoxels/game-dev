import { t } from '../translation/translations.js';
import { _abilityHotkeysBlocked, _formatCooldown, _isModalOpen } from '../classes/class-cooldown-state.js';
import { hideHUDTooltip } from '../classes/class-hud.js';
import { isSkillCharmUnlocked } from './skill-charms.js';
import { SKILL_HOTBAR_COLS, SKILL_HOTBAR_SIZE, activateHotbarSlot, canAffordSkill, clearHotbarSlot, getHotbarSkill, getSkillCooldownRemaining, getSkillDef, getSkillImage, getSkillName, isSkillMovable, isSkillUsableNow } from './skill-registry.js';
import { isSpellbookOpen, renderSpellbook, toggleSpellbook } from './skill-spellbook.js';
import { cancelHoldCast, isSkillHoldCast, tryBeginHoldCast } from './spell-casttime.js';
import { _uspUnlockHint, getUniversalSpellChargeRechargeRemaining, getUniversalSpellCharges, getUniversalSpellDef, isUniversalSpellId, isUniversalSpellUnlocked } from './universal-spells.js';
import { STATE } from '../state.js';
// skill-hotbar.js
//------------------------------------------------------------------------
//---------------------------SKILL HOTBAR---------------------------------
//------------------------------------------------------------------------
// World-of-Warcraft style action bar pinned to the bottom-right of the
// puzzle screen: SKILL_HOTBAR_SIZE slots in SKILL_HOTBAR_COLS columns
// (2 rows of 5 by default).
//
// Each slot shows the spell icon, its bound key and - while the spell is on
// cooldown or unaffordable - the same indicators the old class HUD buttons
// used (countdown text / dimmed "no mana" state). Hover shows the
// Path-of-Exile style tooltip from skill-tooltip.js.
//
// Slots are filled by dragging spells out of the spell book
// (skill-spellbook.js). Passives are never movable - setHotbarSlot() in the
// registry rejects them.
//
// Keybinds: the central dispatcher in keybinds.js routes hotbar-1…hotbar-10
// to activateHotbarSlot(). Default keys are 1,2,3,4,5,6,7,8,9,0.
//------------------------------------------------------------------------


// Pointer-move distance (px) above which a slot press becomes a drag
// instead of a cast click.
export const SKILL_DRAG_THRESHOLD_PX = 4;

// Current drag operation: { skillId, fromSlot } or null.
export let _skillDragState = null;

// Floating ghost element shown while dragging a spell.
export let _skillDragGhost = null;

// Set after a drag ends so the click event that follows the pointerup is
// swallowed instead of casting the spell again.
export let _suppressHotbarClick = false;


//------------------------------------------------------------------------
//--------------------------DOM CONTAINER---------------------------------
//------------------------------------------------------------------------

// Default home for the bar: the puzzle's flex row, inserted BEFORE the grid
// wrapper in tree order. Both the bar and #puzzle-scaler-wrap are positioned
// elements in the game screen's stacking context, so on overlap the later one
// (the grid) paints on top and receives the cell clicks. Keeping the bar out
// of #screen-game entirely would lift it above the grid and steal those clicks
// (the bug this replaces).
export function _hotbarHomeHost() {
    return document.querySelector('.puzzle-and-sidebar')
        || document.getElementById('screen-game')
        || document.body;
}

// Where the bar should be mounted right now. While the spell book is open it
// must escape the game screen's stacking context (otherwise the modal backdrop
// traps it and spells cannot be dropped on it), so it hops onto <body> above
// the backdrop. The book's open/close handlers call setHotbarAboveModal().
export function _hotbarMountHost() {
    if (document.body.classList.contains('spellbook-open')) return document.body;
    return _hotbarHomeHost();
}

// Returns the hotbar container, creating it on first use and re-homing it
// whenever the current mount host changed (spell book open/close).
export function _ensureHotbarContainer() {
    let bar = document.getElementById('skill-hotbar');
    if (bar) {
        const host = _hotbarMountHost();
        if (bar.parentElement !== host) {
            if (host === document.body) host.appendChild(bar);
            else host.insertBefore(bar, host.firstChild);
        }
        return bar;
    }

    bar = document.createElement('div');
    bar.id = 'skill-hotbar';
    bar.className = 'skill-hotbar';
    bar.addEventListener('contextmenu', (e) => e.preventDefault());

    const host = _hotbarMountHost();
    if (host === document.body) host.appendChild(bar);
    else host.insertBefore(bar, host.firstChild);
    return bar;
}

// Moves the bar above the spell book's modal backdrop (or back home).
// Called from openSpellbook()/closeSpellbook() - the body class drives both
// the host choice and the z-index lift in css/skills.css.
export function setHotbarAboveModal(above) {
    const bar = document.getElementById('skill-hotbar');
    if (!bar) return;
    const host = _hotbarMountHost();
    if (bar.parentElement === host) return;
    if (host === document.body) host.appendChild(bar);
    else host.insertBefore(bar, host.firstChild);
}

// True while the game screen is the visible one.
export function _isGameScreenActive() {
    return !!document.getElementById('screen-game')?.classList.contains('active');
}

// True while the spell book is up. The bar has to stay usable then even on
// the overworld screens (map view / world detail / level select), because
// the whole point of opening the book there is rearranging the hotbar.
// Without this the bar kept `display:none` and every drop silently failed.
export function _hotbarNeededForSpellbook() {
    return document.body.classList.contains('spellbook-open')
        || !!(document.getElementById('spellbook-overlay')?.classList.contains('show'));
}


//------------------------------------------------------------------------
//--------------------------SLOT RENDERING--------------------------------
//------------------------------------------------------------------------

// Returns the display label for a hotbar slot's keybind (1…9,0).
export function _hotbarKeyLabel(slotIndex) {
    const action = `hotbar-${slotIndex + 1}`;
    const key = (typeof globalThis.keybindKeyFor === 'function') ? globalThis.keybindKeyFor(action) : null;
    if (key === null || key === undefined) return String((slotIndex + 1) % 10);
    return (typeof globalThis.keybindDisplayLabel === 'function') ? globalThis.keybindDisplayLabel(key) : key;
}

// Builds the inner HTML of a single slot.
export function _buildHotbarSlotHTML(slotIndex, skillId) {
    const keyLabel = `<span class="skill-hotbar-key">${_hotbarKeyLabel(slotIndex)}</span>`;

    if (!skillId) {
        return `<div class="skill-hotbar-slot is-empty" data-slot="${slotIndex}">`
            + keyLabel
            + `<span class="skill-hotbar-empty">·</span>`
            + `</div>`;
    }

    const def = (typeof getSkillDef === 'function') ? getSkillDef(skillId) : null;
    if (!def) {
        return `<div class="skill-hotbar-slot is-empty" data-slot="${slotIndex}">${keyLabel}<span class="skill-hotbar-empty">·</span></div>`;
    }

    const cdRemaining = (typeof getSkillCooldownRemaining === 'function') ? getSkillCooldownRemaining(skillId) : 0;
    const isOnCD = cdRemaining > 0;
    const canAfford = (typeof canAffordSkill === 'function') ? canAffordSkill(skillId) : true;
    const noMana = !canAfford && !isOnCD;
    const isArmed = (typeof globalThis.activeAbilityMode !== 'undefined') && globalThis.activeAbilityMode
        && STATE.classActiveChoice === def.legacySlot;
    const usableNow = (typeof isSkillUsableNow === 'function') ? isSkillUsableNow(skillId) : true;
    const locked = !usableNow;
    // Hold-to-cast spells (spell-casttime.js) get a marker so the longer
    // press-and-hold behaviour is discoverable on the bar itself.
    const holdCast = (typeof isSkillHoldCast === 'function') ? isSkillHoldCast(skillId) : false;

    const stateClasses = [
        isArmed ? 'armed' : '',
        isOnCD ? 'on-cd' : '',
        noMana ? 'no-mana' : '',
        locked ? 'locked' : '',
        holdCast ? 'has-cast' : '',
    ].filter(Boolean).join(' ');

    const cdOverlay = isOnCD
        ? `<span class="skill-hotbar-cd${cdRemaining >= 60 ? ' is-long' : ''}">${_formatHotbarCooldown(cdRemaining)}</span>`
        : '';
    // Charge spells (Blink, Dash, …) show their pool as pips instead of a
    // countdown: filled = ready charge, hollow + countdown = recharging.
    const charges = (typeof getUniversalSpellCharges === 'function')
        ? getUniversalSpellCharges(skillId) : null;
    const chargePips = charges
        ? `<span class="skill-hotbar-charges" aria-label="${charges.current} / ${charges.max}">`
            + Array.from({ length: charges.max }, (_, p) => {
                const filled = p < charges.current;
                // Per-pip countdown only while the pool still holds a charge
                // (an EMPTY pool flips the slot's cooldown overlay on, which
                // already counts the next charge - text would double up).
                const next = (!filled && p === charges.current && !isOnCD)
                    ? `<b>${_formatHotbarCooldown(getUniversalSpellChargeRechargeRemaining(skillId))}</b>`
                    : '';
                return `<i class="${filled ? 'is-full' : 'is-empty'}">${next}</i>`;
            }).join('')
            + `</span>`
        : '';
    const noManaMark = noMana ? `<span class="skill-hotbar-nomana">✦</span>` : '';
    const lockMark = locked ? `<span class="skill-hotbar-lock">🔒</span>` : '';

    // Prefer the class-upgrade artwork when the skill ships one, else the
    // emoji/glyph from the registry. The image is a real <img> so it scales
    // cleanly and can't be drag-selected.
    const image = (typeof getSkillImage === 'function') ? getSkillImage(skillId) : null;
    const iconMarkup = image
        ? `<img class="skill-hotbar-icon" src="${image}" alt="${getSkillName(skillId)}" draggable="false">`
        : `<span class="skill-hotbar-icon">${def.icon || '✦'}</span>`;

    // Hovering a slot shows the same Path-of-Exile tooltip the spell book does.
    return `<div class="skill-hotbar-slot ${stateClasses}" data-slot="${slotIndex}" data-skill="${skillId}"
                 onmouseenter="handleSkillTip(event,'${skillId}')"
                 onmousemove="handleSkillTipMove(event)"
                 onmouseleave="handleSkillTipLeave()">`
        + keyLabel
        + iconMarkup
        + cdOverlay
        + chargePips
        + noManaMark
        + lockMark
        + `</div>`;
}

// Formats a slot countdown (m:ss above a minute, else Xs).
export function _formatHotbarCooldown(secs) {
    if (typeof _formatCooldown === 'function') return _formatCooldown(Math.ceil(secs));
    const s = Math.ceil(secs);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}

// True when a pre-class character owns anything castable: a spell on the
// hotbar, a charm in a spell slot, or a charm in the inventory. Used to show
// the hotbar / mana bar before a class is chosen instead of hiding them
// until then (universal charm spells need no class).
export function _hotbarClasslessHasSpells() {
    try {
        if (typeof STATE === 'undefined' || !STATE) return false;
        if (Array.isArray(STATE.skillHotbar) && STATE.skillHotbar.some(Boolean)) return true;
        if (Array.isArray(STATE.charmSlots) && STATE.charmSlots.some(Boolean)) return true;
        if (Array.isArray(STATE.charmInventory) && STATE.charmInventory.length > 0) return true;
    } catch (e) { /* best-effort */ }
    return false;
}

// Rebuilds the entire hotbar. Cheap enough to call on every HUD rebuild -
// 10 small slots, no listeners re-attached (delegated handlers only).
export function renderSkillHotbar() {
    const bar = _ensureHotbarContainer();

    // Classless (or no save yet), or off the game screen / menu overlays →
    // hide entirely (except while the spell book is open - see
    // _hotbarNeededForSpellbook). Tutorial exception: puzzle 3 drags Fireball
    // onto the bar before any class is chosen, so the tutorial always shows
    // it. Pre-class campaign characters get the same treatment once they own
    // anything castable (a hotbar spell, a slotted charm, or an inventory
    // charm) - universal spells need no class.
    const tqActive = (typeof globalThis._tqIsTutorialActive === 'function') && globalThis._tqIsTutorialActive();
    const classlessHidden = (typeof STATE === 'undefined' || !STATE)
        || (((!STATE.playerClass && !tqActive)
            || ((typeof globalThis.isClassless === 'function') && globalThis.isClassless()))
            && !_hotbarClasslessHasSpells()
            && !_hotbarNeededForSpellbook());
    if (classlessHidden
        || !(_isGameScreenActive() || _hotbarNeededForSpellbook())) {
        bar.style.display = 'none';
        document.body.classList.remove('skill-hotbar-visible');
        if (typeof hideHUDTooltip === 'function') hideHUDTooltip();
        return;
    }

    if (typeof globalThis.ensureSkillHotbar === 'function') globalThis.ensureSkillHotbar();
    bar.style.display = '';

    // Column count drives the CSS grid; kept configurable for future bars.
    bar.style.setProperty('--skill-hotbar-cols', String(SKILL_HOTBAR_COLS));

    let html = '';
    for (let i = 0; i < SKILL_HOTBAR_SIZE; i++) {
        html += _buildHotbarSlotHTML(i, (typeof getHotbarSkill === 'function') ? getHotbarSkill(i) : null);
    }
    bar.innerHTML = html;

    // Tell the inventory dock how much bottom-right room the bar needs, so on
    // narrower viewports its (centred) box shifts clear of the corner instead
    // of sliding under the bar. See the reserve rule in css/skills.css.
    document.body.classList.add('skill-hotbar-visible');
    const barW = bar.offsetWidth || (SKILL_HOTBAR_COLS * 57 + 12);
    document.body.style.setProperty('--skill-hotbar-reserve', (barW + 14) + 'px');

}

// In-place cooldown text patch for one skill (called every cooldown tick so
// the whole hotbar isn't rebuilt each second).
export function patchHotbarSlotCooldown(skillId) {
    const bar = document.getElementById('skill-hotbar');
    if (!bar || !skillId) return;
    const slot = bar.querySelector(`.skill-hotbar-slot[data-skill="${skillId}"]`);
    if (!slot) return;

    const cdRemaining = (typeof getSkillCooldownRemaining === 'function') ? getSkillCooldownRemaining(skillId) : 0;

    // Keep the slot's state classes in sync too. A skill that was unaffordable
    // when the hotbar last rendered would otherwise keep its blue "no mana"
    // wash/✦ marker on top of the countdown text, which is what made the
    // cooldown read as broken. While on cooldown the cool-down state wins.
    slot.classList.toggle('on-cd', cdRemaining > 0);
    if (cdRemaining > 0) slot.classList.remove('no-mana');

    // Charge spells: keep the pip countdown in place between renders. Only
    // the <b> inside the first recharging pip is patched - the pips
    // themselves only change when a charge lands (renderSkillHotbar). While
    // the pool is empty the cooldown overlay counts instead (no pip text).
    const charges = (typeof getUniversalSpellCharges === 'function')
        ? getUniversalSpellCharges(skillId) : null;
    if (charges) {
        const pips = slot.querySelector('.skill-hotbar-charges');
        if (pips) {
            const next = pips.querySelector('i.is-empty b');
            if (next) next.textContent = _formatHotbarCooldown(getUniversalSpellChargeRechargeRemaining(skillId));
        }
    }

    let cdEl = slot.querySelector('.skill-hotbar-cd');
    if (cdRemaining > 0) {
        if (!cdEl) {
            cdEl = document.createElement('span');
            cdEl.className = 'skill-hotbar-cd';
            slot.appendChild(cdEl);
        }
        cdEl.classList.toggle('is-long', cdRemaining >= 60);
        cdEl.textContent = _formatHotbarCooldown(cdRemaining);
    } else if (cdEl) {
        cdEl.remove();
    }
}

// Patches the hotbar slot(s) bound to a legacy slot key (active1…active5).
// Called from _patchCooldownButton() in class-cooldown-state.js.
export function patchHotbarCooldownForLegacySlot(legacySlot) {
    if (typeof STATE === 'undefined' || !STATE || !Array.isArray(STATE.skillHotbar)) return;
    for (const skillId of STATE.skillHotbar) {
        if (!skillId) continue;
        const def = (typeof getSkillDef === 'function') ? getSkillDef(skillId) : null;
        if (def && def.legacySlot === legacySlot) patchHotbarSlotCooldown(skillId);
    }
}


//------------------------------------------------------------------------
//-------------------------DRAG & DROP------------------------------------
//------------------------------------------------------------------------
// Pointer-based (not HTML5 drag events) to match the rest of the codebase
// and to work uniformly on touch. The spell book starts the drag via
// startSkillDrag(); the hotbar only needs to act as a drop target.
//------------------------------------------------------------------------

// Starts a drag for `skillId`. fromSlot is the hotbar index when the drag
// began on a filled slot (so dropping outside clears it), else null.
export function startSkillDrag(skillId, e, fromSlot) {
    // Sealed universal spells explain their future requirement instead of
    // the generic passive message (lock infra: universal-spells.js).
    if (typeof isUniversalSpellId === 'function' && isUniversalSpellId(skillId)
        && typeof isUniversalSpellUnlocked === 'function' && !isUniversalSpellUnlocked(skillId)) {
        if (typeof globalThis.showToast === 'function') {
            let hint = '🔒';
            try {
                const usp = (typeof getUniversalSpellDef === 'function') ? getUniversalSpellDef(skillId) : null;
                hint = '🔒 ' + _uspUnlockHint(usp);
            } catch (err) { /* generic lock marker */ }
            globalThis.showToast(hint, '#aaa');
        }
        return;
    }
    if (typeof isSkillMovable === 'function' && !isSkillMovable(skillId)) {
        // Charm-locked spells get the actionable message instead of the
        // generic "passives can't be moved" one.
        const charmLocked = (typeof isSkillCharmUnlocked === 'function') && !isSkillCharmUnlocked(skillId);
        if (typeof globalThis.showToast === 'function') {
            globalThis.showToast(charmLocked ? t('charm_locked_toast') : t('skill_passive_not_movable'),
                charmLocked ? '#ff6b9d' : undefined);
        }
        return;
    }
    _skillDragState = { skillId, fromSlot: (fromSlot === undefined ? null : fromSlot), moved: false, startX: e.clientX, startY: e.clientY };

    const def = (typeof getSkillDef === 'function') ? getSkillDef(skillId) : null;
    _skillDragGhost = document.createElement('div');
    _skillDragGhost.className = 'skill-drag-ghost';
    _skillDragGhost.textContent = (def && def.icon) || '✦';
    document.body.appendChild(_skillDragGhost);
    _moveSkillDragGhost(e.clientX, e.clientY);

    document.addEventListener('pointermove', _onSkillDragMove, true);
    document.addEventListener('pointerup', _onSkillDragEnd, true);
    document.addEventListener('pointercancel', _onSkillDragEnd, true);
}

// Repositions the floating ghost under the cursor.
export function _moveSkillDragGhost(x, y) {
    if (!_skillDragGhost) return;
    _skillDragGhost.style.left = (x + 10) + 'px';
    _skillDragGhost.style.top = (y + 10) + 'px';
}

// Highlights the slot under the pointer while dragging.
export function _highlightDropTarget(x, y) {
    const bar = document.getElementById('skill-hotbar');
    if (!bar) return;
    const target = document.elementFromPoint(x, y)?.closest?.('.skill-hotbar-slot');
    bar.querySelectorAll('.skill-hotbar-slot.drop-target').forEach(el => el.classList.remove('drop-target'));
    if (target) target.classList.add('drop-target');
}

// Pointermove handler for an active drag.
export function _onSkillDragMove(e) {
    if (!_skillDragState) return;
    if (!_skillDragState.moved) {
        const dx = e.clientX - _skillDragState.startX;
        const dy = e.clientY - _skillDragState.startY;
        if (Math.hypot(dx, dy) < SKILL_DRAG_THRESHOLD_PX) return;
        _skillDragState.moved = true;
        document.body.classList.add('skill-dragging');
        // A press that moves is a drag, not a cast: drop any hold-to-cast
        // charge so the release cannot fire it (spell-casttime.js).
        if (typeof cancelHoldCast === 'function') cancelHoldCast();
    }
    _moveSkillDragGhost(e.clientX, e.clientY);
    _highlightDropTarget(e.clientX, e.clientY);
}

// Pointerup handler: drops onto the slot under the cursor, or clears the
// source slot when a hotbar spell was dragged into empty space.
export function _onSkillDragEnd(e) {
    if (!_skillDragState) return;
    const { skillId, fromSlot, moved } = _skillDragState;
    _cleanupSkillDrag();

    // A press without movement is a click, not a drag - let the element's
    // own click handler handle casting.
    if (!moved) return;
    _suppressHotbarClick = true;

    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.skill-hotbar-slot');
    if (target) {
        const slotIndex = Number(target.getAttribute('data-slot'));
        if (!Number.isNaN(slotIndex)) globalThis.setHotbarSlot(slotIndex, skillId);
    } else if (fromSlot !== null && fromSlot !== undefined) {
        // Dragged out of the bar → remove.
        clearHotbarSlot(fromSlot);
    }

    renderSkillHotbar();
    if (typeof renderSpellbook === 'function' && isSpellbookOpen()) renderSpellbook();
}

// Removes the ghost, listeners and highlight classes.
export function _cleanupSkillDrag() {
    _skillDragState = null;
    if (_skillDragGhost) { _skillDragGhost.remove(); _skillDragGhost = null; }
    document.body.classList.remove('skill-dragging');
    document.getElementById('skill-hotbar')
        ?.querySelectorAll('.skill-hotbar-slot.drop-target')
        .forEach(el => el.classList.remove('drop-target'));
    document.removeEventListener('pointermove', _onSkillDragMove, true);
    document.removeEventListener('pointerup', _onSkillDragEnd, true);
    document.removeEventListener('pointercancel', _onSkillDragEnd, true);
}


//------------------------------------------------------------------------
//-------------------------SLOT INTERACTION-------------------------------
//------------------------------------------------------------------------
// Delegated handlers installed once on the container. A press that doesn't
// move casts the spell; a press that moves starts a hotbar→hotbar drag.
//------------------------------------------------------------------------

// Installs the delegated pointer handlers on the hotbar container.
export function _initHotbarInteractions() {
    const bar = _ensureHotbarContainer();
    if (bar.dataset.skillBound === '1') return;
    bar.dataset.skillBound = '1';

    bar.addEventListener('pointerdown', (e) => {
        const slot = e.target.closest('.skill-hotbar-slot');
        if (!slot) return;
        const slotIndex = Number(slot.getAttribute('data-slot'));
        const skillId = (typeof getHotbarSkill === 'function') ? getHotbarSkill(slotIndex) : null;
        if (!skillId) return;
        e.preventDefault();
        // Hold-to-cast (spell-casttime.js): heavy spells charge while the
        // button is held and fire once the cast bar fills. A press that
        // turns into a drag cancels the hold (see _onSkillDragMove) and the
        // swallowed click below stops the release from double-casting.
        // Primary button only - right-clicks are reserved for the context menu
        // (touch/pen presses have no button to check, so they always pass).
        if ((e.button === 0 || e.pointerType !== 'mouse') && typeof tryBeginHoldCast === 'function') {
            const hold = tryBeginHoldCast(skillId, slotIndex, 'pointer');
            if (hold === 'started' || hold === 'casting') _suppressHotbarClick = true;
        }
        startSkillDrag(skillId, e, slotIndex);
    });

    bar.addEventListener('click', (e) => {
        const slot = e.target.closest('.skill-hotbar-slot');
        if (!slot) return;
        // Ignore clicks that were part of a drag - the pointerup already
        // resolved the drop, casting again would fire the spell unintentionally.
        if (_skillDragState || _suppressHotbarClick) {
            _suppressHotbarClick = false;
            return;
        }
        const slotIndex = Number(slot.getAttribute('data-slot'));
        if (!Number.isNaN(slotIndex)) activateHotbarSlot(slotIndex);
    });
}


//------------------------------------------------------------------------
//--------------------------KEYBINDS--------------------------------------
//------------------------------------------------------------------------

// True when the hotbar should ignore key presses (has its own gate so the
// spell book / modals / text fields never cast).
export function _hotbarKeysBlocked() {
    if (typeof _abilityHotkeysBlocked === 'function') {
        if (!_abilityHotkeysBlocked()) return false;
        // Blocked by the shared gate - but pre-class universal casting is
        // allowed. Only a PURE no-class block lets the keys through for
        // per-slot validation in activateSkill (charm / universal / cooldown
        // / mana gates); input focus, modals (incl. the open spell book) and
        // death stay blocked exactly as before.
        try {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
        } catch (e) { /* best-effort */ }
        try {
            if (typeof _isModalOpen === 'function' && _isModalOpen()) return true;
        } catch (e) { /* best-effort */ }
        try { if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return true; } catch (e) { /* best-effort */ }
        try {
            if (typeof STATE !== 'undefined' && STATE && !STATE.playerClass) return false;
        } catch (e) { /* best-effort */ }
        return true;
    }
    // Fallback when the shared gate is unavailable: same rules. Pre-class
    // characters cast universal charm spells (per-slot activation still
    // validates charm / cooldown / mana), so only death blocks here.
    if (!STATE) return true;
    if (typeof globalThis.dead !== 'undefined' && globalThis.dead) return true;
    return false;
}

// Registers hotbar-1…hotbar-10 and the spell book toggle with the central
// keybind dispatcher.
export function _initSkillKeybinds() {
    if (typeof globalThis.onKeybindAction !== 'function') return;

    for (let i = 0; i < SKILL_HOTBAR_SIZE; i++) {
        globalThis.onKeybindAction(`hotbar-${i + 1}`, (e) => {
            if (_hotbarKeysBlocked()) return false;
            if (_isModalOpenLoose()) return false;
            // Key auto-repeat while a hold is charging must not restart the
            // cast - the keyup listener in spell-casttime.js ends it.
            if (e && e.repeat) return false;
            // Hold-to-cast (spell-casttime.js): heavy spells charge while the
            // key is down and fire on fill; keyup releases. Anything else
            // ('instant', 'refused') falls through to the normal activation.
            if (typeof tryBeginHoldCast === 'function') {
                const hold = tryBeginHoldCast(
                    (typeof getHotbarSkill === 'function') ? getHotbarSkill(i) : null, i, 'key');
                if (hold === 'started' || hold === 'casting') return false;
            }
            activateHotbarSlot(i);
            return false; // claim the key (prevents page scroll for space etc.)
        });
    }

    globalThis.onKeybindAction('spellbook', () => {
        // Toggle-close must work even while the book is open: the book
        // itself is a .modal-bg, which makes _abilityHotkeysBlocked() true,
        // so check for the open book first and let P close it.
        if (typeof isSpellbookOpen === 'function' && isSpellbookOpen()) {
            if (typeof toggleSpellbook === 'function') toggleSpellbook();
            return false;
        }
        // Pre-class characters open the book for their universal charms
        // (openSpellbook allows classless) - the shared hotkey gate would
        // otherwise swallow P exactly when they need it. Modals, inputs
        // and death stay blocked.
        let classlessAllow = false;
        try {
            classlessAllow = (typeof STATE !== 'undefined' && STATE && !STATE.playerClass)
                && !(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))
                && !(typeof _isModalOpen === 'function' && _isModalOpen())
                && !(typeof globalThis.dead !== 'undefined' && globalThis.dead);
        } catch (e) { classlessAllow = false; }
        if (!classlessAllow && typeof _abilityHotkeysBlocked === 'function' && _abilityHotkeysBlocked()) return false;
        if (typeof toggleSpellbook === 'function') toggleSpellbook();
        return false;
    });
}

// Local modal check that also covers the spell book overlay.
export function _isModalOpenLoose() {
    if (typeof _isModalOpen === 'function') return _isModalOpen();
    return !!document.querySelector('.modal-bg.show');
}


//------------------------------------------------------------------------
//---------------------------BOOTSTRAP------------------------------------
//------------------------------------------------------------------------

// Full UI refresh: hotbar always, spell book only when open.
export function refreshSkillUI() {
    renderSkillHotbar();
    if (typeof isSpellbookOpen === 'function' && isSpellbookOpen() && typeof renderSpellbook === 'function') {
        renderSpellbook();
    }
}

// Initial build + keybind registration. Safe to call before class selection
// (the bar simply hides until a class exists - buildClassHUD re-renders it).
export function initSkillHotbar() {
    renderSkillHotbar();
    _initHotbarInteractions();
    _initSkillKeybinds();
    // Re-render after any viewport change so the bottom-right anchor and the
    // responsive column count settle correctly.
    window.addEventListener('resize', () => renderSkillHotbar());

    // Show/hide the bar with the game screen. The screen toggles its own
    // .active class (see screens.js), so observing that class keeps the bar
    // in sync without touching the screen-switching code.
    const screen = document.getElementById('screen-game');
    if (screen && typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => renderSkillHotbar())
            .observe(screen, { attributes: true, attributeFilter: ['class'] });
    }
}

// Module-eval timing: deferred module scripts execute at readyState
// 'interactive', while concatenated keybinds.js has NOT run yet. Checking for
// 'loading' only would init right inside the import phase, when
// globalThis.onKeybindAction does not exist yet, so _initSkillKeybinds would
// silently skip and P + the hotbar number keys stayed dead (no error). Both
// 'loading' and 'interactive' mean DOMContentLoaded has not fired yet, so
// wait for it - by then the full global surface exists. Only a post-load
// evaluation ('complete') inits immediately.
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', initSkillHotbar);
} else {
    initSkillHotbar();
}
