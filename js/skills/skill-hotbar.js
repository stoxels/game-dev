import { _abilityHotkeysBlocked, _formatCooldown, _isModalOpen } from '../classes/class-cooldown-state.js';
import { hideHUDTooltip } from '../classes/class-hud.js';
import { SKILL_HOTBAR_COLS, SKILL_HOTBAR_SIZE, activateHotbarSlot, canAffordSkill, getHotbarSkill, getSkillCooldownRemaining, getSkillDef, getSkillImage, getSkillName, isSkillUsableNow } from './skill-registry.js';
import { isSpellbookOpen, renderSpellbook, toggleSpellbook } from './skill-spellbook.js';
import { isSkillHoldCast, tryBeginHoldCast } from './spell-casttime.js';
import { getUniversalSpellChargeRechargeRemaining, getUniversalSpellCharges } from './universal-spells.js';
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
// Slots mirror the spell-book charm slots 1:1 (charm slot N casts from
// hotbar key N - see skill-charms.js). The bar itself is click-to-cast
// only; there is no drag to rearrange or remove spells. Passives are never
// on the bar - setHotbarSlot() in the registry rejects them.
//
// Keybinds: the central dispatcher in keybinds.js routes hotbar-1…hotbar-10
// to activateHotbarSlot(). Default keys are 1,2,3,4,5,6,7,8,9,0.
//------------------------------------------------------------------------


// Set while a hold-to-cast charge is arming so the click event that follows
// the pointerup is swallowed instead of casting the spell twice.
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

// True while the spell book is up. The bar has to stay visible then even on
// the overworld screens (map view / world detail / level select), because
// the whole point of opening the book there is slotting charms - and each
// spell slot casts from its matching hotbar key. Without this the bar kept
// `display:none` while the book was open.
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
//-------------------------SLOT INTERACTION-------------------------------
//------------------------------------------------------------------------
// The bar is click-to-cast only: a press casts the spell, a press-and-hold
// charges hold-to-cast spells (spell-casttime.js). There is no drag - the
// slots mirror the spell-book charm slots 1:1 (charm slot N = hotbar key N),
// so rearranging or removing spells happens by moving charms in the book.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------------SLOT INTERACTION-------------------------------
//------------------------------------------------------------------------
// Delegated handlers installed once on the container. A press that doesn't
// move casts the spell; a press that moves starts a hotbar→hotbar drag.
//------------------------------------------------------------------------

// Installs the delegated pointer handlers on the hotbar container.
// Click casts the spell; hold charges hold-to-cast spells. No drag.
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
        // button is held and fire once the cast bar fills.
        // Primary button only - right-clicks are reserved for the context menu
        // (touch/pen presses have no button to check, so they always pass).
        if ((e.button === 0 || e.pointerType !== 'mouse') && typeof tryBeginHoldCast === 'function') {
            const hold = tryBeginHoldCast(skillId, slotIndex, 'pointer');
            if (hold === 'started' || hold === 'casting') _suppressHotbarClick = true;
        }
    });

    bar.addEventListener('click', (e) => {
        const slot = e.target.closest('.skill-hotbar-slot');
        if (!slot) return;
        // Ignore clicks that were part of a hold-to-cast charge.
        if (_suppressHotbarClick) {
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
